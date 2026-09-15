import type { CatalogEntry } from '../../../components';
import { useCharacter } from '../../../hooks';
import type { EquipmentSectionId } from '../../../systems/templateBindings';
import {
    createEquipmentItem,
    type EquipmentItem,
    updateEquipmentItem,
} from '../body/equipmentItems';
import {
    findArmorEntry,
    findImplantEntry,
    findInventorySource,
    findWeaponEntry,
} from '../data/bodyEquipmentCatalogs';

export function useBodyHandlers() {
    const { character, readOnly, updateCharacter } = useCharacter();
    if (!character) return null;

    const inventory = character.inventory || [];
    const armor = character.armor || [];
    const weapons = character.weapons || [];
    const implants = character.implants || [];

    const addItem = (section: EquipmentSectionId) => {
        const items = (character as unknown as Record<string, unknown[]>)[section] ?? [];
        updateCharacter(character.id, { [section]: [...items, createEquipmentItem(section)] });
    };

    const removeItem = (section: EquipmentSectionId, id: string) => {
        const items =
            (character as unknown as Record<string, Array<{ id: string }>>)[section] ?? [];
        updateCharacter(character.id, { [section]: items.filter((item) => item.id !== id) });
    };

    const updateItem =
        <S extends EquipmentSectionId>(section: S, items: readonly EquipmentItem<S>[]) =>
        (id: string, field: keyof EquipmentItem<S>, value: string | number | boolean) =>
            updateCharacter(character.id, {
                [section]: updateEquipmentItem(section, items, id, String(field), value),
            });

    const addInventoryItem = () => addItem('inventory');
    const removeInventoryItem = (id: string) => removeItem('inventory', id);
    const updateInventoryItem = updateItem('inventory', inventory);

    const addArmorItem = () => addItem('armor');
    const removeArmorItem = (id: string) => removeItem('armor', id);
    const updateArmorItem = updateItem('armor', armor);

    const addWeaponItem = () => addItem('weapons');
    const removeWeaponItem = (id: string) => removeItem('weapons', id);
    const updateWeaponItem = updateItem('weapons', weapons);

    const addImplantItem = () => addItem('implants');
    const removeImplantItem = (id: string) => removeItem('implants', id);
    const updateImplantItem = updateItem('implants', implants);

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
        isMechanical: character.metadata.type === 'droid',
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
