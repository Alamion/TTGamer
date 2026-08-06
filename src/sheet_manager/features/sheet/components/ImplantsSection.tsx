import { Plus } from 'lucide-react';

import type { CatalogEntry } from '../../../components';
import { CatalogSuggest, CollapsibleItem } from '../../../components';
import { AutoResizeTextarea } from '../../../components/AutoResizeTextarea';
import type { ImplantItem } from '../../../types/character';
import { buildImplantsCatalog } from './catalogs';

interface ImplantsSectionProps {
    items: ImplantItem[];
    readOnly: boolean;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, field: keyof ImplantItem, value: string) => void;
    onCatalogSelect: (id: string, entry: CatalogEntry) => void;
}

export function ImplantsSection({
    items,
    readOnly,
    onAdd,
    onRemove,
    onUpdate,
    onCatalogSelect,
}: ImplantsSectionProps) {
    const implantsCatalog = buildImplantsCatalog();

    return (
        <div className="px-4 pb-4 space-y-2">
            {items.length === 0 ? (
                <p className="text-sm text-textSecondary italic py-2">No implants yet...</p>
            ) : (
                items.map((item) => (
                    <CollapsibleItem
                        key={item.id}
                        title={
                            <span className="text-sm text-textPrimary truncate">
                                {item.name || 'New Implant'}
                            </span>
                        }
                        onRemove={readOnly ? undefined : () => onRemove(item.id)}
                        readOnly={readOnly}
                    >
                        <div className="space-y-3">
                            <div>
                                <span className="block text-xs text-textSecondary mb-0.5">
                                    Name
                                </span>
                                <CatalogSuggest
                                    catalog={implantsCatalog}
                                    value={item.name}
                                    onChange={(val) => onUpdate(item.id, 'name', val)}
                                    onSelect={(entry) => onCatalogSelect(item.id, entry)}
                                    placeholder="Implant name..."
                                    disabled={readOnly}
                                    className="w-full bg-bgSurface border rounded px-2 py-1 text-sm text-textPrimary"
                                    ariaLabel="Implant name"
                                />
                            </div>
                            <div>
                                <span className="block text-xs text-textSecondary mb-0.5">
                                    Type
                                </span>
                                <input
                                    type="text"
                                    value={item.type}
                                    onChange={(e) => onUpdate(item.id, 'type', e.target.value)}
                                    className="w-full bg-bgSurface border rounded px-2 py-1 text-textPrimary"
                                    placeholder="Limb, Sensory, Uplink..."
                                    aria-label="Implant type"
                                />
                            </div>
                            <div>
                                <span className="block text-xs text-textSecondary mb-0.5">
                                    Effect
                                </span>
                                <AutoResizeTextarea
                                    value={item.effect}
                                    onChange={(value) => onUpdate(item.id, 'effect', value)}
                                    placeholder="Mechanical effect..."
                                    readOnly={readOnly}
                                    ariaLabel="Implant effect"
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
                    aria-label="Add implant"
                >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Add Implant
                </button>
            )}
        </div>
    );
}
