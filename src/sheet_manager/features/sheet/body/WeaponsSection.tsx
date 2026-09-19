import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Plus } from 'lucide-react';

import type { CatalogEntry } from '../../../components';
import { CatalogSuggest, CollapsibleItem } from '../../../components';
import type { WeaponItem } from '../../../types/character';
import { useItemName } from '../data/itemDisplay';

const weaponMessages = uiMessages.sheet.items.weapons;

/** Explicit descriptors per weapon field (no dynamic message ids). */
const WEAPON_FIELDS = {
    damage: {
        title: weaponMessages.damage,
        placeholder: weaponMessages.damagePlaceholder,
        label: weaponMessages.damageLabel,
    },
    range: {
        title: weaponMessages.range,
        placeholder: weaponMessages.rangePlaceholder,
        label: weaponMessages.rangeLabel,
    },
    ammo: {
        title: weaponMessages.ammo,
        placeholder: weaponMessages.ammoPlaceholder,
        label: weaponMessages.ammoLabel,
    },
    maxAmmo: {
        title: weaponMessages.capacity,
        placeholder: weaponMessages.capacityPlaceholder,
        label: weaponMessages.capacityLabel,
    },
} as const;

interface WeaponsSectionProps {
    items: WeaponItem[];
    readOnly: boolean;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, field: keyof WeaponItem, value: string | number) => void;
    onCatalogSelect: (id: string, entry: CatalogEntry) => void;
    /** Name suggestions; picking one calls `onCatalogSelect`. Empty = free text only. */
    catalog: CatalogEntry[];
}

export function WeaponsSection({
    items,
    readOnly,
    onAdd,
    onRemove,
    onUpdate,
    onCatalogSelect,
    catalog,
}: WeaponsSectionProps) {
    const itemName = useItemName();
    return (
        <div className="px-4 pb-4 space-y-2">
            {items.length === 0 ? (
                <p className="text-sm text-textSecondary italic py-2">
                    {translate(uiMessages.sheet.items.weapons.empty)}
                </p>
            ) : (
                items.map((item) => (
                    <CollapsibleItem
                        key={item.id}
                        title={
                            <span className="text-sm text-textPrimary truncate">
                                {itemName(item.name, item.entryRef) ||
                                    translate(uiMessages.sheet.items.weapons.untitled)}
                            </span>
                        }
                        badge={item.maxAmmo > 1 ? `${item.ammo}/${item.maxAmmo}` : undefined}
                        onRemove={readOnly ? undefined : () => onRemove(item.id)}
                        readOnly={readOnly}
                    >
                        <div className="space-y-3">
                            <div>
                                <span className="block text-xs text-textSecondary mb-0.5">
                                    {translate(uiMessages.sheet.items.name)}
                                </span>
                                <CatalogSuggest
                                    catalog={catalog}
                                    value={itemName(item.name, item.entryRef)}
                                    onChange={(val) => onUpdate(item.id, 'name', val)}
                                    onSelect={(entry) => onCatalogSelect(item.id, entry)}
                                    placeholder={translate(
                                        uiMessages.sheet.items.weapons.namePlaceholder
                                    )}
                                    disabled={readOnly}
                                    className="w-full bg-bgSurface border rounded px-2 py-1 text-sm text-textPrimary"
                                    ariaLabel={translate(uiMessages.sheet.items.weapons.nameLabel)}
                                />
                            </div>
                            {(['damage', 'range', 'ammo', 'maxAmmo'] as const).map((field) => {
                                const isAmmo = field === 'ammo' || field === 'maxAmmo';
                                return (
                                    <div key={field}>
                                        <span className="block text-xs text-textSecondary mb-0.5">
                                            {translate(WEAPON_FIELDS[field].title)}
                                        </span>
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
                                            placeholder={translate(
                                                WEAPON_FIELDS[field].placeholder
                                            )}
                                            aria-label={translate(WEAPON_FIELDS[field].label)}
                                            min={0}
                                            max={field === 'ammo' ? item.maxAmmo : undefined}
                                            step={isAmmo ? 1 : undefined}
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
                    aria-label={translate(uiMessages.sheet.items.weapons.addLabel)}
                >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    {translate(uiMessages.sheet.items.weapons.add)}
                </button>
            )}
        </div>
    );
}
