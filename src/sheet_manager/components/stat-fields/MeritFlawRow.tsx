import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { NumberInput } from '@site/src/shared/components/NumberInput';
import { Plus, X } from 'lucide-react';

import type { CatalogEntry } from '../controls/CatalogSuggest.tsx';
import { CatalogSuggest } from '../controls/CatalogSuggest.tsx';
import { fallbackRowName, RowMoveControls, rowMoveKeys } from '../controls/RowMoveControls';
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
    /** Book word for a positive entry: V5 lines call them Advantages, Star Wars calls them Merits. */
    positiveTerm?: 'merit' | 'advantage';
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
    /** Moves the row at `from` to `to` (spec 022); without it the rows have no order controls. */
    onMove?: (from: number, to: number) => void;
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
    positiveTerm = 'merit',
    disabled = false,
    docsPath,
    catalog,
    onCatalogSelect,
    columns = 1,
    showTitle = true,
    framed = true,
    onMove,
}: MeritFlawListProps) {
    const movable = onMove !== undefined && !disabled && items.length > 1;
    const messages = uiMessages.sheet.controls.meritFlaw;
    const advantage = positiveTerm === 'advantage';
    const positivePlaceholder = advantage
        ? messages.advantagePlaceholder
        : messages.meritPlaceholder;
    const negativePlaceholder = messages.flawPlaceholder;
    const addPositive = advantage ? messages.addAdvantage : messages.addMerit;
    const addNegative = messages.addFlaw;
    const content = (
        <>
            <div
                data-reorder-list=""
                className={
                    columns > 1 ? `grid gap-x-4 gap-y-2 ${meritColumns[columns]}` : 'space-y-2'
                }
            >
                {items.map((item, index) => (
                    // Alt+↑/↓ from the row's own controls bubble here (spec 022).
                    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                    <div
                        key={item.id}
                        data-reorder-row=""
                        onKeyDown={
                            movable
                                ? rowMoveKeys(index, items.length, (to) => onMove(index, to))
                                : undefined
                        }
                        className="flex items-center gap-2 [&[data-reorder-target]]:shadow-[0_-2px_0_0_rgb(var(--primary))]"
                    >
                        {movable && (
                            <RowMoveControls
                                count={items.length}
                                index={index}
                                name={item.label || fallbackRowName(index)}
                                onMove={(to) => onMove(index, to)}
                            />
                        )}
                        <span className="font-mono font-bold text-md text-textPrimary">
                            {isMerit ? '+' : '-'}
                        </span>
                        <NumberInput
                            value={item.points}
                            onChange={(points) =>
                                onChange(item.id, points ?? item.points, item.label)
                            }
                            disabled={disabled}
                            label={translate(messages.points, { name: item.label })}
                            className="w-8 bg-bgSurface border rounded px-1 py-0.5 text-center text-sm font-mono text-textPrimary"
                            min={1}
                            max={5}
                            step={1}
                            optional={false}
                        />
                        {catalog && onCatalogSelect ? (
                            <CatalogSuggest
                                catalog={catalog}
                                value={item.label}
                                onChange={(label) => onChange(item.id, item.points, label)}
                                onSelect={(entry) => onCatalogSelect(item.id, entry)}
                                placeholder={translate(
                                    isMerit ? positivePlaceholder : negativePlaceholder
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
                {translate(isMerit ? addPositive : addNegative)}
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
