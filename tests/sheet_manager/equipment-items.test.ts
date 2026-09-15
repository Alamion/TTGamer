import {
    createEquipmentItem,
    updateEquipmentItem,
} from '@site/src/sheet_manager/features/sheet/body/equipmentItems';
import { ItemSchema, WeaponItemSchema } from '@site/src/sheet_manager/types/character';
import { describe, expect, it } from 'vitest';

describe('equipment item rules', () => {
    it('creates schema-valid items for every section', () => {
        expect(ItemSchema.safeParse(createEquipmentItem('inventory')).success).toBe(true);
        expect(WeaponItemSchema.safeParse(createEquipmentItem('weapons')).success).toBe(true);
        expect(createEquipmentItem('armor')).toMatchObject({ name: '', ar: '' });
        expect(createEquipmentItem('implants')).toMatchObject({ name: '', effect: '' });
    });

    it('clamps counters against their maximum', () => {
        const weapon = { ...createEquipmentItem('weapons'), id: 'w', ammo: 5, maxAmmo: 6 };
        expect(updateEquipmentItem('weapons', [weapon], 'w', 'maxAmmo', 3)[0]).toMatchObject({
            ammo: 3,
            maxAmmo: 3,
        });
        expect(updateEquipmentItem('weapons', [weapon], 'w', 'ammo', 9)[0]?.ammo).toBe(6);
        const item = { ...createEquipmentItem('inventory'), id: 'i', quantity: 1, maxQuantity: 2 };
        expect(updateEquipmentItem('inventory', [item], 'i', 'quantity', -4)[0]?.quantity).toBe(0);
        expect(updateEquipmentItem('inventory', [item], 'i', 'text', 'Rope')[0]?.text).toBe('Rope');
    });
});
