import { CatalogSuggest, CollapsibleItem } from '../../../components';
import type { CatalogEntry } from '../../../components';
import type { ArmorItem } from '../../../types/character';
import { Plus } from 'lucide-react';
import { buildArmorCatalog } from './catalogs';

interface ArmorSectionProps {
    items: ArmorItem[];
    readOnly: boolean;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, field: keyof ArmorItem, value: string) => void;
    onCatalogSelect: (id: string, entry: CatalogEntry) => void;
}

export function ArmorSection({
    items,
    readOnly,
    onAdd,
    onRemove,
    onUpdate,
    onCatalogSelect,
}: ArmorSectionProps) {
    const armorCatalog = buildArmorCatalog();

    return (
        <div className="px-4 pb-4 space-y-2">
            {items.length === 0 ? (
                <p className="text-sm text-textSecondary italic py-2">No armor yet...</p>
            ) : (
                items.map((item) => (
                    <CollapsibleItem
                        key={item.id}
                        title={
                            <span className="text-sm text-textPrimary truncate">
                                {item.name || 'New Armor'}
                            </span>
                        }
                        onRemove={readOnly ? undefined : () => onRemove(item.id)}
                        readOnly={readOnly}
                    >
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-textSecondary mb-0.5">
                                    Name
                                </label>
                                <CatalogSuggest
                                    catalog={armorCatalog}
                                    value={item.name}
                                    onChange={(val) => onUpdate(item.id, 'name', val)}
                                    onSelect={(entry) => onCatalogSelect(item.id, entry)}
                                    placeholder="Armor name..."
                                    disabled={readOnly}
                                    className="w-full bg-bgSurface border rounded px-2 py-1 text-sm text-textPrimary"
                                />
                            </div>
                            {(['classVal', 'ar', 'dex'] as const).map((field) => (
                                <div key={field}>
                                    <label className="block text-xs text-textSecondary mb-0.5 capitalize">
                                        {field === 'classVal'
                                            ? 'Class'
                                            : field === 'ar'
                                              ? 'AR'
                                              : 'Dex pen'}
                                    </label>
                                    <input
                                        type="text"
                                        value={item[field]}
                                        onChange={(e) => onUpdate(item.id, field, e.target.value)}
                                        className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                                        placeholder={
                                            field === 'classVal'
                                                ? 'Class...'
                                                : field === 'ar'
                                                  ? 'AR...'
                                                  : 'Dex penalty...'
                                        }
                                        aria-label={
                                            field === 'classVal'
                                                ? 'Armor class'
                                                : field === 'ar'
                                                  ? 'Armor rating'
                                                  : 'Dexterity penalty'
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    </CollapsibleItem>
                ))
            )}
            {!readOnly && (
                <button
                    onClick={onAdd}
                    className="flex items-center gap-1 text-sm text-textSecondary hover:text-textSecondary/80 transition-colors"
                    aria-label="Add armor"
                >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Add Armor
                </button>
            )}
        </div>
    );
}
