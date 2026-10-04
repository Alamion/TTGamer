import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { Plus, X } from 'lucide-react';
import { createElement, memo, useCallback, useEffect, useMemo } from 'react';

import { generateId } from '../../../../shared/utils/random';
import type { CatalogEntry } from '../../../components/controls/CatalogSuggest';
import { CatalogSuggest } from '../../../components/controls/CatalogSuggest';
import { RowMoveControls, rowMoveKeys } from '../../../components/controls/RowMoveControls';
import { SectionCard } from '../../../components/sections/SectionCard';
import { termLinkOf } from '../../../components/terms/termLink';
import { reportSheetIssue } from '../../../diagnostics';
import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import { isUserCatalogId } from '../../../systems/userCatalogs';
import {
    listIsNamed,
    type ListItemField,
    listItemField,
    type ListNode,
    listValueKey,
} from '../../../types/template';
import {
    coerceListValue,
    type RatingDetail,
    readRatingDetail,
    TEMPLATE_VALUES_LIMITS,
    type TemplateListEntry,
} from '../../../types/templateValues';
import {
    catalogKindFitsListItem,
    getCatalogBinding,
    readCatalogDetails,
} from '../data/catalogBindings';
import { templateFieldControl } from '../registry/declarativeFieldRegistry';
import type { DocumentOption } from './fieldControls';
import { listEntryShape } from './fieldControls';
import type { CatalogFieldRuntime, UseTemplatePageResult } from './hooks';
import { LabeledField } from './LabeledField';
import { toCatalogEntries } from './primitives';
import { moveItem } from './rowOrder';

const labels = uiMessages.sheet.templates.listEntry;

const EMPTY: readonly TemplateListEntry[] = [];

const listColumns = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
} as const;

type EntryPatch = Partial<Omit<TemplateListEntry, 'id'>>;

interface ListCatalog {
    catalogId: string;
    suggestions: CatalogEntry[];
    /** The detail copied into the entry's value when it fits the entry type. */
    valueFrom?: string;
}

/** An entry's remove control (spec 016, R9): a small icon with a 32 px target. */
function ListEntryRemove({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <button
            type="button"
            onClick={onRemove}
            aria-label={label}
            title={label}
            className={clsx(
                'relative flex h-4 w-4 shrink-0 items-center justify-center rounded text-error',
                "before:absolute before:-inset-2 before:content-['']",
                'opacity-50 transition-opacity hover:opacity-100 focus-visible:opacity-100',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-error'
            )}
        >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
    );
}

interface ListEntryRowProps {
    entry: TemplateListEntry;
    index: number;
    item: ListItemField;
    named: boolean;
    listTitle: string;
    disabled: boolean;
    catalog: ListCatalog | undefined;
    itemCatalog: CatalogFieldRuntime | undefined;
    maxState: { resolvedMax?: number; degraded?: boolean } | undefined;
    documentOptions: ReadonlyArray<DocumentOption>;
    onOpenDocument: (documentId: string) => void;
    previewSource: boolean;
    onChange: (id: string, patch: EntryPatch) => void;
    onRemove: (id: string) => void;
    onPick: (id: string, suggestion: CatalogEntry) => void;
}

