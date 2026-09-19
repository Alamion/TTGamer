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
        schemaVersion: 3,
        children: [
            {
                id: 'kit',
                type: 'section',
                title: 'Kit',
                children: [
                    {
                        id: 'weapon-pick',
                        label: 'Weapon',
                        type: 'select',
                        multiple: false,
                        options: [{ id: 'placeholder', label: 'Placeholder' }],
                        binding: {
                            catalogId,
                            fills: { name: { targetFieldId: 'weapon-name' } },
                        },
                        required: false,
                        compact: false,
                    },
                    {
                        id: 'weapon-name',
                        label: 'Weapon name',
                        type: 'text',
                        required: false,
                        compact: false,
                        multiline: false,
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
            formatVersion: TEMPLATE_FILE_VERSION,
            template: { id: 'no-children', name: 'Broken', children: [] },
        };
        expect(parseTemplateFile(JSON.stringify(broken))).toEqual({ ok: false, error: 'schema' });
    });

    it('rejects v2 and older file payloads as unsupported versions', () => {
        const legacy = {
            format: 'ttgamer-template',
            formatVersion: 2,
            template: buildTemplate(),
        };
        expect(parseTemplateFile(JSON.stringify(legacy))).toEqual({ ok: false, error: 'version' });
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
        const kit = parsed.template.children[0]!;
        if (kit.type !== 'section' && kit.type !== 'group') {
            throw new Error('expected a container');
        }
        const node = kit.children[0]!;
        expect(node.type).toBe('select');
        if (node.type === 'select') expect(node.binding).toBeUndefined();
    });
});

describe('template files across systems (feature 008)', () => {
    it('adds publisher notices only for systems that declare policies', () => {
        const starWars = JSON.parse(serializeTemplateFile(buildTemplate()));
        expect(starWars).not.toHaveProperty('notices');
        const hunter = JSON.parse(
            serializeTemplateFile({ ...buildTemplate('hunter-kit'), systemId: 'wod-v5' as never })
        );
        expect(hunter.notices.map(({ policy }: { policy: string }) => policy)).toEqual([
            'dark-pack',
        ]);
    });

    it('ignores notices on import and rejects templates of unknown systems', () => {
        const withNotices = JSON.parse(serializeTemplateFile(buildTemplate()));
        withNotices.notices = [{ policy: 'dark-pack', text: ['x'], url: 'https://example.com' }];
        const parsed = parseTemplateFile(JSON.stringify(withNotices));
        expect(parsed.ok).toBe(true);

        const foreign = JSON.parse(serializeTemplateFile(buildTemplate()));
        foreign.template.systemId = 'pathfinder';
        expect(parseTemplateFile(JSON.stringify(foreign))).toEqual({ ok: false, error: 'system' });
    });
});
