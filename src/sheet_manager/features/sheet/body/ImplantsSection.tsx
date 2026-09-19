import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Plus } from 'lucide-react';

import type { CatalogEntry } from '../../../components';
import { CatalogSuggest, CollapsibleItem } from '../../../components';
import { AutoResizeTextarea } from '../../../components';
import type { ImplantItem } from '../../../types/character';

interface ImplantsSectionProps {
    items: ImplantItem[];
    readOnly: boolean;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, field: keyof ImplantItem, value: string) => void;
    onCatalogSelect: (id: string, entry: CatalogEntry) => void;
    /** Name suggestions; picking one calls `onCatalogSelect`. Empty = free text only. */
    catalog: CatalogEntry[];
}

export function ImplantsSection({
    items,
    readOnly,
    onAdd,
    onRemove,
    onUpdate,
    onCatalogSelect,
    catalog,
}: ImplantsSectionProps) {
    return (
        <div className="px-4 pb-4 space-y-2">
            {items.length === 0 ? (
                <p className="text-sm text-textSecondary italic py-2">
                    {translate(uiMessages.sheet.items.implants.empty)}
                </p>
            ) : (
                items.map((item) => (
                    <CollapsibleItem
                        key={item.id}
                        title={
                            <span className="text-sm text-textPrimary truncate">
                                {item.name || translate(uiMessages.sheet.items.implants.untitled)}
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
                                    value={item.name}
                                    onChange={(val) => onUpdate(item.id, 'name', val)}
                                    onSelect={(entry) => onCatalogSelect(item.id, entry)}
                                    placeholder={translate(
                                        uiMessages.sheet.items.implants.namePlaceholder
                                    )}
                                    disabled={readOnly}
                                    className="w-full bg-bgSurface border rounded px-2 py-1 text-sm text-textPrimary"
                                    ariaLabel={translate(uiMessages.sheet.items.implants.nameLabel)}
                                />
                            </div>
                            <div>
                                <span className="block text-xs text-textSecondary mb-0.5">
                                    {translate(uiMessages.sheet.items.implants.type)}
                                </span>
                                <input
                                    type="text"
                                    value={item.type}
                                    onChange={(e) => onUpdate(item.id, 'type', e.target.value)}
                                    className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                                    placeholder={translate(
                                        uiMessages.sheet.items.implants.typePlaceholder
                                    )}
                                    aria-label={translate(
                                        uiMessages.sheet.items.implants.typeLabel
                                    )}
                                />
                            </div>
                            <div>
                                <span className="block text-xs text-textSecondary mb-0.5">
                                    {translate(uiMessages.sheet.items.implants.effect)}
                                </span>
                                <AutoResizeTextarea
                                    value={item.effect}
                                    onChange={(value) => onUpdate(item.id, 'effect', value)}
                                    placeholder={translate(
                                        uiMessages.sheet.items.implants.effectPlaceholder
                                    )}
                                    readOnly={readOnly}
                                    ariaLabel={translate(
                                        uiMessages.sheet.items.implants.effectLabel
                                    )}
                                />
                            </div>
                        </div>
                    </CollapsibleItem>
                ))
            )}
            {!readOnly && (
                <button
                    onClick={onAdd}
                    className="flex items-center gap-1 text-sm text-textSecondary hover:text-textSecondary/80 transition-colors"
                    aria-label={translate(uiMessages.sheet.items.implants.addLabel)}
                >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    {translate(uiMessages.sheet.items.implants.add)}
                </button>
            )}
        </div>
    );
}
