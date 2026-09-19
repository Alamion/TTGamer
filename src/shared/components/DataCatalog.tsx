import { useHistory, useLocation } from '@docusaurus/router';
import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type {
    ColumnDef,
    ColumnFiltersState,
    FilterFn,
    PaginationState,
    RowData,
    SortingState,
} from '@tanstack/react-table';
import {
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { clsx } from 'clsx';
import {
    ChevronDown,
    ChevronDown as ChevronDownIcon,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Search,
    X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useLocale } from '../hooks/useLocale';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePluralMessage } from '../hooks/usePluralMessage';
import { matchesSearch } from '../utils/normalizeSearchText';
import { deserializeStringList, serializeStringList } from '../utils/stringList';
import { BottomSheet } from './BottomSheet';
import { SlidePanel } from './SlidePanel';

declare module '@tanstack/react-table' {
    // `TValue` is required by the declaration merge.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        /**
         * Text of the cell in the reader's locale (e.g. through `catalogEntryText`). The table
         * displays, sorts, and searches it instead of the raw property.
         */
        localizedText?: (row: TData, locale: string) => string | undefined;
        /** Label of an enumerated value, used by the default cell, filter options, and search. */
        valueLabel?: (value: string, locale: string) => string;
    }
}

const messages = uiMessages.shared.dataCatalog;

type FilterMode = 'single' | 'multi';

/** A generated translation descriptor (`uiMessages…`). */
export interface CatalogMessageDescriptor {
    id: string;
    message: string;
}

/** Literal text (already in the reader's language) or a descriptor translated on render. */
export type CatalogText = string | CatalogMessageDescriptor;

export interface FilterConfig {
    columnId: string;
    label: CatalogText;
    mode?: FilterMode;
    /** Option labels by raw value; defaults to the column's `meta.valueLabel`, then the value. */
    optionsMap?: Record<string, CatalogText>;
}

interface FilterOption {
    value: string;
    label: string;
}

function resolveText(text: CatalogText): string {
    return typeof text === 'string' ? text : translate(text);
}

/** Applies `meta.localizedText` / `meta.valueLabel` of a column for `locale`. */
function localizeColumn<T>(column: ColumnDef<T>, locale: string): ColumnDef<T> {
    const text = column.meta?.localizedText;
    if (text) {
        const localized = { ...column } as Record<string, unknown>;
        delete localized.accessorKey;
        return {
            ...localized,
            id: column.id,
            accessorFn: (row: T) => text(row, locale) ?? '',
        } as ColumnDef<T>;
    }
    const valueLabel = column.meta?.valueLabel;
    if (valueLabel && !column.cell) {
        return {
            ...column,
            cell: ({ getValue }) => {
                const value = getValue();
                return typeof value === 'string' ? valueLabel(value, locale) : String(value ?? '');
            },
        };
    }
    return column;
}

export interface DataCatalogProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    renderDetail: (item: T) => ReactNode;
    getRowId?: (item: T) => string;
    searchPlaceholder?: string;
    filters?: FilterConfig[];
    pageSize?: number;
    id?: string;
    defaultHiddenColumnIds?: string[];
}

