import { CollapsibleBlock, SectionCard, DataTable, CatalogSuggest } from '../../../components';
import type { AccentColor, DataTableColumn, CatalogEntry } from '../../../components';
import { useCharacter } from '../../../hooks';
import { Plus, X } from 'lucide-react';
import { HealthBlock } from './HealthBlock.tsx';
import type { ArmorItem, WeaponItem, ImplantItem, Item } from '../../../types/character.ts';
import { generateId } from '@site/src/shared/utils/random';
import { RANGED_WEAPONS } from '@site/src/data/rangedWeaponsData';
import type { RangedWeaponEntry } from '@site/src/data/rangedWeaponsData';
import { MELEE_WEAPONS } from '@site/src/data/meleeWeaponsData';
import type { MeleeWeaponEntry } from '@site/src/data/meleeWeaponsData';
import { ARMOR } from '@site/src/data/armorData';
import type { ArmorEntry } from '@site/src/data/armorData';
import { TOOLS_GEAR } from '@site/src/data/toolsGearData';
import type { ToolGearEntry } from '@site/src/data/toolsGearData';
import { CONSUMABLE_WEAPONS } from '@site/src/data/consumableWeaponsData';
import type { ConsumableWeaponEntry } from '@site/src/data/consumableWeaponsData';
import { MERITS_FLAWS } from '@site/src/data/meritsFlawsData';
import type { MeritFlawEntry } from '@site/src/data/meritsFlawsData';

interface SectionState {
    inventory: boolean;
    armor: boolean;
    weapons: boolean;
    implants: boolean;
}

interface BodyBlockProps {
    accentColor?: AccentColor;
}

