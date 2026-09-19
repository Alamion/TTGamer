import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Plus } from 'lucide-react';

import type { CatalogEntry } from '../../../components';
import { CatalogSuggest, CollapsibleItem } from '../../../components';
import type { ArmorItem } from '../../../types/character';
import { useItemName } from '../data/itemDisplay';

const armorMessages = uiMessages.sheet.items.armor;

/** Explicit descriptors per armor field (no dynamic message ids). */
const ARMOR_FIELDS = {
    classVal: {
        title: armorMessages.class,
        placeholder: armorMessages.classPlaceholder,
        label: armorMessages.classLabel,
    },
    ar: {
        title: armorMessages.rating,
        placeholder: armorMessages.ratingPlaceholder,
        label: armorMessages.ratingLabel,
    },
    dex: {
        title: armorMessages.dexPenalty,
        placeholder: armorMessages.dexPenaltyPlaceholder,
        label: armorMessages.dexPenaltyLabel,
    },
} as const;

interface ArmorSectionProps {
    items: ArmorItem[];
    readOnly: boolean;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, field: keyof ArmorItem, value: string) => void;
    onCatalogSelect: (id: string, entry: CatalogEntry) => void;
    /** Name suggestions; picking one calls `onCatalogSelect`. Empty = free text only. */
    catalog: CatalogEntry[];
}

export function ArmorSection({
    items,
    readOnly,
    onAdd,
    onRemove,
    onUpdate,
    onCatalogSelect,
    catalog,
}: ArmorSectionProps) {
    const itemName = useItemName();
    return (
        <div className="px-4 pb-4 space-y-2">
            {items.length === 0 ? (
                <p className="text-sm text-textSecondary italic py-2">
                    {translate(uiMessages.sheet.items.armor.empty)}
                </p>
            ) : (
                items.map((item) => (
                    <CollapsibleItem
                        key={item.id}
                        title={
                            <span className="text-sm text-textPrimary truncate">
                                {itemName(item.name, item.entryRef) ||
                                    translate(uiMessages.sheet.items.armor.untitled)}
                            </span>
                        }
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
                                        uiMessages.sheet.items.armor.namePlaceholder
                                    )}
                                    disabled={readOnly}
                                    className="w-full bg-bgSurface border rounded px-2 py-1 text-sm text-textPrimary"
                                    ariaLabel={translate(uiMessages.sheet.items.armor.nameLabel)}
                                />
                            </div>
                            {(['classVal', 'ar', 'dex'] as const).map((field) => (
                                <div key={field}>
                                    <span className="block text-xs text-textSecondary mb-0.5">
                                        {translate(ARMOR_FIELDS[field].title)}
                                    </span>
                                    <input
                                        type="text"
                                        value={item[field]}
                                        onChange={(e) => onUpdate(item.id, field, e.target.value)}
                                        className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                                        placeholder={translate(ARMOR_FIELDS[field].placeholder)}
                                        aria-label={translate(ARMOR_FIELDS[field].label)}
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
                    aria-label={translate(uiMessages.sheet.items.armor.addLabel)}
                >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    {translate(uiMessages.sheet.items.armor.add)}
                </button>
            )}
        </div>
    );
}
