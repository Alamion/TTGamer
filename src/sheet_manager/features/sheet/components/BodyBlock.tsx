import { CollapsibleBlock, SectionCard } from '../../../components';
import type { AccentColor } from '../../../components';
import { DataTable } from '../../../components';
import type { DataTableColumn } from '../../../components';
import { useCharacterStore } from '../../../store/characterStore.ts';
import { useCharacterContext } from '../../../context/CharacterContext.tsx';
import { Plus, X } from 'lucide-react';
import { HealthBlock } from './HealthBlock.tsx';
import type { ArmorItem, WeaponItem, Item } from '../../../types/character.ts';
import { generateId } from '@site/src/shared/utils/random';

interface SectionState {
    inventory: boolean;
    armor: boolean;
    weapons: boolean;
}

interface BodyBlockProps {
    accentColor?: AccentColor;
}

export function BodyBlock({ accentColor = 'primary' }: BodyBlockProps) {
    const { currentCharacter, updateCharacter } = useCharacterStore();
    const { character: contextChar, readOnly } = useCharacterContext();

    const character = contextChar ?? currentCharacter;
    if (!character) return null;

    const inventory = character.inventory || [];
    const armor = character.armor || [];
    const weapons = character.weapons || [];

    const addInventoryItem = () => {
        if (readOnly) return;
        updateCharacter(character.id, {
            inventory: [...inventory, { id: generateId(), text: '' } as Item],
        });
    };

    const removeInventoryItem = (id: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            inventory: inventory.filter((item) => item.id !== id),
        });
    };

    const updateInventoryItem = (id: string, text: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            inventory: inventory.map((item) => (item.id === id ? { ...item, text } : item)),
        });
    };

    const addArmorItem = () => {
        if (readOnly) return;
        updateCharacter(character.id, {
            armor: [
                ...armor,
                { id: generateId(), type: '', classVal: '', ar: '', dex: '' } as ArmorItem,
            ],
        });
    };

    const removeArmorItem = (id: string) => {
        if (readOnly) return;
        updateCharacter(character.id, { armor: armor.filter((item) => item.id !== id) });
    };

    const updateArmorItem = (id: string, field: keyof ArmorItem, value: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            armor: armor.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
        });
    };

    const addWeaponItem = () => {
        if (readOnly) return;
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
        if (readOnly) return;
        updateCharacter(character.id, { weapons: weapons.filter((item) => item.id !== id) });
    };

    const updateWeaponItem = (id: string, field: keyof WeaponItem, value: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            weapons: weapons.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
        });
    };

    const armorColumns: DataTableColumn<ArmorItem>[] = [
        {
            header: 'Armor Type',
            render: (item) => (
                <input
                    type="text"
                    value={item.type}
                    onChange={(e) => updateArmorItem(item.id, 'type', e.target.value)}
                    className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                    placeholder="Type..."
                    aria-label="Armor type"
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

    const weaponColumns: DataTableColumn<WeaponItem>[] = [
        {
            header: 'Weapon',
            render: (item) => (
                <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateWeaponItem(item.id, 'name', e.target.value)}
                    className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                    placeholder="Weapon..."
                    aria-label="Weapon name"
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
        <CollapsibleBlock title="Body" accentColor={accentColor} storageKey="bodyBlock">
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
                                        <textarea
                                            value={item.text}
                                            onChange={(e) =>
                                                updateInventoryItem(item.id, e.target.value)
                                            }
                                            disabled={readOnly}
                                            className="flex-1 bg-bgSurface border rounded px-3 py-2 text-sm text-textPrimary resize-none disabled:opacity-60 disabled:cursor-default"
                                            rows={2}
                                            placeholder="Item description..."
                                            aria-label="Item description"
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
                </div>

                <HealthBlock docsPath={HEALTH_DOCS} />
            </div>
        </CollapsibleBlock>
    );
}
