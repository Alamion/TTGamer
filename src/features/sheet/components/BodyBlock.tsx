import { useCharacterStore } from '../../../store/characterStore';
import { useExpandedState, useLocalStorageState } from '../../../hooks';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import type { ConditionMark } from '../../../types/character';

interface ArmorItem {
    id: string;
    type: string;
    classVal: string;
    ar: string;
    dex: string;
}

interface WeaponItem {
    id: string;
    name: string;
    damage: string;
    range: string;
    ammo: string;
}

const HEALTH_LEVELS = [
    { name: 'Bruised', penalty: 0 },
    { name: 'Hurt', penalty: -1 },
    { name: 'Injured', penalty: -2 },
    { name: 'Wounded', penalty: -3 },
    { name: 'Mauled', penalty: -4 },
    { name: 'Crippled', penalty: -5 },
    { name: 'Incapacitated', penalty: 0 },
] as const;

const NEXT_MARK: Record<ConditionMark, ConditionMark> = {
    empty: 'slash',
    slash: 'cross',
    cross: 'empty',
};

const MARK_SYMBOLS: Record<ConditionMark, string> = {
    empty: '',
    slash: '/',
    cross: 'X',
};

export function BodyBlock() {
    const [isExpanded, toggleExpanded] = useExpandedState('bodyBlock', true);
    const { currentCharacter, updateCharacter } = useCharacterStore();
    const [expandedSections, setExpandedSections] = useLocalStorageState('bodyBlock_sections', {
        inventory: true,
        armor: false,
        weapons: false,
    });

    if (!currentCharacter) return null;

    const inventory = currentCharacter.inventory || [];
    const armor = currentCharacter.armor || [];
    const weapons = currentCharacter.weapons || [];

    const toggleSection = (section: 'inventory' | 'armor' | 'weapons') => {
        setExpandedSections({ ...expandedSections, [section]: !expandedSections[section] });
    };

    const handleHealthChange = (index: number, mark: ConditionMark) => {
        const newLevels = [...currentCharacter.health.levels];
        newLevels[index] = NEXT_MARK[mark];
        updateCharacter(currentCharacter.id, {
            health: { levels: newLevels },
        });
    };

    const addInventoryItem = () => {
        updateCharacter(currentCharacter.id, {
            inventory: [...inventory, { id: crypto.randomUUID(), text: '' }],
        });
    };

    const removeInventoryItem = (id: string) => {
        updateCharacter(currentCharacter.id, {
            inventory: inventory.filter((item) => item.id !== id),
        });
    };

    const updateInventoryItem = (id: string, text: string) => {
        updateCharacter(currentCharacter.id, {
            inventory: inventory.map((item) => (item.id === id ? { ...item, text } : item)),
        });
    };

    const addArmorItem = () => {
        updateCharacter(currentCharacter.id, {
            armor: [...armor, { id: crypto.randomUUID(), type: '', classVal: '', ar: '', dex: '' }],
        });
    };

    const removeArmorItem = (id: string) => {
        updateCharacter(currentCharacter.id, { armor: armor.filter((item) => item.id !== id) });
    };

    const updateArmorItem = (id: string, field: keyof ArmorItem, value: string) => {
        updateCharacter(currentCharacter.id, {
            armor: armor.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
        });
    };

    const addWeaponItem = () => {
        updateCharacter(currentCharacter.id, {
            weapons: [
                ...weapons,
                { id: crypto.randomUUID(), name: '', damage: '', range: '', ammo: '' },
            ],
        });
    };

    const removeWeaponItem = (id: string) => {
        updateCharacter(currentCharacter.id, { weapons: weapons.filter((item) => item.id !== id) });
    };

    const updateWeaponItem = (id: string, field: keyof WeaponItem, value: string) => {
        updateCharacter(currentCharacter.id, {
            weapons: weapons.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
        });
    };

    return (
        <div className="space-y-6">
            <button onClick={toggleExpanded} className="w-full flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                    <span className="w-1 h-6 bg-cyber-yellow rounded-full" />
                    Body
                </h2>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
            </button>

            {isExpanded && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-4">
                        <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleSection('inventory')}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
                            >
                                <h3 className="text-cyber-yellow text-sm font-semibold uppercase tracking-wider">
                                    Inventory
                                </h3>
                                {expandedSections.inventory ? (
                                    <ChevronUp className="w-5 h-5 text-slate-400" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                )}
                            </button>
                            {expandedSections.inventory && (
                                <div className="px-4 pb-4 space-y-2">
                                    {inventory.map((item) => (
                                        <div key={item.id} className="flex items-center gap-2">
                                            <textarea
                                                value={item.text}
                                                onChange={(e) =>
                                                    updateInventoryItem(item.id, e.target.value)
                                                }
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:border-hologram-blue focus:outline-none resize-none"
                                                rows={2}
                                                placeholder="Item description..."
                                            />
                                            <button
                                                onClick={() => removeInventoryItem(item.id)}
                                                className="text-slate-500 hover:text-rebel-red transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={addInventoryItem}
                                        className="flex items-center gap-1 text-sm text-cyber-yellow hover:text-cyber-yellow/80 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Item
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleSection('armor')}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
                            >
                                <h3 className="text-cyber-yellow text-sm font-semibold uppercase tracking-wider">
                                    Dressed - Armor
                                </h3>
                                {expandedSections.armor ? (
                                    <ChevronUp className="w-5 h-5 text-slate-400" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                )}
                            </button>
                            {expandedSections.armor && (
                                <div className="px-4 pb-4">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-slate-500 text-xs">
                                                <th className="text-left py-2">Armor Type</th>
                                                <th className="text-left py-2">Class</th>
                                                <th className="text-left py-2">A.R.</th>
                                                <th className="text-left py-2">Dex</th>
                                                <th className="w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {armor.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="py-1">
                                                        <input
                                                            type="text"
                                                            value={item.type}
                                                            onChange={(e) =>
                                                                updateArmorItem(
                                                                    item.id,
                                                                    'type',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                                                            placeholder="Type..."
                                                        />
                                                    </td>
                                                    <td className="py-1">
                                                        <input
                                                            type="text"
                                                            value={item.classVal}
                                                            onChange={(e) =>
                                                                updateArmorItem(
                                                                    item.id,
                                                                    'classVal',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                                                            placeholder="Class..."
                                                        />
                                                    </td>
                                                    <td className="py-1">
                                                        <input
                                                            type="text"
                                                            value={item.ar}
                                                            onChange={(e) =>
                                                                updateArmorItem(
                                                                    item.id,
                                                                    'ar',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                                                            placeholder="AR..."
                                                        />
                                                    </td>
                                                    <td className="py-1">
                                                        <input
                                                            type="text"
                                                            value={item.dex}
                                                            onChange={(e) =>
                                                                updateArmorItem(
                                                                    item.id,
                                                                    'dex',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                                                            placeholder="Dex..."
                                                        />
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={() => removeArmorItem(item.id)}
                                                            className="text-slate-500 hover:text-rebel-red"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button
                                        onClick={addArmorItem}
                                        className="flex items-center gap-1 text-sm text-cyber-yellow hover:text-cyber-yellow/80 transition-colors mt-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Armor
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleSection('weapons')}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
                            >
                                <h3 className="text-cyber-yellow text-sm font-semibold uppercase tracking-wider">
                                    Dressed - Weapons
                                </h3>
                                {expandedSections.weapons ? (
                                    <ChevronUp className="w-5 h-5 text-slate-400" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                )}
                            </button>
                            {expandedSections.weapons && (
                                <div className="px-4 pb-4">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-slate-500 text-xs">
                                                <th className="text-left py-2">Weapon</th>
                                                <th className="text-left py-2">Dmg</th>
                                                <th className="text-left py-2">Rng</th>
                                                <th className="text-left py-2">Ammo</th>
                                                <th className="w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {weapons.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="py-1">
                                                        <input
                                                            type="text"
                                                            value={item.name}
                                                            onChange={(e) =>
                                                                updateWeaponItem(
                                                                    item.id,
                                                                    'name',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                                                            placeholder="Weapon..."
                                                        />
                                                    </td>
                                                    <td className="py-1">
                                                        <input
                                                            type="text"
                                                            value={item.damage}
                                                            onChange={(e) =>
                                                                updateWeaponItem(
                                                                    item.id,
                                                                    'damage',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                                                            placeholder="Dmg..."
                                                        />
                                                    </td>
                                                    <td className="py-1">
                                                        <input
                                                            type="text"
                                                            value={item.range}
                                                            onChange={(e) =>
                                                                updateWeaponItem(
                                                                    item.id,
                                                                    'range',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                                                            placeholder="Rng..."
                                                        />
                                                    </td>
                                                    <td className="py-1">
                                                        <input
                                                            type="text"
                                                            value={item.ammo}
                                                            onChange={(e) =>
                                                                updateWeaponItem(
                                                                    item.id,
                                                                    'ammo',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                                                            placeholder="Ammo..."
                                                        />
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={() =>
                                                                removeWeaponItem(item.id)
                                                            }
                                                            className="text-slate-500 hover:text-rebel-red"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button
                                        onClick={addWeaponItem}
                                        className="flex items-center gap-1 text-sm text-cyber-yellow hover:text-cyber-yellow/80 transition-colors mt-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Weapon
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                        <h3 className="text-cyber-yellow text-sm font-semibold uppercase tracking-wider mb-4">
                            Health
                        </h3>

                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-slate-500 uppercase">
                                    <th className="text-right pr-4 pb-2">Level</th>
                                    <th className="w-12 pb-2 text-center">Penalty</th>
                                    <th className="w-20 pb-2 text-center">Damage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {HEALTH_LEVELS.map((level, index) => {
                                    const mark = currentCharacter.health.levels?.[index] ?? 'empty';
                                    const isIncapacitated = level.name === 'Incapacitated';

                                    return (
                                        <tr
                                            key={level.name}
                                            className={`
                                         border-t border-slate-700/50
                                         ${mark === 'cross' ? 'text-rebel-red' : 'text-slate-400'}
                                     `}
                                        >
                                            <td
                                                className={`py-1 pr-4 text-right ${isIncapacitated ? 'font-semibold' : ''}`}
                                            >
                                                {level.name}
                                            </td>
                                            <td className="py-1 w-12 text-center text-xs text-slate-600">
                                                {level.penalty !== 0 ? `${level.penalty}` : '—'}
                                            </td>
                                            <td className="py-1 w-20 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleHealthChange(index, mark)}
                                                    className={`
                                                 w-8 h-8 mx-auto flex items-center justify-center border-2 rounded font-mono font-bold transition-all duration-200
                                                 ${
                                                     mark === 'cross'
                                                         ? 'bg-rebel-red border-rebel-red text-white'
                                                         : mark === 'slash'
                                                           ? 'bg-slate-600 border-slate-600 text-slate-200'
                                                           : 'bg-transparent border-slate-600 text-slate-500 hover:border-slate-400 hover:text-slate-300'
                                                 }
                                             `}
                                                    aria-label={`${level.name}: ${MARK_SYMBOLS[mark] || 'empty'}`}
                                                >
                                                    {MARK_SYMBOLS[mark]}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
