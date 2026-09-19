import { describe, expect, it } from 'vitest';

import { resolveItemName } from '../../src/sheet_manager/features/sheet/data/itemDisplay';
import { ItemSchema, WeaponItemSchema } from '../../src/sheet_manager/types/character';

describe('equipment entry references', () => {
    it('shows a picked entry in the reader language until the user renames it', () => {
        expect(resolveItemName('Knife', 'melee-weapons/knife', 'ru')).toBe('Нож');
        expect(resolveItemName('', 'melee-weapons/knife', 'ru')).toBe('Нож');
        expect(resolveItemName('Knife', 'melee-weapons/knife', 'en')).toBe('Knife');
        expect(resolveItemName('Мой нож', 'melee-weapons/knife', 'ru')).toBe('Мой нож');
        expect(resolveItemName('Мой нож', 'melee-weapons/knife', 'en')).toBe('Мой нож');
    });

    it('leaves items without a reference or with an unknown one unchanged', () => {
        expect(resolveItemName('Old sword', undefined, 'ru')).toBe('Old sword');
        expect(resolveItemName('Thing', 'melee-weapons/nothing', 'ru')).toBe('Thing');
        expect(resolveItemName('Thing', 'not a ref', 'ru')).toBe('Thing');
    });

    it('accepts entryRef on items, rejects malformed refs, and keeps items without one', () => {
        const withRef = WeaponItemSchema.safeParse({
            id: 'w1',
            entryRef: 'melee-weapons/knife',
            name: 'Knife',
            damage: 'STR+1',
            range: '',
        });
        expect(withRef.success && withRef.data.entryRef).toBe('melee-weapons/knife');
        expect(
            WeaponItemSchema.safeParse({ id: 'w2', name: 'Custom', damage: '', range: '' }).success
        ).toBe(true);
        expect(
            WeaponItemSchema.safeParse({
                id: 'w3',
                entryRef: 'Bad Ref!',
                name: '',
                damage: '',
                range: '',
            }).success
        ).toBe(false);
        expect(
            ItemSchema.safeParse({ id: 'i1', text: 'Medpac', entryRef: 'tools-gear/medpac' })
                .success
        ).toBe(true);
    });
});
