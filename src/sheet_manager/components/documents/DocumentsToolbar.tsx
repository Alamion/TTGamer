import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import {
    type DocumentsQuery,
    type Facet,
    isNarrowing,
    type QueryIndex,
    SORT_KEYS,
    type SortKey,
    TIME_PRESETS,
    type TimePreset,
} from '../../features/documents/query';

const labels = uiMessages.sheet.documents.manager.search;

const SEARCH_DEBOUNCE_MS = 100;

export interface DocumentsToolbarProps {
    query: DocumentsQuery;
    onChange: (patch: Partial<DocumentsQuery>) => void;
    onClear: () => void;
    index: QueryIndex;
    /** Documents shown and all documents. */
    shown: number;
    total: number;
}

const control =
    'rounded-sm border border-border bg-bgBase px-1.5 py-1 text-xs text-textPrimary focus:border-primary focus:outline-hidden [@media(pointer:coarse)]:py-2';
const iconButton =
    'inline-flex shrink-0 items-center justify-center rounded-sm border border-border p-1.5 text-textSecondary transition-colors hover:border-secondary hover:bg-secondary/10 hover:text-textPrimary [@media(pointer:coarse)]:p-2.5';

function Select({
    label,
    value,
    onChange,
    children,
    hideLabel = false,
}: {
    label: string;
    hideLabel?: boolean;
    value: string;
    onChange: (value: string) => void;
    children: React.ReactNode;
}) {
    return (
        <label className="grid min-w-0 gap-0.5 text-[11px] text-textSecondary">
            <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className={clsx(control, 'min-w-0')}
            >
                {children}
            </select>
        </label>
    );
}

const options = (facets: readonly Facet[]) =>
    facets.map(({ value, label }) => (
        <option key={value} value={value}>
            {label}
        </option>
    ));

