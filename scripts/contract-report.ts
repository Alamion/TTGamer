import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import SwaggerParser from '@apidevtools/swagger-parser';
import { parse } from 'yaml';
import { z } from 'zod';

import { IMPLEMENTED_CONTRACT_VERSION } from '../src/integrations/cloud-api/version';
import type { WireModel } from '../src/integrations/cloud-api/wireNames';
import { toSnakeCase, WIRE_MODELS } from '../src/integrations/cloud-api/wireNames';
import {
    DocumentMetadataSchema,
    UnknownDocumentEnvelopeSchema,
} from '../src/sheet_manager/types/document';
import { CONTRACT_PATH } from './validate-contract';

/**
 * Where the frontend's own schemas match the cloud API contract and where they differ (spec 030,
 * US2). Reported, never failing: drift is read and settled in review, not blocked.
 */
interface ModelMapping {
    contract: string;
    schema: z.ZodType;
    wire: WireModel;
}

const MAPPINGS: readonly ModelMapping[] = [
    {
        contract: 'DocumentEnvelope',
        schema: UnknownDocumentEnvelopeSchema,
        wire: WIRE_MODELS.DocumentEnvelope,
    },
    {
        contract: 'DocumentMetadata',
        schema: DocumentMetadataSchema,
        wire: WIRE_MODELS.DocumentMetadata,
    },
];

type JsonSchema = Record<string, unknown>;

export interface FieldDifference {
    field: string;
    contract: JsonSchema;
    frontend: JsonSchema;
}

export interface ModelReport {
    model: string;
    matching: string[];
    differing: FieldDifference[];
    contractOnly: string[];
    frontendOnly: string[];
}

export interface ContractReport {
    contractVersion: string;
    implementedVersion: string;
    models: ModelReport[];
    notImplemented: string[];
}

const COMPARED = [
    'type',
    'format',
    'enum',
    'pattern',
    'minLength',
    'maxLength',
    'minimum',
    'maximum',
    'minItems',
    'maxItems',
] as const;

/** The constraints both sides can state, with equivalent spellings made equal. */
function constraints(schema: JsonSchema | undefined, opaque: boolean): JsonSchema {
    if (!schema) return {};
    const result: JsonSchema = {};
    const keys = opaque ? (['type'] as const) : COMPARED;
    for (const key of keys) if (schema[key] !== undefined) result[key] = schema[key];
    // An integer above 0 is an integer from 1.
    if (schema.type === 'integer' && typeof schema.exclusiveMinimum === 'number' && !opaque) {
        result.minimum = schema.exclusiveMinimum + 1;
    }
    // A field without a type (Zod's `unknown`, the contract's opaque `data`) is "any".
    if (result.type === undefined) delete result.type;
    return result;
}

const isObjectModel = (field: unknown): field is WireModel => typeof field === 'object';

function compareModel(
    name: string,
    contract: JsonSchema,
    frontend: JsonSchema,
    wire: WireModel
): ModelReport {
    const contractProperties = (contract.properties ?? {}) as Record<string, JsonSchema>;
    const contractRequired = new Set((contract.required ?? []) as string[]);
    const frontendProperties = (frontend.properties ?? {}) as Record<string, JsonSchema>;
    const frontendRequired = new Set(((frontend.required ?? []) as string[]).map(toSnakeCase));
    const renamed = Object.fromEntries(
        Object.entries(frontendProperties).map(([key, value]) => [toSnakeCase(key), value])
    );
    const report: ModelReport = {
        model: name,
        matching: [],
        differing: [],
        contractOnly: [],
        frontendOnly: [],
    };
    for (const field of Object.keys(contractProperties)) {
        if (!(field in renamed)) {
            report.contractOnly.push(field);
            continue;
        }
        const appField = Object.keys(wire.fields).find((key) => toSnakeCase(key) === field);
        const kind = appField ? wire.fields[appField] : 'plain';
        // A nested model is compared as its own model, here only for presence.
        const shallow = kind === 'opaque' || isObjectModel(kind);
        const left = {
            ...constraints(contractProperties[field], shallow),
            required: contractRequired.has(field),
        };
        const right = {
            ...constraints(renamed[field], shallow),
            required: frontendRequired.has(field),
        };
        if (JSON.stringify(left) === JSON.stringify(sortKeys(right, left))) {
            report.matching.push(field);
        } else {
            report.differing.push({ field, contract: left, frontend: right });
        }
    }
    for (const field of Object.keys(renamed)) {
        if (!(field in contractProperties)) report.frontendOnly.push(field);
    }
    return report;
}

/** `right` with its keys in `left`'s order first, so equal constraints stringify equally. */
function sortKeys(right: JsonSchema, left: JsonSchema): JsonSchema {
    const ordered: JsonSchema = {};
    for (const key of Object.keys(left)) if (key in right) ordered[key] = right[key];
    for (const key of Object.keys(right)) if (!(key in ordered)) ordered[key] = right[key];
    return ordered;
}

export async function buildContractReport(path = CONTRACT_PATH): Promise<ContractReport> {
    const document = parse(readFileSync(path, 'utf8')) as {
        info: { version: string };
        components: { schemas: Record<string, JsonSchema> };
    };
    const dereferenced = (await SwaggerParser.dereference(structuredClone(document) as never)) as {
        components: { schemas: Record<string, JsonSchema> };
    };
    const schemas = dereferenced.components.schemas;
    const mapped = new Set(MAPPINGS.map(({ contract }) => contract));
    return {
        contractVersion: document.info.version,
        implementedVersion: IMPLEMENTED_CONTRACT_VERSION,
        models: MAPPINGS.filter(({ contract }) => schemas[contract]).map(
            ({ contract, schema, wire }) =>
                compareModel(
                    contract,
                    schemas[contract],
                    z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as JsonSchema,
                    wire
                )
        ),
        notImplemented: Object.keys(schemas).filter((name) => !mapped.has(name)),
    };
}

export function formatContractReport(report: ContractReport): string {
    const lines = [
        `Contract ${report.contractVersion}; the frontend implements ${report.implementedVersion}.`,
    ];
    for (const model of report.models) {
        lines.push('', model.model);
        if (model.matching.length) lines.push(`  matching: ${model.matching.join(', ')}`);
        for (const { field, contract, frontend } of model.differing) {
            lines.push(`  differs: ${field}`);
            lines.push(`    contract: ${JSON.stringify(contract)}`);
            lines.push(`    frontend: ${JSON.stringify(frontend)}`);
        }
        if (model.contractOnly.length)
            lines.push(`  contract only: ${model.contractOnly.join(', ')}`);
        if (model.frontendOnly.length)
            lines.push(`  frontend only: ${model.frontendOnly.join(', ')}`);
    }
    lines.push('', `Not implemented by the frontend: ${report.notImplemented.join(', ')}`);
    return lines.join('\n');
}

const isMain =
    process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
    buildContractReport().then(
        (report) => console.log(formatContractReport(report)),
        (error: unknown) => {
            console.error(`Cannot read ${CONTRACT_PATH}: ${String(error)}`);
            process.exitCode = 1;
        }
    );
}
