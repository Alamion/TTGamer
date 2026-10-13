import { migrateDocumentStoreState } from '@site/src/sheet_manager/store/documentStore';
import { convertLegacyExport } from '@site/src/sheet_manager/systems/star-wars-wod/legacyExport';
import { StarWarsCharacterDataSchema } from '@site/src/sheet_manager/systems/star-wars-wod/schema';
import { describe, expect, it } from 'vitest';

import fixture from './fixtures/legacy-export-first-version.json';

const copy = () =>
    structuredClone(fixture) as unknown as Record<string, unknown> & {
        armor: Array<Record<string, unknown>>;
    };

describe('the first-version character export', () => {
    it('imports into the Star Wars system with every stored value intact', () => {
        const { document } = convertLegacyExport(copy());
        const data = StarWarsCharacterDataSchema.parse(document.data);

        expect(document.systemId).toBe('star-wars-wod');
        expect(document.definitionId).toBe('character');
        expect(document.id).toBe(fixture.id);
        expect(document.metadata.title).toBe(fixture.metadata.name);
        expect(data).toMatchObject({
            metadata: fixture.metadata,
            attributes: fixture.attributes,
            skills: fixture.skills,
            forceSkills: fixture.forceSkills,
            virtues: fixture.virtues,
            backgrounds: fixture.backgrounds,
            merits: fixture.merits,
            flaws: fixture.flaws,
            forcePoints: fixture.forcePoints,
            darkSideResistance: fixture.darkSideResistance,
            health: fixture.health,
            experience: fixture.experience,
            forcePowerItems: fixture.forcePowerItems,
            notes: fixture.notes,
        });
        expect(data.inventory).toMatchObject(fixture.inventory);
    });

    it('names an armor item after its old type and raises a maximum below its current value', () => {
        const { document, repairs } = convertLegacyExport(copy());
        const data = StarWarsCharacterDataSchema.parse(document.data);

        expect(data.armor).toHaveLength(1);
        expect(data.armor[0]).toMatchObject({
            id: fixture.armor[0]!.id,
            name: 'Jedi Robes',
            classVal: '1',
            ar: '+0D',
            dex: '0',
        });
        expect(data.willpower).toEqual({ current: 7, max: 7 });
        expect(repairs).toEqual([
            { kind: 'armor-name', path: 'armor.0.name' },
            { kind: 'resource-maximum', path: 'willpower.max' },
        ]);
    });

    it('raises the Force points maximum the same way', () => {
        const input = copy();
        input.forcePoints = { current: 9, max: 7 };
        const { document, repairs } = convertLegacyExport(input);

        expect(StarWarsCharacterDataSchema.parse(document.data).forcePoints).toEqual({
            current: 9,
            max: 9,
        });
        expect(repairs.map(({ path }) => path)).toContain('forcePoints.max');
    });

    it('reports nothing for a character that needs no repair', () => {
        const input = copy();
        input.willpower = { current: 5, max: 5 };
        input.armor = [{ ...input.armor[0], name: 'Robes' }];
        expect(convertLegacyExport(input).repairs).toEqual([]);
    });

    it('still rejects other broken values', () => {
        const input = copy();
        input.weapons = [
            { id: 'w1', name: 'Blaster', damage: '4D', range: '10', ammo: 5, maxAmmo: 2 },
        ];
        expect(() => convertLegacyExport(input)).toThrow();
    });

    it('opens from a stored legacy collection without moving it to recovery', () => {
        const state = migrateDocumentStoreState({ characters: [copy()], currentCharacter: copy() });

        expect(state.recoveryEntries).toEqual([]);
        expect(state.documents.map(({ id }) => id)).toEqual([fixture.id]);
    });
});
