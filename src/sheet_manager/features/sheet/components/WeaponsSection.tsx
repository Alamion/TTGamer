import { CatalogSuggest, CollapsibleItem } from '../../../components';
import type { CatalogEntry } from '../../../components';
import type { WeaponItem } from '../../../types/character';
import { Plus } from 'lucide-react';
import { buildWeaponsCatalog } from './catalogs';

interface WeaponsSectionProps {
    items: WeaponItem[];
    readOnly: boolean;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, field: keyof WeaponItem, value: string | number) => void;
    onCatalogSelect: (id: string, entry: CatalogEntry) => void;
}

export function WeaponsSection({
    items,
    readOnly,
    onAdd,
    onRemove,
    onUpdate,
    onCatalogSelect,
}: WeaponsSectionProps) {
    const weaponsCatalog = buildWeaponsCatalog();

    return (
        <div className="px-4 pb-4 space-y-2">
            {items.length === 0 ? (
                <p className="text-sm text-textSecondary italic py-2">No weapons yet...</p>
            ) : (
                items.map((item) => (
                    <CollapsibleItem
                        key={item.id}
                        title={
                            <span className="text-sm text-textPrimary truncate">
                                {item.name || 'New Weapon'}
                            </span>
                        }
                        badge={item.maxAmmo > 1 ? `${item.ammo}/${item.maxAmmo}` : undefined}
                        onRemove={readOnly ? undefined : () => onRemove(item.id)}
                        readOnly={readOnly}
                    >
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-textSecondary mb-0.5">
                                    Name
                                </label>
                                <CatalogSuggest
                                    catalog={weaponsCatalog}
                                    value={item.name}
                                    onChange={(val) => onUpdate(item.id, 'name', val)}
                                    onSelect={(entry) => onCatalogSelect(item.id, entry)}
                                    placeholder="Weapon name..."
                                    disabled={readOnly}
                                    className="w-full bg-bgSurface border rounded px-2 py-1 text-sm text-textPrimary"
                                />
                            </div>
                            {(['damage', 'range', 'ammo', 'maxAmmo'] as const).map((field) => {
                                const isAmmo = field === 'ammo' || field === 'maxAmmo';
                                return (
                                    <div key={field}>
                                        <label className="block text-xs text-textSecondary mb-0.5 capitalize">
                                            {field === 'ammo'
                                                ? 'Ammo'
                                                : field === 'maxAmmo'
                                                  ? 'Capacity'
                                                  : field === 'range'
                                                    ? 'Range'
                                                    : 'Damage'}
                                        </label>
                                        <input
                                            type={isAmmo ? 'number' : 'text'}
                                            value={item[field]}
                                            onChange={(e) =>
                                                onUpdate(
                                                    item.id,
                                                    field,
                                                    isAmmo ? Number(e.target.value) : e.target.value
                                                )
                                            }
                                            className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                                            placeholder={
                                                field === 'ammo'
                                                    ? 'Ammo...'
                                                    : field === 'maxAmmo'
                                                      ? 'Capacity...'
                                                      : field === 'range'
                                                        ? 'Rng...'
                                                        : 'Dmg...'
                                            }
                                            aria-label={
                                                field === 'ammo'
                                                    ? 'Ammunition'
                                                    : field === 'maxAmmo'
                                                      ? 'Maximum ammo'
                                                      : field === 'range'
                                                        ? 'Range'
                                                        : 'Damage'
                                            }
                                            min={0}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </CollapsibleItem>
                ))
            )}
            {!readOnly && (
                <button
                    onClick={onAdd}
                    className="flex items-center gap-1 text-sm text-textSecondary hover:text-textSecondary/80 transition-colors"
                    aria-label="Add weapon"
                >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Add Weapon
                </button>
            )}
        </div>
    );
}
