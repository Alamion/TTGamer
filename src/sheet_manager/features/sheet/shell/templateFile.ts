import type { CustomTemplate } from '../../../types/template';
import { CustomTemplateSchema } from '../../../types/template';
import { CATALOG_BINDINGS } from '../data/catalogBindings';

/**
 * Template file transfer boundary (contracts/template-file-format.md): a self-describing
 * JSON wrapper around the declarative template definition. Validation happens fully before
 * any state change; unknown keys are stripped by the schema, never trusted.
 * Version 2 adds `systemId` + `valueKey`. v1 files import via the schema's systemId default
 * ('star-wars-wod' — the only system that existed at v1).
 */

export const TEMPLATE_FILE_FORMAT = 'ttgamer-template';
export const TEMPLATE_FILE_VERSION = 2;

export interface TemplateFilePayload {
    format: string;
    formatVersion: number;
    template: unknown;
}

export type ParsedTemplateFile =
    | { ok: true; template: CustomTemplate; degradedCatalogFields: readonly string[] }
    | { ok: false; error: 'parse' | 'format' | 'version' | 'schema' };

export function serializeTemplateFile(template: CustomTemplate): string {
    return JSON.stringify({
        format: TEMPLATE_FILE_FORMAT,
        formatVersion: TEMPLATE_FILE_VERSION,
        template,
    });
}

export function buildTemplateFilename(templateId: string): string {
    return `ttgamer_template_${templateId}.json`;
}

function labelsForFields(template: CustomTemplate, fieldIds: readonly string[]): string[] {
    const labels: string[] = [];
    for (const section of template.sections) {
        for (const block of section.blocks) {
            const fields = block.type === 'fields' ? block.fields : block.columns;
            for (const field of fields) {
                if (fieldIds.includes(field.id)) labels.push(field.label);
            }
        }
    }
    return labels;
}

function stripUnavailableBindings(template: CustomTemplate): {
    template: CustomTemplate;
    degradedFields: readonly string[];
} {
    const degradedFields: string[] = [];
    const stripped = {
        ...template,
        sections: template.sections.map((section) => ({
            ...section,
            blocks: section.blocks.map((block) => {
                if (block.type === 'fields') {
                    return {
                        ...block,
                        fields: block.fields.map((field) => {
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
                }
                return {
                    ...block,
                    columns: block.columns.map((field) => {
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
            }),
        })),
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
        payload.formatVersion < 1
    ) {
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

    // FR-21: templates referencing unavailable catalogs still import; the affected fields
    // degrade to manual choice fields (binding stripped) and the user is told which ones.
    const { template: resolved, degradedFields } = stripUnavailableBindings(template);
    return { ok: true, template: resolved, degradedCatalogFields: degradedFields };
}

/** Human-facing labels for the degradation report (field labels, never raw ids). */
export function describeDegradedFields(
    template: CustomTemplate,
    fieldIds: readonly string[]
): readonly string[] {
    return labelsForFields(template, fieldIds);
}