/** One entry of a custom list: one copy of the list's entry template (spec 016, R4). */
const ListEntryRow = memo(function ListEntryRow({
    entry,
    index,
    item,
    named,
    listTitle,
    disabled,
    catalog,
    itemCatalog,
    maxState,
    documentOptions,
    onOpenDocument,
    previewSource,
    onChange,
    onRemove,
    onPick,
}: ListEntryRowProps) {
    const nth = translate(labels.nth, { list: listTitle, n: index + 1 });
    const name = entry.label ?? '';
    // Named entries are called by their name; unnamed ones by the item label, or by position.
    const accessibleName = named ? name || nth : item.hideLabel ? nth : item.label;
    const field: ListItemField =
        named || item.hideLabel ? { ...item, label: accessibleName, hideLabel: true } : item;

    const nameSlot = named ? (
        catalog ? (
            <CatalogSuggest
                catalog={catalog.suggestions}
                value={name}
                onChange={(label) => onChange(entry.id, { label })}
                onSelect={(suggestion) => onPick(entry.id, suggestion)}
                placeholder={listTitle}
                ariaLabel={translate(labels.name, { list: listTitle })}
                disabled={disabled}
                className="w-full border-b bg-transparent px-2 py-0.5 text-sm text-textPrimary transition-colors"
            />
        ) : (
            <input
                type="text"
                value={name}
                onChange={(event) => onChange(entry.id, { label: event.target.value })}
                placeholder={listTitle}
                aria-label={translate(labels.name, { list: listTitle })}
                disabled={disabled}
                className="w-full border-b bg-transparent px-2 py-0.5 text-sm text-textPrimary transition-colors"
            />
        )
    ) : undefined;

    const removeSlot = disabled ? undefined : (
        <ListEntryRemove
            label={
                named && name
                    ? translate(labels.remove, { name })
                    : translate(labels.removeNth, { list: listTitle, n: index + 1 })
            }
            onRemove={() => onRemove(entry.id)}
        />
    );
    const shape = listEntryShape(item);

    const onValueChange = (next: unknown) => {
        const picked =
            itemCatalog &&
            !itemCatalog.degraded &&
            isUserCatalogId(itemCatalog.catalogId) &&
            typeof next === 'string'
                ? itemCatalog.options.find((option) => option.value === next)?.label
                : undefined;
        onChange(entry.id, {
            value: next as TemplateListEntry['value'],
            ...(itemCatalog ? { pickLabel: picked } : {}),
        });
    };

    const control = createElement(templateFieldControl(item.type), {
        field,
        value: coerceListValue(item, entry.value),
        onChange: onValueChange,
        disabled,
        ...(item.type === 'rating'
            ? {
                  ratingDetail: readRatingDetail(entry.detail),
                  onDetailChange: (detail: RatingDetail) => onChange(entry.id, { detail }),
                  nameSlot,
                  rollLabel: named ? name || accessibleName : item.label,
              }
            : {}),
        ...(itemCatalog
            ? {
                  catalogOptions: itemCatalog.options,
                  ...(entry.pickLabel ? { pickedLabel: entry.pickLabel } : {}),
                  ...(!itemCatalog.degraded && itemCatalog.options.length === 0
                      ? { catalogEmpty: true }
                      : {}),
              }
            : {}),
        resolvedMax: maxState?.resolvedMax,
        maxDegraded: maxState?.degraded,
        documentOptions,
        onOpenDocument,
        previewSource,
        ...(shape === 'row' ? { removeSlot } : {}),
    });

    if (item.type === 'rating') {
        return (
            <div data-list-entry={entry.id} className="grid grid-cols-1 gap-1">
                {control}
                {item.description && (
                    <span className="text-xs text-textSecondary">{item.description}</span>
                )}
            </div>
        );
    }
    return (
        <div data-list-entry={entry.id}>
            <LabeledField
                field={field}
                term={named ? undefined : termLinkOf(item)}
                nameSlot={nameSlot}
                trailing={shape === 'block' ? removeSlot : undefined}
            >
                {control}
            </LabeledField>
        </div>
    );
});

/** A new entry: an id, an empty name on named lists, and no value (data-model "New entry"). */
function newEntry(named: boolean): TemplateListEntry {
    return named ? { id: generateId(), label: '' } : { id: generateId() };
}

/** The picked catalog entry's detail as the entry's value, when it fits (spec 016, R8). */
function pickedValue(
    item: ListItemField,
    detail: unknown,
    previous: TemplateListEntry['value']
): TemplateListEntry['value'] | undefined {
    if (detail === undefined) return undefined;
    if (item.type === 'resource') {
        const shown = coerceListValue(item, previous) as { max: number } | undefined;
        const max = shown?.max ?? item.max;
        return typeof detail === 'number'
            ? { current: Math.min(max, Math.max(item.min, Math.round(detail))), max }
            : undefined;
    }
    return coerceListValue(item, detail) as TemplateListEntry['value'] | undefined;
}

/**
 * A custom list (value-bag storage): every entry is one copy of the list's entry template, named
 * by the sheet's user when the list is named (spec 016).
 */
