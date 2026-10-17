import { serializeDocumentExport } from '@site/src/sheet_manager/features/sheet/shell/documentFile';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    createVampireDefault,
    VAMPIRE_LIMITS,
    VampireSchema,
} from '@site/src/sheet_manager/systems/v5/modules/vampire/schema';
import { describe, expect, it } from 'vitest';

/** The vampire's own data on the shared V5 core (spec 037, US1). */

describe('vampire schema', () => {
    it('creates a fledgling', () => {
        const vampire = createVampireDefault();
        expect(vampire).toMatchObject({
            hunger: 1,
            humanity: 7,
            stains: 0,
            bloodPotency: 1,
            generation: 13,
            baneVariant: 'usual',
            bane: '',
            compulsion: '',
            disciplines: [],
            powers: [],
            rituals: [],
        });
        expect(vampire.attributes.strength.value).toBe(1);
    });

    it('rejects values outside the limits', () => {
        const base = createVampireDefault();
        for (const bad of [
            { hunger: 6 },
            { hunger: -1 },
            { humanity: 11 },
            { bloodPotency: 11 },
            { generation: 3 },
            { generation: 17 },
            { baneVariant: 'other' },
            { disciplines: [{ id: 'd', name: 'Auspex', value: 6 }] },
            {
                powers: Array.from({ length: VAMPIRE_LIMITS.powers + 1 }, (_, index) => ({
                    id: `p${index}`,
                })),
            },
        ]) {
            expect(VampireSchema.safeParse({ ...base, ...bad }).success, JSON.stringify(bad)).toBe(
                false
            );
        }
    });

    it('keeps stains to the boxes Humanity leaves empty', () => {
        const parsed = VampireSchema.parse({ ...createVampireDefault(), humanity: 8, stains: 5 });
        expect(parsed).toMatchObject({ humanity: 8, stains: 2 });
    });

    it('keeps thin-blood values and values above the generation (marked on the sheet)', () => {
        const thin = VampireSchema.parse({
            ...createVampireDefault(),
            generation: 15,
            bloodPotency: 0,
            clan: '',
        });
        expect(thin).toMatchObject({ generation: 15, bloodPotency: 0, clan: '' });
        const strong = VampireSchema.parse({
            ...createVampireDefault(),
            generation: 13,
            bloodPotency: 6,
        });
        expect(strong.bloodPotency).toBe(6);
    });

    it('strips unknown keys and round-trips through an export file', () => {
        const definition = systemRegistry.getDocumentDefinition('wod-v5', 'vampire')!;
        const data = VampireSchema.parse({
            ...createVampireDefault(),
            name: 'Mira',
            clan: 'Toreador',
            hunger: 3,
            stains: 1,
            disciplines: [{ id: 'd1', name: 'Auspex', value: 2 }],
            powers: [
                {
                    id: 'p1',
                    name: 'Sense the Unseen',
                    discipline: 'Auspex',
                    level: '1',
                    note: '',
                    entry: 'auspex-sense-the-unseen',
                    rouse: '0',
                },
            ],
            unknown: 'dropped',
        });
        expect(data).not.toHaveProperty('unknown');
        const envelope = {
            id: '0192f000-0000-7000-8000-00000000abcd',
            kind: definition.kind,
            systemId: 'wod-v5',
            definitionId: 'vampire',
            schemaVersion: definition.schemaVersion,
            metadata: { title: 'Mira', tags: [] },
            templateValues: {},
            data,
        };
        const file = JSON.parse(serializeDocumentExport(envelope as never));
        expect(file.notices?.length).toBeGreaterThan(0);
        const { envelope: back } = systemRegistry.parseDocument(file);
        expect(back.data).toEqual(data);
    });
});
