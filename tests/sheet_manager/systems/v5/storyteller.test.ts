import { getCatalogBinding } from '@site/src/sheet_manager/features/sheet/data/catalogBindings';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { resolveDocumentBinding } from '@site/src/sheet_manager/systems/templateBindings';
import {
    createV5StorytellerDefault,
    V5StorytellerSchema,
} from '@site/src/sheet_manager/systems/v5/core/storyteller';
import { afterEach, describe, expect, it } from 'vitest';

import { setTestLocale } from '../../../stubs/testLocale';

afterEach(() => setTestLocale('en'));

describe('the Storyteller character (spec 040, US1)', () => {
    it('starts as a mortal with pools of 2 and four boxes of Health and Willpower', () => {
        const data = createV5StorytellerDefault();
        expect(data).toMatchObject({
            type: 'mortal',
            difficulty: 0,
            pools: { physical: { value: 2 }, social: { value: 2 }, mental: { value: 2 } },
            health: { levels: [], bonus: 0 },
            willpower: { levels: [], bonus: 0 },
            exceptional: [],
            powers: [],
        });
    });

    it('keeps pools within 0–15, tracks within 1–15 boxes, and Difficulty within 0–5', () => {
        const parse = (patch: object) =>
            V5StorytellerSchema.safeParse({ ...createV5StorytellerDefault(), ...patch }).success;
        expect(parse({ pools: { physical: { value: 15 } } })).toBe(true);
        expect(parse({ pools: { physical: { value: 16 } } })).toBe(false);
        // Four base boxes plus the track's own +/−: 1 to 15 boxes.
        expect(parse({ health: { levels: [], bonus: -3 } })).toBe(true);
        expect(parse({ health: { levels: [], bonus: -4 } })).toBe(false);
        expect(parse({ willpower: { levels: [], bonus: 11 } })).toBe(true);
        expect(parse({ willpower: { levels: [], bonus: 12 } })).toBe(false);
        expect(parse({ difficulty: 6 })).toBe(false);
        expect(parse({ type: 'werewolf' })).toBe(false);
        expect(parse({ exceptional: [{ id: 'e1', name: 'Firearms', value: 15 }] })).toBe(true);
        expect(parse({ powers: [{ id: 'p1', name: 'Auspex', value: 6 }] })).toBe(false);
    });

    it('is a module-less V5 kind that user settings reuse', () => {
        const system = systemRegistry.getSystem('wod-v5')!;
        const definition = systemRegistry.getDocumentDefinition('wod-v5', 'v5-storyteller')!;
        expect(definition.kind).toBe('storyteller');
        expect(definition.module).toBeUndefined();
        expect(system.coreDefinitions).toContain('v5-storyteller');
    });

    it('binds its pools, tracks, lists, and fields', () => {
        const binding = (key: string) => resolveDocumentBinding('wod-v5', 'storyteller', key);
        expect(binding('trait:pools:physical')).toMatchObject({
            maximum: 15,
            presentation: 'number',
        });
        expect(binding('track:health')).toMatchObject({
            length: { from: '4', adjustmentRange: { min: -3, max: 11 }, maxLength: 15 },
        });
        expect(binding('list:exceptional')).toMatchObject({ maximum: 15, presentation: 'number' });
        expect(binding('list:powers')).toMatchObject({
            catalog: { catalogId: 'v5-vampire-disciplines', catalogIds: ['v5-hunter-edges'] },
        });
        expect(binding('field:name')).toMatchObject({ syncsTitle: true });
        expect(binding('trait:attributes:strength')).toBeUndefined();
    });

    it('suggests the V5 skills by their names in the reader’s language', () => {
        const catalog = getCatalogBinding('v5-skills')!;
        const firearms = catalog.entries.find(({ id }) => id === 'firearms')!;
        expect(catalog.entries).toHaveLength(27);
        expect(catalog.pickLabel(firearms, 'en')).toBe('Firearms');
        setTestLocale('ru');
        expect(catalog.pickLabel(firearms, 'ru')).toBe('Стрельба (Firearms)');
    });
});
