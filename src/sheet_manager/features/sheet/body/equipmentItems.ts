import { generateId } from '@site/src/shared/utils/random';

import type { EquipmentSectionId } from '../../../systems/templateBindings';
import type { ArmorItem, ImplantItem, Item, WeaponItem } from '../../../types/character';

/**
 * Pure item rules of the equipment sections, shared by the Star Wars character capability and
 * plain bound arrays: fresh items, and field updates that keep counters schema-valid
 * (quantity ≤ max quantity, ammo ≤ capacity, whole non-negative numbers).
 */

export interface EquipmentItems {
    inventory: Item;
    weapons: WeaponItem;
    armor: ArmorItem;
    implants: ImplantItem;
}

export type EquipmentItem<S extends EquipmentSectionId> = EquipmentItems[S];

export function createEquipmentItem<S extends EquipmentSectionId>(section: S): EquipmentItem<S> {
    const id = generateId();
    const items: { [K in EquipmentSectionId]: EquipmentItems[K] } = {
        inventory: {
            id,
            text: '',
            description: '',
            effects: '',
            weight: '',
            price: '',
            quantity: 1,
            maxQuantity: 1,
            equipped: false,
        },
        weapons: { id, name: '', damage: '', range: '', ammo: 0, maxAmmo: 0 },
        armor: { id, name: '', classVal: '', ar: '', dex: '' },
        implants: { id, name: '', type: '', effect: '' },
    };
    return items[section];
}

const COUNTERS: Partial<Record<EquipmentSectionId, { value: string; max: string }>> = {
    inventory: { value: 'quantity', max: 'maxQuantity' },
    weapons: { value: 'ammo', max: 'maxAmmo' },
};

const toCount = (value: unknown) => Math.max(0, Math.trunc(Number(value) || 0));

/** Items after setting one field of one item; counters clamp against their maximum. */
export function updateEquipmentItem<S extends EquipmentSectionId>(
    section: S,
    items: readonly EquipmentItem<S>[],
    id: string,
    field: string,
    value: string | number | boolean
): EquipmentItem<S>[] {
    const counter = COUNTERS[section];
    return items.map((item) => {
        if (item.id !== id) return item;
        const record = item as unknown as Record<string, unknown>;
        if (counter && field === counter.max) {
            const max = toCount(value);
            return {
                ...item,
                [counter.max]: max,
                [counter.value]: Math.min(toCount(record[counter.value]), max),
            };
        }
        if (counter && field === counter.value) {
            return {
                ...item,
                [counter.value]: Math.min(toCount(value), toCount(record[counter.max])),
            };
        }
        return { ...item, [field]: value };
    });
}
