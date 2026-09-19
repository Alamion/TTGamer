import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Plus, X } from 'lucide-react';

import type { CatalogEntry } from '../controls/CatalogSuggest.tsx';
import { CatalogSuggest } from '../controls/CatalogSuggest.tsx';
import { SectionCard } from '../sections/SectionCard.tsx';

interface MeritFlawItem {
    id: string;
    points: number;
    label: string;
}

interface MeritFlawListProps {
    title: string;
    items: MeritFlawItem[];
    onAdd: () => void;
    onRemove: (id: string) => void;
    onChange: (id: string, points: number, label: string) => void;
    isMerit?: boolean;
    disabled?: boolean;
    docsPath?: string;
    catalog?: CatalogEntry[];
    onCatalogSelect?: (id: string, entry: CatalogEntry) => void;
    /** Column layout for the entry grid, 1–4 (feature 006 FR-17). */
    columns?: 1 | 2 | 3 | 4;
    /** Show the title header (the title still names the add button). */
    showTitle?: boolean;
    /** Wrap the list in its own bordered card. */
    framed?: boolean;
}

const meritColumns = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
};

export function MeritFlawList({
    title,
    items,
    onAdd,
    onRemove,
    onChange,
    isMerit = true,
    disabled = false,
    docsPath,
    catalog,
    onCatalogSelect,
    columns = 1,
    showTitle = true,
    framed = true,
}: MeritFlawListProps) {
    const content = (
        <>
            <div
                className={
                    columns > 1 ? `grid gap-x-4 gap-y-2 ${meritColumns[columns]}` : 'space-y-2'
                }
            >
                {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                        <span className="font-mono font-bold text-md text-textPrimary">
                            {isMerit ? '+' : '-'}
                        </span>
                        <input
                            type="number"
                            value={item.points}
                            onChange={(e) =>
                                onChange(item.id, parseInt(e.target.value) || 0, item.label)
                            }
                            disabled={disabled}
                            className="w-8 bg-bgSurface border rounded px-2 py-0.5 text-center text-sm font-mono text-textPrimary"
                            min={1}
                            max={5}
                        />
                        {catalog && onCatalogSelect ? (
                            <CatalogSuggest
                                catalog={catalog}
                                value={item.label}
                                onChange={(label) => onChange(item.id, item.points, label)}
                                onSelect={(entry) => onCatalogSelect(item.id, entry)}
                                placeholder={translate(
                                    isMerit
                                        ? uiMessages.sheet.controls.meritFlaw.meritPlaceholder
                                        : uiMessages.sheet.controls.meritFlaw.flawPlaceholder
                                )}
                                disabled={disabled}
                                className="flex-1 bg-bgSurface border rounded px-3 py-1 text-sm text-textPrimary"
                            />
                        ) : (
                            <input
                                type="text"
                                value={item.label}
                                onChange={(e) => onChange(item.id, item.points, e.target.value)}
                                disabled={disabled}
                                className="flex-1 bg-bgSurface border rounded px-3 py-1 text-sm text-textPrimary"
                                placeholder={translate(
                                    isMerit
                                        ? uiMessages.sheet.controls.meritFlaw.meritPlaceholder
                                        : uiMessages.sheet.controls.meritFlaw.flawPlaceholder
                                )}
                            />
                        )}
                        <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            disabled={disabled}
                            className="text-textSecondary hover:text-error transition-colors p-1"
                            aria-label={translate(uiMessages.sheet.controls.meritFlaw.remove)}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={onAdd}
                disabled={disabled}
                className="flex items-center gap-1 text-sm mt-3 py-1 transition-colors text-textPrimary hover:opacity-80"
            >
                <Plus className="w-4 h-4" />
                {translate(
                    isMerit
                        ? uiMessages.sheet.controls.meritFlaw.addMerit
                        : uiMessages.sheet.controls.meritFlaw.addFlaw
                )}
            </button>
        </>
    );
    if (!framed) return content;
    return (
        <SectionCard title={showTitle ? title : undefined} docsPath={docsPath}>
            {content}
        </SectionCard>
    );
}
