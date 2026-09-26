import { reportSheetIssue } from '../../../diagnostics';
import { exportNotices, resolveSystemPolicies, systemRegistry } from '../../../systems';
import type { CustomTemplate, TemplateField, TemplateNode } from '../../../types/template';
import { CustomTemplateSchema, isTemplateField, walkTemplateNodes } from '../../../types/template';
import { CATALOG_BINDINGS } from '../data/catalogBindings';
import { validateTemplateReferences } from '../data/templateReferences';

/**
 * Template file transfer boundary: a self-describing JSON wrapper around the declarative
 * template definition. Validation happens fully before any state change; unknown keys are
 * stripped by the schema, never trusted. Version 3 (feature 006) carries the recursive node
 * tree (`children`); v2 and older files are rejected with the version error — pre-feature
 * templates retire rather than migrate (spec FR-4/A5).
 */

const TEMPLATE_FILE_FORMAT = 'ttgamer-template';
export const TEMPLATE_FILE_VERSION = 3;

export interface TemplateFilePayload {
    format: string;
    formatVersion: number;
    template: unknown;
}

export type ParsedTemplateFile =
    | { ok: true; template: CustomTemplate; degradedCatalogFields: readonly string[] }
    | { ok: false; error: 'parse' | 'format' | 'version' | 'schema' | 'system' };

/** Template files carry the publisher notices of their system (informational; ignored on import). */
export function serializeTemplateFile(template: CustomTemplate): string {
    const policies = resolveSystemPolicies(systemRegistry, template.systemId);
    return JSON.stringify({
        format: TEMPLATE_FILE_FORMAT,
        formatVersion: TEMPLATE_FILE_VERSION,
        template,
        ...(policies.length > 0 ? { notices: exportNotices(policies) } : {}),
    });
}

export function buildTemplateFilename(templateId: string): string {
    return `ttgamer_template_${templateId}.json`;
}

function mapTreeFields(
    children: readonly TemplateNode[],
    map: (field: TemplateField) => TemplateField
): TemplateNode[] {
    return children.map((node) => {
        if (node.type === 'section' || node.type === 'group') {
            return { ...node, children: mapTreeFields(node.children, map) };
        }
        if (node.type === 'table') {
            return { ...node, columns: node.columns.map(map) };
        }
        if (isTemplateField(node)) {
            return map(node);
        }
        return node;
    });
}

function stripUnavailableBindings(template: CustomTemplate): {
    template: CustomTemplate;
    degradedFields: readonly string[];
} {
    const degradedFields: string[] = [];
    const stripped: CustomTemplate = {
        ...template,
        children: mapTreeFields(template.children, (field) => {
            if (
                field.type !== 'select' ||
                !field.binding ||
                CATALOG_BINDINGS.has(field.binding.catalogId)
            ) {
                return field;
            }
            degradedFields.push(field.id);
            const { binding: _removed, ...manual } = field;
            void _removed;
            return manual;
        }),
    };
    return { template: CustomTemplateSchema.parse(stripped), degradedFields };
}

export function parseTemplateFile(input: string): ParsedTemplateFile {
    let payload: TemplateFilePayload;
    try {
        payload = JSON.parse(input) as TemplateFilePayload;
    } catch {
        return { ok: false, error: 'parse' };
    }

    if (
        typeof payload !== 'object' ||
        payload === null ||
        payload.format !== TEMPLATE_FILE_FORMAT
    ) {
        return { ok: false, error: 'format' };
    }
    if (
        typeof payload.formatVersion !== 'number' ||
        !Number.isInteger(payload.formatVersion) ||
        payload.formatVersion < TEMPLATE_FILE_VERSION
    ) {
        // Older files (fixed hierarchy) are not migrated — rejected with the version error.
        return { ok: false, error: 'version' };
    }
    if (payload.formatVersion > TEMPLATE_FILE_VERSION) {
        // Newer than this build understands — reject with the "made by a newer version" path.
        return { ok: false, error: 'version' };
    }

    let template: CustomTemplate;
    try {
        template = CustomTemplateSchema.parse(payload.template);
    } catch {
        return { ok: false, error: 'schema' };
    }
    if (!systemRegistry.getSystem(template.systemId)) {
        return { ok: false, error: 'system' };
    }

    const { template: resolved, degradedFields } = resolveImportedTemplate(template);
    return { ok: true, template: resolved, degradedCatalogFields: degradedFields };
}

/**
 * The shared import step of every file that carries templates (template and type files):
 * templates referencing unavailable catalogs still import with those fields degraded to manual
 * choice (FR-21, 003); remaining broken references are reported and degrade at render.
 */
export function resolveImportedTemplate(template: CustomTemplate): {
    template: CustomTemplate;
    degradedFields: readonly string[];
} {
    const stripped = stripUnavailableBindings(template);
    for (const issue of validateTemplateReferences(stripped.template)) {
        reportSheetIssue({
            code: 'template-reference-invalid',
            message: 'Imported template references something this build does not provide',
            details: { templateId: stripped.template.id, ...issue },
        });
    }
    return stripped;
}

/** Human-facing labels for the degradation report (field labels, never raw ids). */
export function describeDegradedFields(
    template: CustomTemplate,
    fieldIds: readonly string[]
): readonly string[] {
    const labels: string[] = [];
    const wanted = new Set(fieldIds);
    walkTemplateNodes(template.children, (node) => {
        if (node.type === 'table') {
            for (const column of node.columns) {
                if (wanted.has(column.id)) labels.push(column.label);
            }
        } else if (isTemplateField(node)) {
            if (wanted.has(node.id)) labels.push(node.label);
        }
    });
    return labels;
}