export function BodyBlock({ accentColor = 'primary' }: BodyBlockProps) {
    const { character, readOnly, updateCharacter } = useCharacter();
    if (!character) return null;

    const inventory = character.inventory || [];
    const armor = character.armor || [];
    const weapons = character.weapons || [];
    const implants = character.implants || [];

    const addInventoryItem = () => {
        updateCharacter(character.id, {
            inventory: [...inventory, { id: generateId(), text: '' } as Item],
        });
    };

    const removeInventoryItem = (id: string) => {
        updateCharacter(character.id, {
            inventory: inventory.filter((item) => item.id !== id),
        });
    };

    const updateInventoryItem = (id: string, text: string) => {
        updateCharacter(character.id, {
            inventory: inventory.map((item) => (item.id === id ? { ...item, text } : item)),
        });
    };

    const addArmorItem = () => {
        updateCharacter(character.id, {
            armor: [
                ...armor,
                { id: generateId(), type: '', classVal: '', ar: '', dex: '' } as ArmorItem,
            ],
        });
    };

    const removeArmorItem = (id: string) => {
        updateCharacter(character.id, { armor: armor.filter((item) => item.id !== id) });
    };

    const updateArmorItem = (id: string, field: keyof ArmorItem, value: string) => {
        updateCharacter(character.id, {
            armor: armor.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
        });
    };

    const addWeaponItem = () => {
        updateCharacter(character.id, {
            weapons: [
                ...weapons,
                {
                    id: generateId(),
                    name: '',
                    damage: '',
                    range: '',
                    ammo: '',
                } as WeaponItem,
            ],
        });
    };

    const removeWeaponItem = (id: string) => {
        updateCharacter(character.id, { weapons: weapons.filter((item) => item.id !== id) });
    };

    const updateWeaponItem = (id: string, field: keyof WeaponItem, value: string) => {
        updateCharacter(character.id, {
            weapons: weapons.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
        });
    };

    const addImplantItem = () => {
        updateCharacter(character.id, {
            implants: [
                ...implants,
                { id: generateId(), name: '', type: '', effect: '' } as ImplantItem,
            ],
        });
    };

    const removeImplantItem = (id: string) => {
        updateCharacter(character.id, { implants: implants.filter((item) => item.id !== id) });
    };

    const updateImplantItem = (id: string, field: keyof ImplantItem, value: string) => {
        updateCharacter(character.id, {
            implants: implants.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
        });
    };

    const weaponsCatalog: CatalogEntry[] = [
        ...RANGED_WEAPONS.map((w: RangedWeaponEntry) => ({
            id: w.id,
            name: w.name,
            subtitle: `${w.damage} | ${w.range}m | ${w.ammo} shots`,
        })),
        ...MELEE_WEAPONS.map((w: MeleeWeaponEntry) => ({
            id: w.id,
            name: w.name,
            subtitle: w.damage,
        })),
    ];

    const armorCatalog: CatalogEntry[] = ARMOR.map((a: ArmorEntry) => ({
        id: a.id,
        name: a.name,
        subtitle: `Class ${a.classVal} | AR ${a.ar} | Dex ${a.dexPenalty}`,
    }));

    const handleWeaponCatalogSelect = (id: string, entry: CatalogEntry) => {
        const ranged = RANGED_WEAPONS.find((w) => w.id === entry.id);
        if (ranged) {
            updateCharacter(character.id, {
                weapons: weapons.map((w) =>
                    w.id === id
                        ? {
                              ...w,
                              name: entry.name,
                              damage: ranged.damage,
                              range: String(ranged.range),
                              ammo: String(ranged.ammo),
                          }
                        : w
                ),
            });
            return;
        }
        const melee = MELEE_WEAPONS.find((w) => w.id === entry.id);
        if (melee) {
            updateCharacter(character.id, {
                weapons: weapons.map((w) =>
                    w.id === id
                        ? { ...w, name: entry.name, damage: melee.damage, range: '', ammo: '' }
                        : w
                ),
            });
        }
    };

    const handleArmorCatalogSelect = (id: string, entry: CatalogEntry) => {
        const armorEntry = ARMOR.find((a) => a.id === entry.id);
        if (armorEntry) {
            updateCharacter(character.id, {
                armor: armor.map((a) =>
                    a.id === id
                        ? {
                              ...a,
                              type: entry.name,
                              classVal: String(armorEntry.classVal),
                              ar: armorEntry.ar,
                              dex: armorEntry.dexPenalty,
                          }
                        : a
                ),
            });
        }
    };

    const inventoryCatalog: CatalogEntry[] = [
        ...TOOLS_GEAR.map((g: ToolGearEntry) => ({
            id: g.id,
            name: g.name,
            subtitle: g.effect,
        })),
        ...CONSUMABLE_WEAPONS.map((w: ConsumableWeaponEntry) => ({
            id: w.id,
            name: w.name,
            subtitle: `[${w.type}] ${w.damage} ${w.damageType}`,
        })),
        ...ARMOR.map((a: ArmorEntry) => ({
            id: a.id,
            name: a.name,
            subtitle: `Class ${a.classVal} | AR ${a.ar}`,
        })),
        ...RANGED_WEAPONS.map((w: RangedWeaponEntry) => ({
            id: w.id,
            name: w.name,
            subtitle: `${w.damage} | ${w.range}m`,
        })),
        ...MELEE_WEAPONS.map((w: MeleeWeaponEntry) => ({
            id: w.id,
            name: w.name,
            subtitle: w.damage,
        })),
    ];

    const implantsCatalog: CatalogEntry[] = MERITS_FLAWS.filter(
        (e) => e.implantType !== undefined
    ).map((e: MeritFlawEntry) => ({
        id: e.id,
        name: e.name,
        subtitle: `[${e.implantType}] ${e.implantEffect}`,
    }));

    const handleInventoryCatalogSelect = (id: string, entry: CatalogEntry) => {
        updateCharacter(character.id, {
            inventory: inventory.map((item) =>
                item.id === id ? { ...item, text: entry.name } : item
            ),
        });
    };

    const handleImplantCatalogSelect = (id: string, entry: CatalogEntry) => {
        const implantEntry = MERITS_FLAWS.find((e) => e.id === entry.id);
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

    const armorColumns: DataTableColumn<ArmorItem>[] = [
        {
            header: 'Armor Type',
            render: (item) => (
                <CatalogSuggest
                    catalog={armorCatalog}
                    value={item.type}
                    onChange={(val) => updateArmorItem(item.id, 'type', val)}
                    onSelect={(entry) => handleArmorCatalogSelect(item.id, entry)}
                    placeholder="Type..."
                    disabled={readOnly}
                    className="w-full bg-bgSurface border rounded px-2 py-1 text-sm text-textPrimary"
                />
            ),
        },
        {
            header: 'Class',
            render: (item) => (
                <input
                    type="text"
                    value={item.classVal}
                    onChange={(e) => updateArmorItem(item.id, 'classVal', e.target.value)}
                    className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                    placeholder="Class..."
                    aria-label="Armor class"
                />
            ),
        },
        {
            header: 'A.R.',
            render: (item) => (
                <input
                    type="text"
                    value={item.ar}
                    onChange={(e) => updateArmorItem(item.id, 'ar', e.target.value)}
                    className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                    placeholder="AR..."
                    aria-label="Armor rating"
                />
            ),
        },
        {
            header: 'Dex',
            render: (item) => (
                <input
                    type="text"
                    value={item.dex}
                    onChange={(e) => updateArmorItem(item.id, 'dex', e.target.value)}
                    className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                    placeholder="Dex..."
                    aria-label="Dexterity penalty"
                />
            ),
        },
    ];

    const implantColumns: DataTableColumn<ImplantItem>[] = [
        {
            header: 'Name',
            render: (item) => (
                <CatalogSuggest
                    catalog={implantsCatalog}
                    value={item.name}
                    onChange={(val) => updateImplantItem(item.id, 'name', val)}
                    onSelect={(entry) => handleImplantCatalogSelect(item.id, entry)}
                    placeholder="Implant name..."
                    disabled={readOnly}
                    className="w-full bg-bgSurface border rounded px-2 py-1 text-sm text-textPrimary"
                />
            ),
        },
        {
            header: 'Type',
            render: (item) => (
                <input
                    type="text"
                    value={item.type}
                    onChange={(e) => updateImplantItem(item.id, 'type', e.target.value)}
                    className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                    placeholder="Limb, Sensory, Uplink..."
                    aria-label="Implant type"
                />
            ),
        },
        {
            header: 'Effect',
            render: (item) => (
                <input
                    type="text"
                    value={item.effect}
                    onChange={(e) => updateImplantItem(item.id, 'effect', e.target.value)}
                    className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                    placeholder="Mechanical effect..."
                    aria-label="Implant effect"
                />
            ),
        },
    ];

    const weaponColumns: DataTableColumn<WeaponItem>[] = [
        {
            header: 'Weapon',
            render: (item) => (
                <CatalogSuggest
                    catalog={weaponsCatalog}
                    value={item.name}
                    onChange={(val) => updateWeaponItem(item.id, 'name', val)}
                    onSelect={(entry) => handleWeaponCatalogSelect(item.id, entry)}
                    placeholder="Weapon..."
                    disabled={readOnly}
                    className="w-full bg-bgSurface border rounded px-2 py-1 text-sm text-textPrimary"
                />
            ),
        },
        {
            header: 'Dmg',
            render: (item) => (
                <input
                    type="text"
                    value={item.damage}
                    onChange={(e) => updateWeaponItem(item.id, 'damage', e.target.value)}
                    className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                    placeholder="Dmg..."
                    aria-label="Damage"
                />
            ),
        },
        {
            header: 'Rng',
            render: (item) => (
                <input
                    type="text"
                    value={item.range}
                    onChange={(e) => updateWeaponItem(item.id, 'range', e.target.value)}
                    className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                    placeholder="Rng..."
                    aria-label="Range"
                />
            ),
        },
        {
            header: 'Ammo',
            render: (item) => (
                <input
                    type="text"
                    value={item.ammo}
                    onChange={(e) => updateWeaponItem(item.id, 'ammo', e.target.value)}
                    className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                    placeholder="Ammo..."
                    aria-label="Ammunition"
                />
            ),
        },
    ];

    const renderCollapsibleSection = (
        section: keyof SectionState,
        title: string,
        content: React.ReactNode,
        docsPath?: string
    ) => (
        <SectionCard title={title} storageKey={`bodyBlock_${section}`} docsPath={docsPath}>
            {content}
        </SectionCard>
    );

    const EQUIPMENT_DOCS = '/docs/star-wars-wod-2e/equipment';
    const HEALTH_DOCS = '/docs/star-wars-wod-2e/combat/health-damage-heal';

    return (
        <CollapsibleBlock
            title="Body"
            accentColor={accentColor}
            storageKey="bodyBlock"
            docsPath="/docs/star-wars-wod-2e/equipment"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-2 space-y-4">
                    {renderCollapsibleSection(
                        'inventory',
                        'Inventory',
                        <div className="px-4 pb-4 space-y-2">
                            {inventory.length === 0 ? (
                                <p className="text-sm text-textSecondary italic py-2">
                                    No items yet...
                                </p>
                            ) : (
                                inventory.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2">
                                        <CatalogSuggest
                                            catalog={inventoryCatalog}
                                            value={item.text}
                                            onChange={(val) => updateInventoryItem(item.id, val)}
                                            onSelect={(entry) =>
                                                handleInventoryCatalogSelect(item.id, entry)
                                            }
                                            placeholder="Item name..."
                                            disabled={readOnly}
                                            className="flex-1 bg-bgSurface border rounded px-3 py-2 text-sm text-textPrimary disabled:opacity-60 disabled:cursor-default"
                                        />
                                        {!readOnly && (
                                            <button
                                                onClick={() => removeInventoryItem(item.id)}
                                                className="text-textSecondary hover:text-error transition-colors"
                                                aria-label="Remove item"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                            {!readOnly && (
                                <button
                                    onClick={addInventoryItem}
                                    className="flex items-center gap-1 text-sm text-textSecondary hover:text-textSecondary/80 transition-colors"
                                    aria-label="Add inventory item"
                                >
                                    <Plus className="w-4 h-4" aria-hidden="true" />
                                    Add Item
                                </button>
                            )}
                        </div>,
                        EQUIPMENT_DOCS
                    )}

                    {renderCollapsibleSection(
                        'armor',
                        'Dressed - Armor',
                        <DataTable
                            columns={armorColumns}
                            items={armor}
                            idKey="id"
                            onAdd={readOnly ? undefined : addArmorItem}
                            onRemove={readOnly ? undefined : removeArmorItem}
                            addLabel="Add Armor"
                            emptyMessage="No armor yet..."
                        />,
                        EQUIPMENT_DOCS
                    )}

                    {renderCollapsibleSection(
                        'weapons',
                        'Dressed - Weapons',
                        <DataTable
                            columns={weaponColumns}
                            items={weapons}
                            idKey="id"
                            onAdd={readOnly ? undefined : addWeaponItem}
                            onRemove={readOnly ? undefined : removeWeaponItem}
                            addLabel="Add Weapon"
                            emptyMessage="No weapons yet..."
                        />,
                        EQUIPMENT_DOCS
                    )}

                    {renderCollapsibleSection(
                        'implants',
                        'Implants & Cyberware',
                        <DataTable
                            columns={implantColumns}
                            items={implants}
                            idKey="id"
                            onAdd={readOnly ? undefined : addImplantItem}
                            onRemove={readOnly ? undefined : removeImplantItem}
                            addLabel="Add Implant"
                            emptyMessage="No implants yet..."
                        />,
                        EQUIPMENT_DOCS
                    )}
                </div>

                <HealthBlock docsPath={HEALTH_DOCS} />
            </div>
        </CollapsibleBlock>
    );
}
