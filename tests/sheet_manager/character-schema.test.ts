import {
    BaseCharacterSchema,
    calculateHealthPenalty,
    createDefaultCharacter,
} from '@site/src/sheet_manager/types/character';
import { describe, expect, it } from 'vitest';

describe('character schema', () => {
    it('allows a blank character name while keeping the parsed type stable', () => {
        const input = createDefaultCharacter();
        delete (input.metadata as { name?: string }).name;

        expect(BaseCharacterSchema.parse(input).metadata.name).toBe('');
    });

    it('strips retired Force power fields from old exports', () => {
        const parsed = BaseCharacterSchema.parse({
            ...createDefaultCharacter(),
            forcePowers: ['legacy'],
            customForcePowers: [{ id: 'legacy', name: 'Legacy' }],
        });

        expect(parsed).not.toHaveProperty('forcePowers');
        expect(parsed).not.toHaveProperty('customForcePowers');
    });

    it('rejects non-finite and out-of-range numeric data', () => {
        const character = createDefaultCharacter();
        character.attributes.Strength.value = Number.POSITIVE_INFINITY;

        expect(BaseCharacterSchema.safeParse(character).success).toBe(false);
    });

    it('rejects current resources above their maximum', () => {
        const character = createDefaultCharacter();
        character.forcePoints = { current: 4, max: 3 };

        expect(BaseCharacterSchema.safeParse(character).success).toBe(false);
    });

    it('rejects quantities, ammunition, and spent experience above their maxima', () => {
        const character = createDefaultCharacter();
        character.inventory = [
            {
                id: 'item',
                text: 'Item',
                quantity: 2,
                maxQuantity: 1,
                description: '',
                effects: '',
                weight: '',
                price: '',
                equipped: false,
            },
        ];
        character.weapons = [
            { id: 'weapon', name: 'Weapon', damage: '', range: '', ammo: 2, maxAmmo: 1 },
        ];
        character.experience = { total: 1, spent: 2 };

        const result = BaseCharacterSchema.safeParse(character);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.map(({ path }) => path.join('.'))).toEqual(
                expect.arrayContaining([
                    'inventory.0.quantity',
                    'weapons.0.ammo',
                    'experience.spent',
                ])
            );
        }
    });
});

describe('calculateHealthPenalty', () => {
    it('uses the deepest marked health level', () => {
        expect(
            calculateHealthPenalty(['slash', 'slash', 'cross', 'empty', 'empty', 'empty', 'empty'])
        ).toBe(-2);
    });

    it('returns zero for an undamaged character', () => {
        expect(
            calculateHealthPenalty(['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
        ).toBe(0);
    });
});
