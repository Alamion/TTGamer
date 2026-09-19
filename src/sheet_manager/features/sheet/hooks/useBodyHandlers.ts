import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { CatalogEntry } from '../../../components';
import { useCharacter } from '../../../hooks';
import { catalogEntryText, entryEnumLabel } from '../../../systems/catalogs';
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
    parseEntryRef,
} from '../data/bodyEquipmentCatalogs';

export function useBodyHandlers() {
    const { character, readOnly, updateCharacter } = useCharacter();
    const locale = useDocusaurusContext().i18n.currentLocale;
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

    const refOf = (entry: CatalogEntry) => (parseEntryRef(entry.id) ? entry.id : undefined);

    const handleWeaponCatalogSelect = (id: string, entry: CatalogEntry) => {
        const found = findWeaponEntry(entry);
        if (!found) return;
        const ranged = found.type === 'ranged' ? found.entry : undefined;
        updateCharacter(character.id, {
            weapons: weapons.map((w) =>
                w.id === id
                    ? {
                          ...w,
                          entryRef: refOf(entry),
                          name: found.entry.name,
                          damage: found.entry.damage,
                          range: ranged ? String(ranged.range) : '',
                          ammo: ranged?.ammo ?? 0,
                          maxAmmo: ranged?.ammo ?? 0,
                      }
                    : w
            ),
        });
    };

    const handleArmorCatalogSelect = (id: string, entry: CatalogEntry) => {
        const armorEntry = findArmorEntry(entry);
        if (armorEntry) {
            updateCharacter(character.id, {
                armor: armor.map((a) =>
                    a.id === id
                        ? {
                              ...a,
                              entryRef: refOf(entry),
                              name: armorEntry.name,
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
        const catalogId = parseEntryRef(entry.id)!.catalogId;
        const text = (key: string) => catalogEntryText(catalogId, source.entry, key, locale) ?? '';
        const notes = text('notes');
        const effects = (() => {
            switch (source.type) {
                case 'toolGear':
                    return text('effect');
                case 'consumable':
                    return `${source.entry.damage} ${entryEnumLabel(catalogId, 'damageType', source.entry.damageType, locale)} | ${notes}`;
                case 'armor':
                    return translate(uiMessages.sheet.items.inventoryEffects.armor, {
                        classVal: source.entry.classVal,
                        ar: source.entry.ar,
                        dexPenalty: source.entry.dexPenalty,
                        notes,
                    });
                case 'ranged':
                    return translate(uiMessages.sheet.items.inventoryEffects.ranged, {
                        damage: source.entry.damage,
                        range: source.entry.range,
                        ammo: source.entry.ammo,
                        notes,
                    });
                case 'melee':
                    return `${source.entry.damage} | ${notes}`;
            }
        })();
        const price = 'cost' in source.entry ? source.entry.cost : '';
        updateCharacter(character.id, {
            inventory: inventory.map((item) =>
                item.id === id
                    ? {
                          ...item,
                          entryRef: refOf(entry),
                          text: source.entry.name,
                          description: text('description'),
                          effects,
                          price,
                      }
                    : item
            ),
        });
    };

    const handleImplantCatalogSelect = (id: string, entry: CatalogEntry) => {
        const implantEntry = findImplantEntry(entry);
        if (implantEntry?.implantType) {
            updateCharacter(character.id, {
                implants: implants.map((i) =>
                    i.id === id
                        ? {
                              ...i,
                              entryRef: refOf(entry),
                              name: implantEntry.name,
                              type: entryEnumLabel(
                                  'merits-flaws',
                                  'implantType',
                                  implantEntry.implantType!,
                                  locale
                              ),
                              effect:
                                  catalogEntryText(
                                      'merits-flaws',
                                      implantEntry,
                                      'implantEffect',
                                      locale
                                  ) ?? '',
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
