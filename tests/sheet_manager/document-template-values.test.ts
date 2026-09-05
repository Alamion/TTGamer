import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod';
import { createDefaultCharacter } from '@site/src/sheet_manager/types/character';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import { UnknownDocumentEnvelopeSchema } from '@site/src/sheet_manager/types/document';
import {
    collectTemplateFields,
    CustomTemplateSchema,
    TemplateFieldSchema,
} from '@site/src/sheet_manager/types/template';
import {
    coerceStoredValue,
    TEMPLATE_VALUES_LIMITS,
    validateTemplateValue,
} from '@site/src/sheet_manager/types/templateValues';
import { describe, expect, it } from 'vitest';

function buildEnvelope(templateValues?: unknown): UnknownDocumentEnvelope {
    const character = createDefaultCharacter();
    const base = UnknownDocumentEnvelopeSchema.parse({
        id: 'doc-1',
        kind: 'character',
        systemId: 'star-wars-wod',
        definitionId: 'star-wars-wod-character',
        schemaVersion: 1,
        metadata: { title: 'Test', tags: [] },
        templateValues,
        data: character,
    });
    return base;
}

function buildTemplate() {
    return CustomTemplateSchema.parse({
        id: 'my-kit',
        name: 'My Kit',
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
                        columns: 2,
                        fields: [
                            { id: 'insignia', label: 'Insignia', type: 'text' },
                            { id: 'charge', label: 'Charge', type: 'number', min: 0, max: 10 },
                            { id: 'trained', label: 'Trained', type: 'toggle' },
                            {
                                id: 'rank',
                                label: 'Rank',
                                type: 'select',
                                options: [{ id: 'rookie', label: 'Rookie' }],
                            },
                            { id: 'force-rating', label: 'Force rating', type: 'rating', max: 5 },
                            { id: 'credits', label: 'Credits', type: 'resource', max: 1000 },
                        ],
                    },
                    {
                        id: 'gear-table',
                        type: 'table',
                        title: 'Gear',
                        maxRows: 5,
                        columns: [{ id: 'gear-name', label: 'Item', type: 'text' }],
                    },
                ],
            },
        ],
    });
}

describe('template value bag (envelope layer)', () => {
    it('defaults to an empty bag and keeps legacy documents parseable', () => {
        const envelope = buildEnvelope();
        expect(envelope.templateValues).toEqual({});
    });

    it('accepts sparse values for fields and table rows in one flat bag', () => {
        const envelope = buildEnvelope({
            insignia: 'Blazing sun',
            credits: { current: 120, max: 500 },
            'gear-table': { '0': { 'gear-name': 'Knife' }, '1': { 'gear-name': 'Sword' } },
        });
        expect(envelope.templateValues).toEqual({
            insignia: 'Blazing sun',
            credits: { current: 120, max: 500 },
            'gear-table': { '0': { 'gear-name': 'Knife' }, '1': { 'gear-name': 'Sword' } },
        });
    });

    it('rejects oversized bags', () => {
        const entries = Object.fromEntries(
            Array.from({ length: TEMPLATE_VALUES_LIMITS.entriesPerTemplate + 1 }, (_, index) => [
                `field-${index}`,
                'value',
            ])
        );
        expect(() => buildEnvelope(entries)).toThrow();
    });

    it('rejects non-finite numbers and overlong strings', () => {
        expect(() => buildEnvelope({ bad: Number.NaN })).toThrow();
        expect(() => buildEnvelope({ bad: 'x'.repeat(10_001) })).toThrow();
    });
});

