import {
    buildTemplateFilename,
    describeDegradedFields,
    parseTemplateFile,
    serializeTemplateFile,
    TEMPLATE_FILE_VERSION,
} from '@site/src/sheet_manager/features/sheet/shell/templateFile';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

function buildTemplate(id = 'share-kit', catalogId = 'melee-weapons') {
    return CustomTemplateSchema.parse({
        id,
        name: 'Share Kit',
        documentKind: 'character',
        schemaVersion: 1,
        sections: [
            {
                id: 'kit',
                title: 'Kit',
                blocks: [
                    {
                        id: 'kit-fields',
                        type: 'fields',
                        columns: 1,
                        fields: [
                            {
                                id: 'weapon-pick',
                                label: 'Weapon',
                                type: 'select',
                                options: [{ id: 'placeholder', label: 'Placeholder' }],
                                binding: {
                                    catalogId,
                                    fills: { name: { targetFieldId: 'weapon-name' } },
                                },
                            },
                            { id: 'weapon-name', label: 'Weapon name', type: 'text' },
                        ],
                    },
                ],
            },
        ],
    });
}

describe('template file transfer', () => {
    it('round-trips a template identically', () => {
        const template = buildTemplate();
        const json = serializeTemplateFile(template);
        const parsed = parseTemplateFile(json);

        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            expect(parsed.template).toEqual(template);
            expect(parsed.degradedCatalogFields).toEqual([]);
        }
    });

    it('names exports by the ttgamer_template convention', () => {
        expect(buildTemplateFilename('my-homebrew')).toBe('ttgamer_template_my-homebrew.json');
    });

    it('rejects files that are not TTGamer template files', () => {
        expect(parseTemplateFile('not json at all')).toEqual({ ok: false, error: 'parse' });
        expect(parseTemplateFile(JSON.stringify({ template: {} }))).toEqual({
            ok: false,
            error: 'format',
        });
        expect(parseTemplateFile(JSON.stringify({ format: 'other', template: {} }))).toEqual({
            ok: false,
            error: 'format',
        });
    });

    it('rejects unsupported format versions', () => {
        const future = {
            format: 'ttgamer-template',
            formatVersion: TEMPLATE_FILE_VERSION + 1,
            template: buildTemplate(),
        };
        expect(parseTemplateFile(JSON.stringify(future))).toEqual({ ok: false, error: 'version' });

        const zero = { format: 'ttgamer-template', formatVersion: 0, template: buildTemplate() };
        expect(parseTemplateFile(JSON.stringify(zero))).toEqual({ ok: false, error: 'version' });
    });

    it('rejects schema violations without partial state', () => {
        const broken = {
            format: 'ttgamer-template',
            formatVersion: 1,
            template: { id: 'no-sections', name: 'Broken', sections: [] },
        };
        expect(parseTemplateFile(JSON.stringify(broken))).toEqual({ ok: false, error: 'schema' });
    });

    it('imports with degraded manual fields when a catalog is unavailable', () => {
        const template = buildTemplate('degraded-kit', 'no-such-catalog');
        const parsed = parseTemplateFile(serializeTemplateFile(template));

        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(parsed.degradedCatalogFields).toEqual(['weapon-pick']);
        expect(describeDegradedFields(parsed.template, parsed.degradedCatalogFields)).toEqual([
            'Weapon',
        ]);
        // The binding is stripped; the static placeholder options remain.
        const field = parsed.template.sections[0]!.blocks[0]!;
        expect(field.type).toBe('fields');
        if (field.type === 'fields') {
            const first = field.fields[0]!;
            expect(first.type).toBe('select');
            if (first.type === 'select') expect(first.binding).toBeUndefined();
        }
    });
});