/** Search, filters, and sort of the documents tree; the choices are kept for the visit. */
export function DocumentsToolbar({
    query,
    onChange,
    onClear,
    index,
    shown,
    total,
}: DocumentsToolbarProps) {
    const panelId = useId();
    const [expanded, setExpanded] = useState(false);
    const [draft, setDraft] = useState(query.text);
    const typed = useRef(query.text);

    // The box answers at once; the list follows after a short pause.
    useEffect(() => {
        if (draft === typed.current) return;
        const timer = window.setTimeout(() => {
            typed.current = draft;
            onChange({ text: draft });
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [draft, onChange]);
    // A clear from elsewhere (the chips, the empty-result button) empties the box too.
    useEffect(() => {
        if (query.text !== typed.current) {
            typed.current = query.text;
            setDraft(query.text);
        }
    }, [query.text]);

    const presetLabel = (preset: TimePreset) => translate(labels.presets[preset]);
    const chips: Array<{ key: string; text: string; clear: Partial<DocumentsQuery> }> = [];
    const facetLabel = (facets: readonly Facet[], value: string) =>
        facets.find((facet) => facet.value === value)?.label ?? value;
    if (query.kind !== null) {
        chips.push({
            key: 'kind',
            text: `${translate(labels.kind)}: ${facetLabel(index.kinds, query.kind)}`,
            clear: { kind: null },
        });
    }
    if (query.system !== null) {
        chips.push({
            key: 'system',
            text: `${translate(labels.system)}: ${facetLabel(index.systems, query.system)}`,
            clear: { system: null },
        });
    }
    if (query.setting !== null) {
        chips.push({
            key: 'setting',
            text: `${translate(labels.setting)}: ${query.setting}`,
            clear: { setting: null },
        });
    }
    if (query.created !== null) {
        chips.push({
            key: 'created',
            text: `${translate(labels.created)}: ${presetLabel(query.created)}`,
            clear: { created: null },
        });
    }
    if (query.changed !== null) {
        chips.push({
            key: 'changed',
            text: `${translate(labels.changed)}: ${presetLabel(query.changed)}`,
            clear: { changed: null },
        });
    }
    const narrowing = isNarrowing(query);
    // The filters and a sort other than the manual order, counted on the button that holds them.
    const badge = chips.length + (query.sort === 'manual' ? 0 : 1);
    const presetOptions = (
        <>
            <option value="">{translate(labels.any)}</option>
            {TIME_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                    {presetLabel(preset)}
                </option>
            ))}
        </>
    );
    const anyOption = <option value="">{translate(labels.any)}</option>;

    return (
        <div className="space-y-1.5 border-b border-border px-2 py-1.5">
            <div className="flex items-center gap-1.5">
                <div className="relative min-w-0 flex-1">
                    <Search
                        className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-textSecondary"
                        aria-hidden="true"
                    />
                    <input
                        type="search"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        aria-label={translate(labels.label)}
                        placeholder={translate(labels.placeholder)}
                        className={clsx(
                            control,
                            'w-full pl-7 pr-7 [&::-webkit-search-cancel-button]:hidden'
                        )}
                    />
                    {draft && (
                        <button
                            type="button"
                            onClick={() => {
                                typed.current = '';
                                setDraft('');
                                onChange({ text: '' });
                            }}
                            aria-label={translate(labels.clear)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-1 text-textSecondary hover:text-textPrimary"
                        >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setExpanded((open) => !open)}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    aria-label={translate(labels.filters)}
                    title={translate(labels.filters)}
                    className={clsx(iconButton, 'relative', badge > 0 && 'border-primary/60')}
                >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    {badge > 0 && (
                        <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-[10px] leading-4 text-white">
                            {badge}
                        </span>
                    )}
                </button>
            </div>
            <div id={panelId} className={clsx('grid grid-cols-2 gap-1.5', !expanded && 'hidden')}>
                <Select
                    label={translate(labels.kind)}
                    value={query.kind ?? ''}
                    onChange={(value) => onChange({ kind: value || null })}
                >
                    {anyOption}
                    {options(index.kinds)}
                </Select>
                <Select
                    label={translate(labels.system)}
                    value={query.system ?? ''}
                    onChange={(value) => onChange({ system: value || null })}
                >
                    {anyOption}
                    {options(index.systems)}
                </Select>
                <Select
                    label={translate(labels.setting)}
                    value={query.setting ?? ''}
                    onChange={(value) => onChange({ setting: value || null })}
                >
                    {anyOption}
                    {options(index.settings)}
                </Select>
                <span aria-hidden="true" />
                <Select
                    label={translate(labels.created)}
                    value={query.created ?? ''}
                    onChange={(value) =>
                        onChange({ created: (value || null) as TimePreset | null })
                    }
                >
                    {presetOptions}
                </Select>
                <Select
                    label={translate(labels.changed)}
                    value={query.changed ?? ''}
                    onChange={(value) =>
                        onChange({ changed: (value || null) as TimePreset | null })
                    }
                >
                    {presetOptions}
                </Select>
                <div className="col-span-2 flex items-end gap-1.5">
                    <div className="min-w-0 flex-1">
                        <Select
                            label={translate(labels.sort.label)}
                            value={query.sort}
                            onChange={(value) => onChange({ sort: value as SortKey })}
                        >
                            {SORT_KEYS.map((key) => (
                                <option key={key} value={key}>
                                    {translate(labels.sort[key])}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <button
                        type="button"
                        onClick={() => onChange({ descending: !query.descending })}
                        disabled={query.sort === 'manual'}
                        aria-pressed={query.descending}
                        aria-label={translate(labels.sort.descending)}
                        title={translate(labels.sort.descending)}
                        className={clsx(
                            iconButton,
                            'disabled:cursor-not-allowed disabled:opacity-40'
                        )}
                    >
                        {query.descending ? (
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        )}
                    </button>
                </div>
            </div>
            {(chips.length > 0 || narrowing) && (
                <ul className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
                    {chips.map((chip) => (
                        <li key={chip.key}>
                            <button
                                type="button"
                                onClick={() => onChange(chip.clear)}
                                aria-label={translate(labels.removeFilter, { name: chip.text })}
                                className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-textPrimary hover:bg-primary/20 [@media(pointer:coarse)]:py-1.5"
                            >
                                {chip.text}
                                <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                    <li>
                        <button
                            type="button"
                            onClick={onClear}
                            className="rounded-sm px-1.5 py-0.5 text-[11px] text-primary underline-offset-2 hover:underline [@media(pointer:coarse)]:py-1.5"
                        >
                            {translate(labels.clearAll)}
                        </button>
                    </li>
                </ul>
            )}
            <p
                role="status"
                className={clsx('m-0 text-[11px] text-textSecondary', !narrowing && 'sr-only')}
            >
                {narrowing ? translate(labels.results, { count: shown, total }) : ''}
            </p>
        </div>
    );
}