describe('strict write-path validation', () => {
    const template = buildTemplate();

    it('accepts valid values per field type', () => {
        const text = TemplateFieldSchema.parse({ id: 'a', label: 'A', type: 'text' });
        expect(validateTemplateValue(text, 'ok')).toEqual({ ok: true, value: 'ok' });
        const charge = collectTemplateFields(template).get('charge')!;
        expect(validateTemplateValue(charge, 5)).toEqual({ ok: true, value: 5 });
        const trained = collectTemplateFields(template).get('trained')!;
        expect(validateTemplateValue(trained, true)).toEqual({ ok: true, value: true });
        const rank = collectTemplateFields(template).get('rank')!;
        expect(validateTemplateValue(rank, 'rookie')).toEqual({ ok: true, value: 'rookie' });
        const rating = collectTemplateFields(template).get('force-rating')!;
        expect(validateTemplateValue(rating, 3)).toEqual({ ok: true, value: 3 });
        const credits = collectTemplateFields(template).get('credits')!;
        expect(validateTemplateValue(credits, { current: 10, max: 500 })).toEqual({
            ok: true,
            value: { current: 10, max: 500 },
        });
    });

    it('rejects type, bounds, and option mismatches', () => {
        const charge = collectTemplateFields(template).get('charge')!;
        expect(validateTemplateValue(charge, 'five')).toEqual({ ok: false, reason: 'type' });
        expect(validateTemplateValue(charge, 11)).toEqual({ ok: false, reason: 'bounds' });
        const rank = collectTemplateFields(template).get('rank')!;
        expect(validateTemplateValue(rank, 'unknown')).toEqual({ ok: false, reason: 'options' });
        const credits = collectTemplateFields(template).get('credits')!;
        expect(validateTemplateValue(credits, { current: 10 })).toEqual({
            ok: false,
            reason: 'type',
        });
    });

    it('coerces stored values after template type changes and drops the rest', () => {
        expect(
            coerceStoredValue(TemplateFieldSchema.parse({ id: 'a', label: 'A', type: 'text' }), 42)
        ).toBe('42');
        expect(
            coerceStoredValue(
                TemplateFieldSchema.parse({ id: 'a', label: 'A', type: 'number' }),
                '42'
            )
        ).toBe(42);
        expect(
            coerceStoredValue(
                TemplateFieldSchema.parse({ id: 'a', label: 'A', type: 'toggle' }),
                'true'
            )
        ).toBe(true);
        expect(
            coerceStoredValue(
                TemplateFieldSchema.parse({
                    id: 'a',
                    label: 'A',
                    type: 'select',
                    multiple: true,
                    options: [{ id: 'x', label: 'X' }],
                }),
                'x'
            )
        ).toEqual(['x']);
        expect(
            coerceStoredValue(
                TemplateFieldSchema.parse({ id: 'a', label: 'A', type: 'rating', max: 5 }),
                'high'
            )
        ).toBeUndefined();
    });
});

describe('v2→v3 shared value store migration', () => {
    it('flattens a nested v2 bag through the template valueKeys', async () => {
        const { migrateDocumentStoreState } =
            await import('@site/src/sheet_manager/store/documentStore');
        const { useTemplateStore } = await import('@site/src/sheet_manager/store/templateStore');
        const template = CustomTemplateSchema.parse({
            id: 'mig-kit',
            name: 'Mig Kit',
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
                            fields: [
                                {
                                    id: 'appearance',
                                    label: 'Appearance',
                                    type: 'text',
                                    valueKey: 'look',
                                },
                                { id: 'mood', label: 'Mood', type: 'text' },
                            ],
                        },
                    ],
                },
            ],
        });
        useTemplateStore.setState({ templates: [template], quarantine: [] });

        const migrated = migrateDocumentStoreState({
            documents: [
                {
                    id: 'doc-mig',
                    kind: 'character',
                    systemId: 'star-wars-wod',
                    definitionId: 'character',
                    schemaVersion: 1,
                    metadata: { title: 'Mig', tags: [] },
                    templateValues: {
                        'mig-kit': { appearance: 'pale', mood: 'brooding' },
                    },
                    data: createDefaultStarWarsCharacterData(),
                },
            ],
        });

        // valueKey mapping: appearance → 'look'; mood keeps its field id as key.
        const values = migrated.documents[0]!.templateValues;
        expect(values?.look).toBe('pale');
        expect(values?.mood).toBe('brooding');
    });

    it('keeps unknown template namespaces verbatim (no data dropped)', async () => {
        const { migrateDocumentStoreState } =
            await import('@site/src/sheet_manager/store/documentStore');
        const migrated = migrateDocumentStoreState({
            documents: [
                {
                    id: 'doc-orphan',
                    kind: 'character',
                    systemId: 'star-wars-wod',
                    definitionId: 'character',
                    schemaVersion: 1,
                    metadata: { title: 'Orphan', tags: [] },
                    templateValues: {
                        'deleted-template': { someField: 'kept' },
                    },
                    data: createDefaultStarWarsCharacterData(),
                },
            ],
        });
        expect(migrated.documents[0]!.templateValues).toEqual({
            someField: 'kept',
        });
    });
});
