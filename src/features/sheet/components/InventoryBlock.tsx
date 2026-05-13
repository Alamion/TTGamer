import { useState } from 'react';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

interface InventoryItem {
  id: string;
  text: string;
}

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

export function InventoryBlock() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [armor, setArmor] = useState<ArmorItem[]>([]);
  const [weapons, setWeapons] = useState<WeaponItem[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    inventory: true,
    armor: false,
    weapons: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections({ ...expandedSections, [section]: !expandedSections[section] });
  };

  const addInventoryItem = () => {
    setInventory([...inventory, { id: crypto.randomUUID(), text: '' }]);
  };

  const removeInventoryItem = (id: string) => {
    setInventory(inventory.filter((item) => item.id !== id));
  };

  const updateInventoryItem = (id: string, text: string) => {
    setInventory(inventory.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const addArmorItem = () => {
    setArmor([...armor, { id: crypto.randomUUID(), type: '', classVal: '', ar: '', dex: '' }]);
  };

  const removeArmorItem = (id: string) => {
    setArmor(armor.filter((item) => item.id !== id));
  };

  const updateArmorItem = (id: string, field: keyof ArmorItem, value: string) => {
    setArmor(armor.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addWeaponItem = () => {
    setWeapons([
      ...weapons,
      { id: crypto.randomUUID(), name: '', damage: '', range: '', ammo: '' },
    ]);
  };

  const removeWeaponItem = (id: string) => {
    setWeapons(weapons.filter((item) => item.id !== id));
  };

  const updateWeaponItem = (id: string, field: keyof WeaponItem, value: string) => {
    setWeapons(weapons.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('inventory')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
        >
          <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">
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
                  onChange={(e) => updateInventoryItem(item.id, e.target.value)}
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
              className="flex items-center gap-1 text-sm text-hologram-blue hover:text-hologram-blue/80 transition-colors"
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
          <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">
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
                        onChange={(e) => updateArmorItem(item.id, 'type', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                        placeholder="Type..."
                      />
                    </td>
                    <td className="py-1">
                      <input
                        type="text"
                        value={item.classVal}
                        onChange={(e) => updateArmorItem(item.id, 'classVal', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                        placeholder="Class..."
                      />
                    </td>
                    <td className="py-1">
                      <input
                        type="text"
                        value={item.ar}
                        onChange={(e) => updateArmorItem(item.id, 'ar', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                        placeholder="AR..."
                      />
                    </td>
                    <td className="py-1">
                      <input
                        type="text"
                        value={item.dex}
                        onChange={(e) => updateArmorItem(item.id, 'dex', e.target.value)}
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
              className="flex items-center gap-1 text-sm text-hologram-blue hover:text-hologram-blue/80 transition-colors mt-2"
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
          <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">
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
                        onChange={(e) => updateWeaponItem(item.id, 'name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                        placeholder="Weapon..."
                      />
                    </td>
                    <td className="py-1">
                      <input
                        type="text"
                        value={item.damage}
                        onChange={(e) => updateWeaponItem(item.id, 'damage', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                        placeholder="Dmg..."
                      />
                    </td>
                    <td className="py-1">
                      <input
                        type="text"
                        value={item.range}
                        onChange={(e) => updateWeaponItem(item.id, 'range', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                        placeholder="Rng..."
                      />
                    </td>
                    <td className="py-1">
                      <input
                        type="text"
                        value={item.ammo}
                        onChange={(e) => updateWeaponItem(item.id, 'ammo', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                        placeholder="Ammo..."
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => removeWeaponItem(item.id)}
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
              className="flex items-center gap-1 text-sm text-hologram-blue hover:text-hologram-blue/80 transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              Add Weapon
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
