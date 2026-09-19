import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Plus } from 'lucide-react';

import type { CatalogEntry } from '../../../components';
import { CatalogSuggest, Checkbox, CollapsibleItem } from '../../../components';
import { AutoResizeTextarea } from '../../../components';
import type { Item } from '../../../types/character';
import { useItemName } from '../data/itemDisplay';

const inventoryMessages = uiMessages.sheet.items.inventory;

/** Explicit descriptors per inventory stat field (no dynamic message ids). */
const INVENTORY_FIELDS = {
    weight: {
        title: inventoryMessages.weight,
        placeholder: inventoryMessages.weightPlaceholder,
        label: inventoryMessages.weightLabel,
    },
    price: {
        title: inventoryMessages.price,
        placeholder: inventoryMessages.pricePlaceholder,
        label: inventoryMessages.priceLabel,
    },
    quantity: {
        title: inventoryMessages.quantity,
        placeholder: inventoryMessages.quantityPlaceholder,
        label: inventoryMessages.quantityLabel,
    },
    maxQuantity: {
        title: inventoryMessages.maxQuantity,
        placeholder: inventoryMessages.maxQuantityPlaceholder,
        label: inventoryMessages.maxQuantityLabel,
    },
} as const;

interface InventorySectionProps {
    items: Item[];
    readOnly: boolean;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, field: keyof Item, value: string | number | boolean) => void;
    onCatalogSelect: (id: string, entry: CatalogEntry) => void;
    /** Name suggestions; picking one calls `onCatalogSelect`. Empty = free text only. */
    catalog: CatalogEntry[];
}

export function InventorySection({
    items,
    readOnly,
    onAdd,
    onRemove,
    onUpdate,
    onCatalogSelect,
    catalog,
}: InventorySectionProps) {
    const itemName = useItemName();
    return (
        <div className="px-4 pb-4 space-y-2">
            {items.length === 0 ? (
                <p className="text-sm text-textSecondary italic py-2">
                    {translate(uiMessages.sheet.items.inventory.empty)}
                </p>
            ) : (
                items.map((item) => (
                    <CollapsibleItem
                        key={item.id}
                        title={
                            <span className="text-sm text-textPrimary truncate">
                                {itemName(item.text, item.entryRef) ||
                                    translate(uiMessages.sheet.items.inventory.untitled)}
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
                                <span className="block text-xs text-textSecondary mb-0.5">
                                    {translate(uiMessages.sheet.items.name)}
                                </span>
                                <CatalogSuggest
                                    catalog={catalog}
                                    value={itemName(item.text, item.entryRef)}
                                    onChange={(val) => onUpdate(item.id, 'text', val)}
                                    onSelect={(entry) => onCatalogSelect(item.id, entry)}
                                    placeholder={translate(
                                        uiMessages.sheet.items.inventory.namePlaceholder
                                    )}
                                    disabled={readOnly}
                                    className="w-full bg-bgSurface border rounded px-2 py-1 text-sm text-textPrimary"
                                    ariaLabel={translate(
                                        uiMessages.sheet.items.inventory.nameLabel
                                    )}
                                />
                            </div>
                            <div>
                                <span className="block text-xs text-textSecondary mb-0.5">
                                    {translate(uiMessages.sheet.items.inventory.descriptionTitle)}
                                </span>
                                <AutoResizeTextarea
                                    value={item.description}
                                    onChange={(value) => onUpdate(item.id, 'description', value)}
                                    placeholder={translate(
                                        uiMessages.sheet.items.inventory.descriptionPlaceholder
                                    )}
                                    readOnly={readOnly}
                                    ariaLabel={translate(
                                        uiMessages.sheet.items.inventory.descriptionLabel
                                    )}
                                />
                            </div>
                            <div>
                                <span className="block text-xs text-textSecondary mb-0.5">
                                    {translate(uiMessages.sheet.items.inventory.effects)}
                                </span>
                                <AutoResizeTextarea
                                    value={item.effects}
                                    onChange={(value) => onUpdate(item.id, 'effects', value)}
                                    placeholder={translate(
                                        uiMessages.sheet.items.inventory.effectsPlaceholder
                                    )}
                                    readOnly={readOnly}
                                    ariaLabel={translate(
                                        uiMessages.sheet.items.inventory.effectsLabel
                                    )}
                                />
                            </div>
                            <div className="flex flex-col sm:grid sm:grid-cols-4 gap-2">
                                {(['weight', 'price', 'quantity', 'maxQuantity'] as const).map(
                                    (field) => (
                                        <div
                                            key={field}
                                            className="flex items-center sm:flex-col gap-2 sm:gap-0.5"
                                        >
                                            <span className="text-xs text-textSecondary w-16 sm:w-auto shrink-0">
                                                {translate(INVENTORY_FIELDS[field].title)}
                                            </span>
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
                                                placeholder={translate(
                                                    INVENTORY_FIELDS[field].placeholder
                                                )}
                                                min={0}
                                                max={
                                                    field === 'quantity'
                                                        ? item.maxQuantity
                                                        : undefined
                                                }
                                                step={
                                                    field === 'quantity' || field === 'maxQuantity'
                                                        ? 1
                                                        : undefined
                                                }
                                                aria-label={translate(
                                                    INVENTORY_FIELDS[field].label
                                                )}
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
                                label={translate(uiMessages.sheet.items.inventory.equipped)}
                            />
                        </div>
                    </CollapsibleItem>
                ))
            )}
            {!readOnly && (
                <button
                    onClick={onAdd}
                    className="flex items-center gap-1 text-sm text-textSecondary hover:text-textSecondary/80 transition-colors"
                    aria-label={translate(uiMessages.sheet.items.inventory.addLabel)}
                >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    {translate(uiMessages.sheet.items.inventory.add)}
                </button>
            )}
        </div>
    );
}