export function CustomListView({
    list,
    pageApi,
}: {
    list: ListNode;
    pageApi: UseTemplatePageResult;
}) {
    const locale = useDocusaurusContext().i18n.currentLocale;
    const userCatalogs = useDocumentTypeStore((state) => state.catalogs);
    const key = listValueKey(list);
    const item = useMemo(() => listItemField(list), [list]);
    const named = listIsNamed(list);
    const title = list.title ?? item.label;
    const stored = pageApi.values[key];
    const entries = Array.isArray(stored) ? (stored as TemplateListEntry[]) : EMPTY;
    const { updateList, disabled, resolveCatalogField } = pageApi;
    const templateId = pageApi.template?.id;

    const itemCatalog = useMemo(
        () => (item.type === 'select' && item.binding ? resolveCatalogField(item) : undefined),
        [item, resolveCatalogField]
    );

    // The list's own catalog suggests names; unnamed lists have nothing to suggest into.
    const catalogId = named ? list.catalog?.catalogId : undefined;
    const valueFrom = list.catalog?.valueFrom;
    const catalog = useMemo<ListCatalog | undefined>(() => {
        if (!catalogId) return undefined;
        const binding = getCatalogBinding(catalogId, userCatalogs);
        if (!binding) return undefined;
        const detail = valueFrom
            ? binding.fillableDetails.find(({ key: detailKey }) => detailKey === valueFrom)
            : undefined;
        return {
            catalogId,
            suggestions: toCatalogEntries(binding, locale),
            ...(detail && catalogKindFitsListItem(detail.kind, item.type) ? { valueFrom } : {}),
        };
    }, [catalogId, valueFrom, userCatalogs, locale, item.type]);

    useEffect(() => {
        if (catalogId && !catalog) {
            reportSheetIssue({
                code: 'catalog-unavailable',
                message: 'List catalog is not available; entry names are typed by hand',
                details: { catalogId, listId: list.id },
            });
        }
    }, [catalog, catalogId, list.id]);

    const unreadable = entries.filter(
        (entry) => entry.value !== undefined && coerceListValue(item, entry.value) === undefined
    ).length;
    useEffect(() => {
        if (unreadable === 0 || pageApi.previewSource) return;
        reportSheetIssue({
            code: 'list-entry-unreadable',
            message: 'Stored list entries do not fit the entry template; they show empty',
            details: { templateId, listId: list.id, count: unreadable },
        });
    }, [unreadable, pageApi.previewSource, templateId, list.id]);

    const onChange = useCallback(
        (id: string, patch: EntryPatch) =>
            updateList(key, (current) =>
                current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
            ),
        [updateList, key]
    );
    const onRemove = useCallback(
        (id: string) => updateList(key, (current) => current.filter((entry) => entry.id !== id)),
        [updateList, key]
    );
    const onPick = useCallback(
        (id: string, suggestion: CatalogEntry) => {
            if (!catalog) return;
            const details = catalog.valueFrom
                ? readCatalogDetails(catalog.catalogId, suggestion.id)
                : undefined;
            updateList(key, (current) =>
                current.map((entry) => {
                    if (entry.id !== id) return entry;
                    const value = pickedValue(item, details?.[catalog.valueFrom!], entry.value);
                    return {
                        ...entry,
                        label: suggestion.name,
                        ...(value !== undefined ? { value } : {}),
                    };
                })
            );
        },
        [catalog, item, key, updateList]
    );
    const full = entries.length >= TEMPLATE_VALUES_LIMITS.listEntriesMax;
    const movable = !disabled && entries.length > 1;
    const onMoveTo = (from: number) => (to: number) =>
        updateList(key, (current) => moveItem(current, from, to));

    const body = (
        <div className="grid gap-1">
            <div
                className={clsx('grid gap-x-4 gap-y-1', listColumns[list.columns as 1 | 2 | 3 | 4])}
                data-list-columns={list.columns}
                data-reorder-list=""
            >
                {entries.map((entry, index) => (
                    // Alt+↑/↓ from the row's own controls bubble here (spec 022).
                    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                    <div
                        key={entry.id}
                        data-reorder-row=""
                        onKeyDown={
                            movable
                                ? rowMoveKeys(index, entries.length, onMoveTo(index))
                                : undefined
                        }
                        className="flex min-w-0 items-start gap-1 [&[data-reorder-target]]:shadow-[0_-2px_0_0_rgb(var(--primary))]"
                    >
                        {movable && (
                            <RowMoveControls
                                count={entries.length}
                                index={index}
                                name={
                                    entry.label ||
                                    translate(labels.nth, { list: title, n: index + 1 })
                                }
                                onMove={onMoveTo(index)}
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            <ListEntryRow
                                entry={entry}
                                index={index}
                                item={item}
                                named={named}
                                listTitle={title}
                                disabled={disabled}
                                catalog={catalog}
                                itemCatalog={itemCatalog}
                                maxState={pageApi.formulaState.maxima.get(item.id)}
                                documentOptions={pageApi.documentOptions}
                                onOpenDocument={pageApi.openDocument}
                                previewSource={pageApi.previewSource}
                                onChange={onChange}
                                onRemove={onRemove}
                                onPick={onPick}
                            />
                        </div>
                    </div>
                ))}
            </div>
            {!disabled && (
                <button
                    type="button"
                    onClick={() => updateList(key, (current) => [...current, newEntry(named)])}
                    disabled={full}
                    title={
                        full
                            ? translate(labels.limit, {
                                  max: TEMPLATE_VALUES_LIMITS.listEntriesMax,
                              })
                            : undefined
                    }
                    className="flex items-center gap-1 justify-self-start py-1 text-sm text-textPrimary transition-colors hover:text-textPrimary/80 disabled:opacity-40"
                >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {translate(uiMessages.sheet.controls.add)}
                </button>
            )}
        </div>
    );
    if (list.framed) {
        return <SectionCard title={list.showTitle ? title : undefined}>{body}</SectionCard>;
    }
    return (
        <div className="grid grid-cols-1 gap-1">
            {list.showTitle && list.title && (
                <h3 className="text-sm font-semibold text-textPrimary">{list.title}</h3>
            )}
            {body}
        </div>
    );
}