function MultiSelectDropdown({
    label,
    options,
    selected,
    onToggle,
}: {
    label: string;
    options: FilterOption[];
    selected: string[];
    onToggle: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const plural = usePluralMessage();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const displayText = selected.length > 0 ? plural(messages.selected, selected.length) : label;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className={clsx(
                    'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
                    selected.length > 0
                        ? 'border-primary/40 bg-primary/5 text-primary'
                        : 'border-border bg-bgSurface text-textSecondary hover:border-textSecondary/40'
                )}
                aria-label={label}
                aria-expanded={open}
            >
                <span className="whitespace-nowrap">{displayText}</span>
                <ChevronDownIcon
                    className={clsx('w-3.5 h-3.5 transition-transform', open && 'rotate-180')}
                />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded-lg border border-border bg-bgSurface shadow-lg py-1">
                    {options.map((option) => {
                        const isSelected = selected.includes(option.value);
                        return (
                            <label
                                key={option.value}
                                className={clsx(
                                    'flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors',
                                    isSelected
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-textSecondary hover:bg-bgBase'
                                )}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => onToggle(option.value)}
                                    className="rounded border-border text-primary focus:ring-primary/30"
                                />
                                {option.label}
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/** Clicks on links, buttons, or form controls inside a row keep their own behavior. */
function isInteractiveTarget(target: EventTarget, row: Element): boolean {
    if (!(target instanceof Element)) return false;
    const interactive = target.closest(
        'a, button, input, select, textarea, label, [role="button"]'
    );
    return interactive !== null && row.contains(interactive);
}

export function DataCatalog<T extends { id: string }>({
    data,
    columns,
    renderDetail,
    getRowId = (item: T) => item.id,
    searchPlaceholder,
    filters,
    pageSize = 15,
    id,
    defaultHiddenColumnIds,
}: DataCatalogProps<T>) {
    const locale = useLocale();
    const location = useLocation();
    const history = useHistory();
    const firstRender = useRef(true);
    const prevSearchRef = useRef('');
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
    const pfx = id ? `${id}-` : '';
    const p = (key: string) => `${pfx}${key}`;

    const isMobile = useMediaQuery('(max-width: 1023px)');
    const isSmallScreen = useMediaQuery('(max-width: 639px)');

    const effectivePageSize = useMemo(
        () => (isSmallScreen ? Math.min(pageSize, 10) : pageSize),
        [isSmallScreen, pageSize]
    );

    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: effectivePageSize,
    });

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
        Object.fromEntries((defaultHiddenColumnIds ?? []).map((id) => [id, false]))
    );

    const filterConfigs: FilterConfig[] = useMemo(
        () =>
            (filters ?? []).map((f) => ({
                mode: 'single' as FilterMode,
                ...f,
            })),
        [filters]
    );

    const localizedColumns = useMemo(
        () => columns.map((column) => localizeColumn(column, locale)),
        [columns, locale]
    );

    const valueLabels = useMemo(
        () =>
            new Map(
                localizedColumns.flatMap((column) =>
                    column.id && column.meta?.valueLabel
                        ? [[column.id, column.meta.valueLabel] as const]
                        : []
                )
            ),
        [localizedColumns]
    );

    /** Matches the shown text, value labels, and the raw (English) value of a cell. */
    const globalFilterFn = useCallback<FilterFn<T>>(
        (row, columnId, query: string) => {
            const value = row.getValue<unknown>(columnId);
            const text = value === null || value === undefined ? '' : String(value);
            const own = (row.original as Record<string, unknown>)[columnId];
            return matchesSearch(
                query,
                text,
                valueLabels.get(columnId)?.(text, locale),
                typeof own === 'string' ? own : undefined
            );
        },
        [valueLabels, locale]
    );

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns: localizedColumns,
        state: { sorting, columnFilters, globalFilter, pagination, columnVisibility },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        globalFilterFn,
        autoResetPageIndex: false,
    });

    const selectedItem = useMemo(() => {
        if (!selectedId) return null;
        return data.find((item) => getRowId(item) === selectedId) ?? null;
    }, [data, selectedId, getRowId]);

    const [panelWidth, setPanelWidth] = useState(380);

    useEffect(() => {
        if (!selectedId) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelectedId(null);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [selectedId]);

    const filterOptions = useMemo(() => {
        const result: Record<string, FilterOption[]> = {};
        for (const fc of filterConfigs) {
            const col = table.getColumn(fc.columnId);
            if (!col) continue;
            const faceted = col.getFacetedUniqueValues();
            if (!faceted) continue;
            const raw = Array.from(faceted.keys());
            const flat = new Set<string>();
            for (const v of raw) {
                if (Array.isArray(v)) {
                    for (const item of v) flat.add(String(item));
                } else {
                    flat.add(String(v));
                }
            }
            const valueLabel = valueLabels.get(fc.columnId);
            result[fc.columnId] = Array.from(flat)
                .map((value) => {
                    const mapped = fc.optionsMap?.[value];
                    const label =
                        mapped !== undefined
                            ? resolveText(mapped)
                            : (valueLabel?.(value, locale) ?? value);
                    return { value, label };
                })
                .sort((a, b) => a.label.localeCompare(b.label, locale, { numeric: true }));
        }
        return result;
    }, [table, filterConfigs, valueLabels, locale]);

    const toggleDetail = (id: string) => {
        setSelectedId((prev) => (prev === id ? null : id));
    };

    const nameText = localizedColumns.find((column) => column.id === 'name')?.meta?.localizedText;

    const getRowLabel = (item: T) => {
        const localized = nameText?.(item, locale);
        if (localized) return localized;
        if ('name' in item && typeof item.name === 'string') return item.name;
        return getRowId(item);
    };

    const getFilterValue = (id: string): string =>
        (columnFilters.find((f) => f.id === id)?.value as string) ?? '';

    const getSelectedValues = (id: string): string[] => {
        const raw = getFilterValue(id);
        return deserializeStringList(raw);
    };

    const upsertColumnFilter = (id: string, value: string) => {
        setColumnFilters((prev) => {
            const filtered = prev.filter((f) => f.id !== id);
            return value ? [...filtered, { id, value }] : filtered;
        });
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    const toggleMultiFilter = (id: string, option: string) => {
        const current = getSelectedValues(id);
        const next = current.includes(option)
            ? current.filter((v) => v !== option)
            : [...current, option];
        upsertColumnFilter(id, serializeStringList(next));
    };

    const handleSingleFilterChange = (id: string, value: string) => {
        upsertColumnFilter(id, value);
    };

    function buildSearchString() {
        const params = new URLSearchParams(location.search);
        for (const fc of filterConfigs) {
            params.delete(p(fc.columnId));
            const val = columnFilters.find((f) => f.id === fc.columnId)?.value;
            if (val) params.set(p(fc.columnId), String(val));
        }
        if (globalFilter) {
            params.set(p('search'), globalFilter);
        } else {
            params.delete(p('search'));
        }
        if (sorting.length > 0) {
            const { id: sortId, desc } = sorting[0];
            params.set(p('sort'), `${sortId}:${desc ? 'desc' : 'asc'}`);
        } else {
            params.delete(p('sort'));
        }
        if (selectedId) {
            params.set(p('selected'), selectedId);
        } else {
            params.delete(p('selected'));
        }
        if (pagination.pageIndex > 0) {
            params.set(p('page'), String(pagination.pageIndex + 1));
        } else {
            params.delete(p('page'));
        }
        const sorted = new URLSearchParams();
        Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([k, v]) => sorted.set(k, v));
        return sorted.toString();
    }

    function extractOurParams(search: string): string {
        if (!id) return search.replace(/^\?/, '');
        const allParams = new URLSearchParams(search);
        const ours = new URLSearchParams();
        for (const [key, value] of allParams) {
            if (key.startsWith(pfx)) ours.set(key, value);
        }
        return ours.toString();
    }

    function applyUrlParams(search: string) {
        const params = new URLSearchParams(search);
        setGlobalFilter(params.get(p('search')) ?? '');
        const filters: ColumnFiltersState = [];
        for (const fc of filterConfigs) {
            const val = params.get(p(fc.columnId));
            if (val) filters.push({ id: fc.columnId, value: val });
        }
        setColumnFilters(filters);
        const sortParam = params.get(p('sort'));
        if (sortParam) {
            const [sortId, dir] = sortParam.split(':');
            setSorting([{ id: sortId, desc: dir === 'desc' }]);
        } else {
            setSorting([]);
        }
        setSelectedId(params.get(p('selected')) ?? null);
        const pageStr = params.get(p('page'));
        setPagination((prev) => ({
            ...prev,
            pageIndex: pageStr ? Math.max(0, parseInt(pageStr) - 1) : 0,
        }));
        prevSearchRef.current = extractOurParams(search);
    }

    useLayoutEffect(() => {
        applyUrlParams(location.search);
        firstRender.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (firstRender.current) return;
        const relevant = extractOurParams(location.search);
        if (relevant === prevSearchRef.current) return;
        applyUrlParams(location.search);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    useEffect(() => {
        if (firstRender.current) return;
        setPagination({
            pageIndex: 0,
            pageSize: effectivePageSize,
        });
    }, [effectivePageSize]);

    useEffect(() => {
        if (firstRender.current) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const search = buildSearchString();
        const ourParams = extractOurParams(search ? `?${search}` : '');
        if (ourParams === prevSearchRef.current) return;
        debounceRef.current = setTimeout(() => {
            prevSearchRef.current = ourParams;
            history.replace({ search: search ? `?${search}` : '', hash: location.hash });
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [globalFilter, columnFilters, sorting, selectedId, pagination]);

    const handleSearchChange = (value: string) => {
        setGlobalFilter(value);
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
                    <input
                        type="text"
                        value={globalFilter}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder={searchPlaceholder ?? translate(messages.search)}
                        className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-border bg-bgSurface text-textPrimary placeholder-textSecondary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                    {globalFilter && (
                        <button
                            onClick={() => handleSearchChange('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary transition-colors"
                            aria-label={translate(messages.clearSearch)}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {filterConfigs.map((fc) => {
                    const options = filterOptions[fc.columnId] ?? [];
                    const label = resolveText(fc.label);
                    if (fc.mode === 'multi') {
                        const selected = getSelectedValues(fc.columnId);
                        return (
                            <MultiSelectDropdown
                                key={fc.columnId}
                                label={label}
                                options={options}
                                selected={selected}
                                onToggle={(value) => toggleMultiFilter(fc.columnId, value)}
                            />
                        );
                    }
                    return (
                        <select
                            key={fc.columnId}
                            value={getFilterValue(fc.columnId)}
                            onChange={(e) => handleSingleFilterChange(fc.columnId, e.target.value)}
                            className="px-3 py-2 text-sm rounded-lg border border-border bg-bgSurface text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                            aria-label={label}
                        >
                            <option value="">{label}</option>
                            {options.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    );
                })}

                <span className="text-sm text-textSecondary whitespace-nowrap">
                    {table.getRowModel().rows.length} / {data.length}
                </span>
            </div>

            <div className="relative">
                <div className="border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm table">
                            <thead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr
                                        key={headerGroup.id}
                                        className="border-b border-border bg-bgSurface/50"
                                    >
                                        {headerGroup.headers.map((header) => (
                                            <th
                                                key={header.id}
                                                scope="col"
                                                className={clsx(
                                                    'px-4 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider'
                                                )}
                                                aria-sort={
                                                    header.column.getIsSorted() === 'asc'
                                                        ? 'ascending'
                                                        : header.column.getIsSorted() === 'desc'
                                                          ? 'descending'
                                                          : header.column.getCanSort()
                                                            ? 'none'
                                                            : undefined
                                                }
                                            >
                                                {header.column.getCanSort() ? (
                                                    <button
                                                        type="button"
                                                        onClick={header.column.getToggleSortingHandler()}
                                                        className="inline-flex items-center gap-1 select-none hover:text-textPrimary transition-colors"
                                                    >
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                        {{
                                                            asc: (
                                                                <ChevronUp
                                                                    className="w-3.5 h-3.5"
                                                                    aria-hidden="true"
                                                                />
                                                            ),
                                                            desc: (
                                                                <ChevronDown
                                                                    className="w-3.5 h-3.5"
                                                                    aria-hidden="true"
                                                                />
                                                            ),
                                                        }[header.column.getIsSorted() as string] ??
                                                            null}
                                                    </button>
                                                ) : (
                                                    flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={table.getVisibleLeafColumns().length}
                                            className="px-4 py-12 text-center text-textSecondary"
                                        >
                                            {translate(messages.empty)}
                                        </td>
                                    </tr>
                                ) : (
                                    table.getRowModel().rows.map((row) => (
                                        <tr
                                            key={row.id}
                                            tabIndex={0}
                                            aria-label={translate(
                                                selectedId === getRowId(row.original)
                                                    ? messages.detailsOpen
                                                    : messages.openDetails,
                                                { name: getRowLabel(row.original) }
                                            )}
                                            onClick={(e) => {
                                                if (isInteractiveTarget(e.target, e.currentTarget))
                                                    return;
                                                toggleDetail(getRowId(row.original));
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.target !== e.currentTarget) return;
                                                if (e.key !== 'Enter' && e.key !== ' ') return;
                                                e.preventDefault();
                                                toggleDetail(getRowId(row.original));
                                            }}
                                            className={clsx(
                                                'border-b border-border last:border-0 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                                                selectedId === getRowId(row.original)
                                                    ? 'bg-primary/10'
                                                    : 'hover:bg-bgSurface/80'
                                            )}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <td key={cell.id} className="px-4 py-2.5">
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-bgSurface/30">
                        <span className="text-sm text-textSecondary">
                            {translate(messages.page, {
                                page: pagination.pageIndex + 1,
                                pages: table.getPageCount(),
                            })}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                                className="p-1.5 rounded text-textSecondary hover:text-textPrimary hover:bg-bgSurface disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                aria-label={translate(messages.previousPage)}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-textSecondary tabular-nums min-w-[2ch] text-center">
                                {pagination.pageIndex + 1}
                            </span>
                            <button
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                                className="p-1.5 rounded text-textSecondary hover:text-textPrimary hover:bg-bgSurface disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                aria-label={translate(messages.nextPage)}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {selectedItem && !isMobile && (
                    <SlidePanel
                        open={true}
                        onClose={() => setSelectedId(null)}
                        width={panelWidth}
                        onWidthChange={setPanelWidth}
                        minWidth={280}
                        maxWidth={800}
                        showBackdrop={false}
                        ariaLabel={translate(messages.itemDetails)}
                        style={{ top: 'var(--ifm-navbar-height, 4rem)' }}
                    >
                        <div className="pl-3 pr-5 py-5">
                            <div className="flex items-start justify-between mb-2">
                                <h2 className="text-lg font-bold text-textPrimary">
                                    {getRowLabel(selectedItem)}
                                </h2>
                                <button
                                    onClick={() => setSelectedId(null)}
                                    className="text-textSecondary hover:text-textPrimary transition-colors"
                                    aria-label={translate(messages.closeDetail)}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            {renderDetail(selectedItem)}
                        </div>
                    </SlidePanel>
                )}
            </div>

            {isMobile && selectedItem && (
                <BottomSheet onClose={() => setSelectedId(null)}>
                    <div className="flex items-start justify-between mb-2">
                        <h2 className="text-lg font-bold text-textPrimary">
                            {getRowLabel(selectedItem)}
                        </h2>
                    </div>
                    {renderDetail(selectedItem)}
                </BottomSheet>
            )}
        </div>
    );
}
