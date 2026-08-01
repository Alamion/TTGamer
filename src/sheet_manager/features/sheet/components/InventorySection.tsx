import { AutoResizeTextarea } from '../../../components/AutoResizeTextarea';
import { Checkbox, CatalogSuggest, CollapsibleItem } from '../../../components';
import type { CatalogEntry } from '../../../components';
import type { Item } from '../../../types/character';
import { Plus } from 'lucide-react';
import { buildInventoryCatalog } from './catalogs';

interface InventorySectionProps {
    items: Item[];
    readOnly: boolean;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, field: keyof Item, value: string | number | boolean) => void;
    onCatalogSelect: (id: string, entry: CatalogEntry) => void;
}

export function InventorySection({
    items,
    readOnly,
    onAdd,
    onRemove,
    onUpdate,
    onCatalogSelect,
}: InventorySectionProps) {
    const inventoryCatalog = buildInventoryCatalog();

    return (
        <div className="px-4 pb-4 space-y-2">
            {items.length === 0 ? (
                <p className="text-sm text-textSecondary italic py-2">No items yet...</p>
            ) : (
                items.map((item) => (
                    <CollapsibleItem
                        key={item.id}
                        title={
                            <span className="text-sm text-textPrimary truncate">
                                {item.text || 'New Item'}
                            </span>
                        }
                        badge={
                            item.maxQuantity > 1
                                ? `${item.quantity}/${item.maxQuantity}`
                                : undefined
                        }
                        onRemove={readOnly ? undefined : () => onRemove(item.id)}
                        readOnly={readOnly}
                    >
                        <div className="space-y-2">
                            <div>
                                <label className="block text-xs text-textSecondary mb-0.5">
                                    Name
                                </label>
                                <CatalogSuggest
                                    catalog={inventoryCatalog}
                                    value={item.text}
                                    onChange={(val) => onUpdate(item.id, 'text', val)}
                                    onSelect={(entry) => onCatalogSelect(item.id, entry)}
                                    placeholder="Item name..."
                                    disabled={readOnly}
                                    className="w-full bg-bgSurface border rounded px-2 py-1 text-sm text-textPrimary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-textSecondary mb-0.5">
                                    Description
                                </label>
                                <AutoResizeTextarea
                                    value={item.description}
                                    onChange={(value) => onUpdate(item.id, 'description', value)}
                                    placeholder="Description..."
                                    readOnly={readOnly}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-textSecondary mb-0.5">
                                    Effects
                                </label>
                                <AutoResizeTextarea
                                    value={item.effects}
                                    onChange={(value) => onUpdate(item.id, 'effects', value)}
                                    placeholder="Effects..."
                                    readOnly={readOnly}
                                />
                            </div>
                            <div className="flex flex-col sm:grid sm:grid-cols-4 gap-2">
                                {(['weight', 'price', 'quantity', 'maxQuantity'] as const).map(
                                    (field) => (
                                        <div
                                            key={field}
                                            className="flex items-center sm:flex-col gap-2 sm:gap-0.5"
                                        >
                                            <label className="text-xs text-textSecondary w-16 sm:w-auto shrink-0 capitalize">
                                                {field === 'maxQuantity' ? 'Max qty' : field}
                                            </label>
                                            <input
                                                type={
                                                    field === 'quantity' || field === 'maxQuantity'
                                                        ? 'number'
                                                        : 'text'
                                                }
                                                value={item[field]}
                                                onChange={(e) =>
                                                    onUpdate(
                                                        item.id,
                                                        field,
                                                        field === 'quantity' ||
                                                            field === 'maxQuantity'
                                                            ? Number(e.target.value)
                                                            : e.target.value
                                                    )
                                                }
                                                className="flex-1 w-full bg-bgSurface border rounded px-2 py-1 text-sm text-textPrimary"
                                                placeholder={`${field === 'maxQuantity' ? 'Max qty...' : `${field.charAt(0).toUpperCase() + field.slice(1)}...`}`}
                                                min={0}
                                                aria-label={
                                                    field === 'maxQuantity'
                                                        ? 'Maximum quantity'
                                                        : `${field} field`
                                                }
                                                readOnly={readOnly}
                                            />
                                        </div>
                                    )
                                )}
                            </div>
                            <Checkbox
                                checked={item.equipped}
                                onChange={(checked) => onUpdate(item.id, 'equipped', checked)}
                                disabled={readOnly}
                                label="Equipped"
                            />
                        </div>
                    </CollapsibleItem>
                ))
            )}
            {!readOnly && (
                <button
                    onClick={onAdd}
                    className="flex items-center gap-1 text-sm text-textSecondary hover:text-textSecondary/80 transition-colors"
                    aria-label="Add inventory item"
                >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Add Item
                </button>
            )}
        </div>
    );
}
