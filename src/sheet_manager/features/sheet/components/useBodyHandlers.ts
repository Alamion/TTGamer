import { useCharacter } from '../../../hooks';
import { generateId } from '@site/src/shared/utils/random';
import type { ArmorItem, WeaponItem, ImplantItem, Item } from '../../../types/character';
import type { CatalogEntry } from '../../../components';
import { findWeaponEntry, findArmorEntry, findInventorySource, findImplantEntry } from './catalogs';

export function useBodyHandlers() {
    const { character, readOnly, updateCharacter } = useCharacter();
    if (!character) return null;

    const inventory = character.inventory || [];
    const armor = character.armor || [];
    const weapons = character.weapons || [];
    const implants = character.implants || [];

    const addItem = <T>(field: string, defaultItem: T) => {
        updateCharacter(character.id, {
            [field]: [...((character as Record<string, unknown>)[field] as T[]), defaultItem],
        });
    };

    const removeItem = <T extends { id: string }>(field: string, id: string) => {
        updateCharacter(character.id, {
            [field]: ((character as Record<string, unknown>)[field] as T[]).filter(
                (item) => item.id !== id
            ),
        });
    };

    const updateItem = <T>(
        field: string,
        id: string,
        key: keyof T,
        value: string | number | boolean
    ) => {
        updateCharacter(character.id, {
            [field]: ((character as Record<string, unknown>)[field] as T[]).map(
                (item: T & { id: string }) => (item.id === id ? { ...item, [key]: value } : item)
            ),
        });
    };

    const addInventoryItem = () =>
        addItem<Item>('inventory', {
            id: generateId(),
            text: '',
            description: '',
            effects: '',
            weight: '',
            price: '',
            quantity: 1,
            maxQuantity: 1,
            equipped: false,
        });

    const removeInventoryItem = (id: string) => removeItem<Item>('inventory', id);

    const updateInventoryItem = (id: string, field: keyof Item, value: string | number | boolean) =>
        updateItem<Item>('inventory', id, field, value);

    const addArmorItem = () =>
        addItem<ArmorItem>('armor', {
            id: generateId(),
            name: '',
            classVal: '',
            ar: '',
            dex: '',
        });

    const removeArmorItem = (id: string) => removeItem<ArmorItem>('armor', id);

    const updateArmorItem = (id: string, field: keyof ArmorItem, value: string) =>
        updateItem<ArmorItem>('armor', id, field, value);

    const addWeaponItem = () =>
        addItem<WeaponItem>('weapons', {
            id: generateId(),
            name: '',
            damage: '',
            range: '',
            ammo: 0,
            maxAmmo: 0,
        });

    const removeWeaponItem = (id: string) => removeItem<WeaponItem>('weapons', id);

    const updateWeaponItem = (id: string, field: keyof WeaponItem, value: string | number) =>
        updateItem<WeaponItem>('weapons', id, field, value);

    const addImplantItem = () =>
        addItem<ImplantItem>('implants', {
            id: generateId(),
            name: '',
            type: '',
            effect: '',
        });

    const removeImplantItem = (id: string) => removeItem<ImplantItem>('implants', id);

    const updateImplantItem = (id: string, field: keyof ImplantItem, value: string) =>
        updateItem<ImplantItem>('implants', id, field, value);

    const handleWeaponCatalogSelect = (id: string, entry: CatalogEntry) => {
        const found = findWeaponEntry(entry);
        if (!found) return;
        if (found.type === 'ranged') {
            updateCharacter(character.id, {
                weapons: weapons.map((w) =>
                    w.id === id
                        ? {
                              ...w,
                              name: entry.name,
                              damage: found.entry.damage,
                              range: String(found.entry.range),
                              ammo: found.entry.ammo,
                              maxAmmo: found.entry.ammo,
                          }
                        : w
                ),
            });
        } else {
            updateCharacter(character.id, {
                weapons: weapons.map((w) =>
                    w.id === id
                        ? {
                              ...w,
                              name: entry.name,
                              damage: found.entry.damage,
                              range: '',
                              ammo: 0,
                              maxAmmo: 0,
                          }
                        : w
                ),
            });
        }
    };

    const handleArmorCatalogSelect = (id: string, entry: CatalogEntry) => {
        const armorEntry = findArmorEntry(entry);
        if (armorEntry) {
            updateCharacter(character.id, {
                armor: armor.map((a) =>
                    a.id === id
                        ? {
                              ...a,
                              name: entry.name,
                              classVal: String(armorEntry.classVal),
                              ar: armorEntry.ar,
                              dex: armorEntry.dexPenalty,
                          }
                        : a
                ),
            });
        }
    };

    const handleInventoryCatalogSelect = (id: string, entry: CatalogEntry) => {
        const source = findInventorySource(entry);
        if (!source) return;

        const base = { text: entry.name, price: '', effects: '', description: '' };

        switch (source.type) {
            case 'toolGear':
                updateCharacter(character.id, {
                    inventory: inventory.map((item) =>
                        item.id === id
                            ? {
                                  ...item,
                                  ...base,
                                  description: source.entry.description,
                                  effects: source.entry.effect,
                                  price: source.entry.cost,
                              }
                            : item
                    ),
                });
                break;
            case 'consumable':
                updateCharacter(character.id, {
                    inventory: inventory.map((item) =>
                        item.id === id
                            ? {
                                  ...item,
                                  ...base,
                                  description: source.entry.description,
                                  effects: `${source.entry.damage} ${source.entry.damageType} | ${source.entry.notes}`,
                                  price: source.entry.cost,
                              }
                            : item
                    ),
                });
                break;
            case 'armor':
                updateCharacter(character.id, {
                    inventory: inventory.map((item) =>
                        item.id === id
                            ? {
                                  ...item,
                                  ...base,
                                  description: source.entry.description,
                                  effects: `Class ${source.entry.classVal} | AR ${source.entry.ar} | Dex ${source.entry.dexPenalty} | ${source.entry.notes}`,
                                  price: source.entry.cost,
                              }
                            : item
                    ),
                });
                break;
            case 'ranged':
                updateCharacter(character.id, {
                    inventory: inventory.map((item) =>
                        item.id === id
                            ? {
                                  ...item,
                                  ...base,
                                  description: source.entry.description,
                                  effects: `${source.entry.damage} | ${source.entry.range}m | ${source.entry.ammo} shots | ${source.entry.notes}`,
                              }
                            : item
                    ),
                });
                break;
            case 'melee':
                updateCharacter(character.id, {
                    inventory: inventory.map((item) =>
                        item.id === id
                            ? {
                                  ...item,
                                  ...base,
                                  description: source.entry.description,
                                  effects: `${source.entry.damage} | ${source.entry.notes}`,
                              }
                            : item
                    ),
                });
                break;
        }
    };

    const handleImplantCatalogSelect = (id: string, entry: CatalogEntry) => {
        const implantEntry = findImplantEntry(entry);
        if (implantEntry?.implantType) {
            updateCharacter(character.id, {
                implants: implants.map((i) =>
                    i.id === id
                        ? {
                              ...i,
                              name: entry.name,
                              type: implantEntry.implantType!,
                              effect: implantEntry.implantEffect ?? '',
                          }
                        : i
                ),
            });
        }
    };

    return {
        inventory,
        armor,
        weapons,
        implants,
        readOnly,
        addInventoryItem,
        removeInventoryItem,
        updateInventoryItem,
        addArmorItem,
        removeArmorItem,
        updateArmorItem,
        addWeaponItem,
        removeWeaponItem,
        updateWeaponItem,
        addImplantItem,
        removeImplantItem,
        updateImplantItem,
        handleWeaponCatalogSelect,
        handleArmorCatalogSelect,
        handleInventoryCatalogSelect,
        handleImplantCatalogSelect,
    };
}
