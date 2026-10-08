import { readFileSync } from 'node:fs';
import path from 'node:path';

import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { CatalogCellValue, CatalogEntry } from '@site/src/sheet_manager/systems/userCatalogs';
import { UserCatalogSchema } from '@site/src/sheet_manager/systems/userCatalogs';
import {
    UserDocumentTypeSchema,
    UserSettingSchema,
} from '@site/src/sheet_manager/systems/userTypes';
import { HunterSchema } from '@site/src/sheet_manager/systems/v5/modules/hunter/schema';
import { V5CoreSchema } from '@site/src/sheet_manager/systems/v5/ruleset/schema';
import type { BaseCharacter, Item } from '@site/src/sheet_manager/types/character';
import { BaseCharacterSchema } from '@site/src/sheet_manager/types/character';
import { UnknownDocumentEnvelopeSchema } from '@site/src/sheet_manager/types/document';
import { CatalogBindingSchema, CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import {
    TemplateImageValueSchema,
    TemplatePageValuesSchema,
} from '@site/src/sheet_manager/types/templateValues';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

/**
 * Characterization of what the schemas accept, reject, and produce (spec 027). The snapshot was
 * written on Zod 3; a dependency change must leave it unchanged except for issue codes that the
 * library renamed, which are listed in the spec's design notes.
 */
const fixtures = path.resolve(__dirname, 'fixtures');
const legacyTemplates = JSON.parse(
    readFileSync(path.join(fixtures, 'character-templates.pre-007.json'), 'utf8')
) as unknown[];

const NOW = '2026-09-25T10:00:00.000Z';
const trait = { value: 2, specialization: false, experienced: false, practiced: false };

function outcome(schema: z.ZodType, input: unknown) {
    const result = schema.safeParse(input);
    if (result.success) return { ok: true, data: result.data };
    return {
        ok: false,
        issues: result.error.issues.map(({ path: issuePath, code }) => ({
            path: issuePath.join('.'),
            code,
        })),
    };
}

const character = (extra: object = {}) => ({
    id: '00000000-0000-4000-8000-000000000001',
    metadata: { name: 'A', type: 'sentient', template: 'standard', legacyField: 1 },
    attributes: { Strength: trait },
    skills: { Brawl: trait },
    health: { levels: Array(7).fill('empty') },
    notes: '',
    ...extra,
});
const node = (extra: object = {}) => ({ id: 'name', type: 'text', label: 'Name', ...extra });
const template = (children: unknown[] = [node()], extra: object = {}) => ({
    id: 'page',
    name: 'Page',
    documentKind: 'character',
    schemaVersion: 3,
    children,
    ...extra,
});
const catalogColumn = (id: string, type = 'text') => ({ id, name: id, type });
const catalog = (extra: object = {}) => ({
    id: 'user-catalog-aaaaaaaa',
    name: 'Gear',
    owner: { settingId: 'user-setting-aaaaaaaa' },
    columns: [catalogColumn('c-aaaaaaaa'), catalogColumn('c-bbbbbbbb', 'number')],
    entries: [
        {
            id: 'e-aaaaaaaa',
            name: 'Rope',
            values: { 'c-aaaaaaaa': 'hemp', 'c-bbbbbbbb': 'x', 'c-zzzzzzzz': 1 },
        },
        { id: 'e-bbbbbbbb', name: 'Lamp' },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    ...extra,
});
const envelope = (extra: object = {}) => ({
    id: 'doc-1',
    kind: 'character',
    systemId: 'v5',
    definitionId: 'character',
    schemaVersion: 1,
    metadata: { templateId: 'page' },
    data: { anything: true },
    ...extra,
});
const userType = (extra: object = {}) => ({
    id: 'user-org00001',
    name: ' Organization ',
    owner: { systemId: 'star-wars-wod' },
    createdAt: NOW,
    updatedAt: NOW,
    ...extra,
});

const cases: Array<[string, z.ZodType, unknown]> = [
    [
        'character: legacy import strips unknown keys',
        BaseCharacterSchema,
        character({ legacyTop: 'x', skills: { Brawl: { ...trait, retired: true } } }),
    ],
    [
        'character: experience defaults and refine path',
        BaseCharacterSchema,
        character({ experience: { spent: 5 } }),
    ],
    [
        'character: spent above total',
        BaseCharacterSchema,
        character({ experience: { total: 1, spent: 5 } }),
    ],
    [
        'character: null defaulted array',
        BaseCharacterSchema,
        character({ inventory: null, merits: undefined }),
    ],
    ['character: wrong trait type', BaseCharacterSchema, { attributes: { Strength: 'high' } }],
    ['character: empty object', BaseCharacterSchema, {}],
    ['character: not an object', BaseCharacterSchema, null],
    ['envelope: legacy system id is renamed', UnknownDocumentEnvelopeSchema, envelope()],
    ['envelope: values bag and tags default', UnknownDocumentEnvelopeSchema, envelope()],
    [
        'envelope: null templateValues',
        UnknownDocumentEnvelopeSchema,
        envelope({ templateValues: null }),
    ],
    [
        'envelope: undefined templateValues',
        UnknownDocumentEnvelopeSchema,
        envelope({ templateValues: undefined }),
    ],
    [
        'envelope: bad kind and version',
        UnknownDocumentEnvelopeSchema,
        envelope({ kind: 'Bad Kind', schemaVersion: 0 }),
    ],
    [
        'envelope: oversized title',
        UnknownDocumentEnvelopeSchema,
        envelope({ metadata: { title: 'x'.repeat(201) } }),
    ],
    ['template: minimal gets default system', CustomTemplateSchema, template()],
    ['template: legacy system id', CustomTemplateSchema, template([node()], { systemId: 'v5' })],
    ['template: empty children', CustomTemplateSchema, template([])],
    ['template: duplicate ids', CustomTemplateSchema, template([node(), node()])],
    [
        'template: nested bad node',
        CustomTemplateSchema,
        template([{ id: 's', type: 'section', title: 'S', children: [{ id: 'x', type: 'nope' }] }]),
    ],
    ['template: unknown top-level key', CustomTemplateSchema, template([node()], { extra: 1 })],
    ['template: wrong types', CustomTemplateSchema, template([node({ label: 5 })])],
    ['user type: trimmed name', UserDocumentTypeSchema, userType()],
    ['user type: bad id', UserDocumentTypeSchema, userType({ id: 'nope' })],
    [
        'user type: strict owner rejects extras',
        UserDocumentTypeSchema,
        userType({ owner: { systemId: 'star-wars-wod', extra: 1 } }),
    ],
    [
        'user type: owner with both keys',
        UserDocumentTypeSchema,
        userType({ owner: { settingId: 'user-setting-aaaaaaaa', systemId: 'star-wars-wod' } }),
    ],
    [
        'user setting: pages default',
        UserSettingSchema,
        {
            id: 'user-setting-aaaaaaaa',
            name: 'S',
            systemId: 'star-wars-wod',
            createdAt: NOW,
            updatedAt: NOW,
        },
    ],
    [
        'user setting: null pages',
        UserSettingSchema,
        {
            id: 'user-setting-aaaaaaaa',
            name: 'S',
            systemId: 'star-wars-wod',
            pages: null,
            createdAt: NOW,
            updatedAt: NOW,
        },
    ],
    ['catalog: drops mismatched and unknown values', UserCatalogSchema, catalog()],
    [
        'catalog: duplicate column id',
        UserCatalogSchema,
        catalog({ columns: [catalogColumn('c-aaaaaaaa'), catalogColumn('c-aaaaaaaa')] }),
    ],
    [
        'catalog: duplicate entry id',
        UserCatalogSchema,
        catalog({
            entries: [
                { id: 'e-aaaaaaaa', name: 'A' },
                { id: 'e-aaaaaaaa', name: 'B' },
            ],
        }),
    ],
    [
        'catalog: strict column rejects extras',
        UserCatalogSchema,
        catalog({ columns: [{ ...catalogColumn('c-aaaaaaaa'), extra: 1 }] }),
    ],
    [
        'catalog: non-finite value',
        UserCatalogSchema,
        catalog({ entries: [{ id: 'e-aaaaaaaa', name: 'A', values: { 'c-bbbbbbbb': Infinity } }] }),
    ],
    ['v5: empty draft gets every default', V5CoreSchema, {}],
    [
        'v5: legacy track counts and specialties',
        V5CoreSchema,
        {
            health: { superficial: 2, aggravated: 1 },
            skills: { Firearms: { value: 2, specialties: ['Pistols', 'Rifles'] } },
            attributes: { Strength: {} },
        },
    ],
    ['v5: wrong track', V5CoreSchema, { health: { levels: ['nope'] }, experience: 'x' }],
    ['hunter: empty draft gets every default', HunterSchema, {}],
    ['catalog binding: fills default', CatalogBindingSchema, { catalogId: 'weapons' }],
    ['catalog binding: null fills', CatalogBindingSchema, { catalogId: 'weapons', fills: null }],
    [
        'image: https url',
        TemplateImageValueSchema,
        { source: 'url', url: 'https://example.com/a.png' },
    ],
    [
        'image: http url',
        TemplateImageValueSchema,
        { source: 'url', url: 'http://example.com/a.png' },
    ],
    ['image: not a url', TemplateImageValueSchema, { source: 'url', url: 'https://' }],
    [
        'image: url with spaces',
        TemplateImageValueSchema,
        { source: 'url', url: 'https://exa mple.com/a.png' },
    ],
    [
        'image: javascript url',
        TemplateImageValueSchema,
        { source: 'url', url: 'javascript:alert(1)' },
    ],
    [
        'image: strict rejects extras',
        TemplateImageValueSchema,
        { source: 'url', url: 'https://a.io/x', extra: 1 },
    ],
    ['image: device blob', TemplateImageValueSchema, { source: 'device', blobId: 'abc' }],
    ['values: empty record keys', TemplatePageValuesSchema, { '': 1 }],
    ['values: mixed primitives', TemplatePageValuesSchema, { a: 'x', b: 2, c: true, d: null }],
];

describe('Zod baseline (spec 027)', () => {
    it('keeps the outcome and parsed value of every schema case', async () => {
        const result = Object.fromEntries(
            cases.map(([label, schema, input]) => [label, outcome(schema, input)])
        );
        await expect(JSON.stringify(result, null, 4) + '\n').toMatchFileSnapshot(
            path.join(fixtures, 'zod-baseline', 'cases.json')
        );
    });

    it('keeps the legacy shipped template file valid', async () => {
        const result = legacyTemplates.map((entry) => outcome(CustomTemplateSchema, entry));
        expect(result.map(({ ok }) => ok)).toEqual(legacyTemplates.map(() => true));
        await expect(
            JSON.stringify(
                result.map((r) => ('data' in r ? r.data : r)),
                null,
                1
            ) + '\n'
        ).toMatchFileSnapshot(path.join(fixtures, 'zod-baseline', 'legacy-templates.json'));
    });

    it('keeps every shipped default template valid with an identical parse', async () => {
        const result: Record<string, unknown> = {};
        for (const system of systemRegistry.getSystems()) {
            for (const entry of system.defaultTemplates ?? []) {
                result[`${system.id}/${entry.id}`] = outcome(CustomTemplateSchema, entry);
            }
        }
        expect(Object.values(result).every((r) => (r as { ok: boolean }).ok)).toBe(true);
        await expect(JSON.stringify(result, null, 1) + '\n').toMatchFileSnapshot(
            path.join(fixtures, 'zod-baseline', 'shipped-templates.json')
        );
    });

    it('keeps the shape of the exported types', () => {
        expectTypeOf<BaseCharacter['inventory']>().toEqualTypeOf<Item[]>();
        expectTypeOf<BaseCharacter['notes']>().toEqualTypeOf<string>();
        expectTypeOf<CatalogEntry['values']>().toEqualTypeOf<Record<string, CatalogCellValue>>();
        expectTypeOf<CatalogEntry['name']>().toEqualTypeOf<string>();
    });
});
