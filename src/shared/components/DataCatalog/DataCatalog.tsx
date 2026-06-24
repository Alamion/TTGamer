import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
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
import type {
    ColumnDef,
    ColumnFiltersState,
    PaginationState,
    SortingState,
} from '@tanstack/react-table';
import {
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Search,
    X,
    ChevronDown as ChevronDownIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useHistory, useLocation } from '@docusaurus/router';

type FilterMode = 'single' | 'multi';

interface FilterConfig {
    columnId: string;
    label: string;
    mode?: FilterMode;
    optionsMap?: Record<string, string>;
}

export interface DataCatalogProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    renderDetail: (item: T) => ReactNode;
    getRowId?: (item: T) => string;
    searchPlaceholder?: string;
    filters?: FilterConfig[];
    pageSize?: number;
}

function MultiSelectDropdown({
    label,
    options,
    selected,
    onToggle,
}: {
    label: string;
    options: string[];
    selected: string[];
    onToggle: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const displayText = selected.length > 0 ? `${selected.length} selected` : label;

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
                        const isSelected = selected.includes(option);
                        return (
                            <label
                                key={option}
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
                                    onChange={() => onToggle(option)}
                                    className="rounded border-border text-primary focus:ring-primary/30"
                                />
                                {option}
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function DataCatalog<T extends { id: string }>({
    data,
    columns,
    renderDetail,
    getRowId = (item: T) => item.id,
    searchPlaceholder = 'Search...',
    filters,
    pageSize = 15,
}: DataCatalogProps<T>) {
    const location = useLocation();
    const history = useHistory();
    const firstRender = useRef(true);
    const prevSearchRef = useRef('');
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize,
    });

    const table = useReactTable({
        data,
        columns,
        state: { sorting, columnFilters, globalFilter, pagination },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        globalFilterFn: 'includesString',
        autoResetPageIndex: false,
    });

    const selectedItem = useMemo(() => {
        if (!selectedId) return null;
        return data.find((item) => getRowId(item) === selectedId) ?? null;
    }, [data, selectedId, getRowId]);

    const filterConfigs: FilterConfig[] = useMemo(
        () =>
            (filters ?? []).map((f) => ({
                mode: 'single' as FilterMode,
                ...f,
            })),
        [filters]
    );

    const filterValues = useMemo(() => {
        const result: Record<string, string[]> = {};
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
            const sorted = Array.from(flat).sort();
            if (fc.optionsMap) {
                result[fc.columnId] = sorted.map((k) => fc.optionsMap![k] ?? k);
            } else {
                result[fc.columnId] = sorted;
            }
        }
        return result;
    }, [table, filterConfigs]);

    const handleRowClick = (id: string) => {
        setSelectedId((prev) => (prev === id ? null : id));
    };

    const getFilterValue = (id: string): string =>
        (columnFilters.find((f) => f.id === id)?.value as string) ?? '';

    const getSelectedValues = (id: string): string[] => {
        const raw = getFilterValue(id);
        return raw ? raw.split(',').filter(Boolean) : [];
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
        upsertColumnFilter(id, next.join(','));
    };

    const handleSingleFilterChange = (id: string, value: string) => {
        upsertColumnFilter(id, value);
    };

    const reverseMap = (fc: FilterConfig, displayValue: string): string => {
        if (!fc.optionsMap) return displayValue;
        const entry = Object.entries(fc.optionsMap).find(([, v]) => v === displayValue);
        return entry ? entry[0] : displayValue;
    };

    function buildSearchString() {
        const params = new URLSearchParams(location.search);
        for (const fc of filterConfigs) {
            params.delete(fc.columnId);
            const val = columnFilters.find((f) => f.id === fc.columnId)?.value;
            if (val) params.set(fc.columnId, String(val));
        }
        if (globalFilter) {
            params.set('search', globalFilter);
        } else {
            params.delete('search');
        }
        if (sorting.length > 0) {
            const { id, desc } = sorting[0];
            params.set('sort', `${id}:${desc ? 'desc' : 'asc'}`);
        } else {
            params.delete('sort');
        }
        if (selectedId) {
            params.set('selected', selectedId);
        } else {
            params.delete('selected');
        }
        if (pagination.pageIndex > 0) {
            params.set('page', String(pagination.pageIndex + 1));
        } else {
            params.delete('page');
        }
        const sorted = new URLSearchParams();
        Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([k, v]) => sorted.set(k, v));
        return sorted.toString();
    }

    function applyUrlParams(search: string) {
        const params = new URLSearchParams(search);
        setGlobalFilter(params.get('search') ?? '');
        const filters: ColumnFiltersState = [];
        for (const fc of filterConfigs) {
            const val = params.get(fc.columnId);
            if (val) filters.push({ id: fc.columnId, value: val });
        }
        setColumnFilters(filters);
        const sortParam = params.get('sort');
        if (sortParam) {
            const [id, dir] = sortParam.split(':');
            setSorting([{ id, desc: dir === 'desc' }]);
        } else {
            setSorting([]);
        }
        setSelectedId(params.get('selected') ?? null);
        const pageStr = params.get('page');
        setPagination((prev) => ({
            ...prev,
            pageIndex: pageStr ? Math.max(0, parseInt(pageStr) - 1) : 0,
        }));
        prevSearchRef.current = params.toString();
    }

    useEffect(() => {
        if (firstRender.current) {
            applyUrlParams(location.search);
            firstRender.current = false;
            return;
        }
        const raw = location.search.replace(/^\?/, '');
        if (raw === prevSearchRef.current) return;
        applyUrlParams(location.search);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    useEffect(() => {
        if (firstRender.current) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const search = buildSearchString();
        if (search === prevSearchRef.current) return;
        debounceRef.current = setTimeout(() => {
            prevSearchRef.current = search;
            history.replace({ search: search ? `?${search}` : '' });
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
                        placeholder={searchPlaceholder}
                        className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-border bg-bgSurface text-textPrimary placeholder-textSecondary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                    {globalFilter && (
                        <button
                            onClick={() => handleSearchChange('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary transition-colors"
                            aria-label="Clear search"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {filterConfigs.map((fc) => {
                    const vals = filterValues[fc.columnId] ?? [];
                    if (fc.mode === 'multi') {
                        const selected = getSelectedValues(fc.columnId);
                        return (
                            <MultiSelectDropdown
                                key={fc.columnId}
                                label={fc.label}
                                options={vals}
                                selected={selected}
                                onToggle={(displayValue) => {
                                    const raw = reverseMap(fc, displayValue);
                                    toggleMultiFilter(fc.columnId, raw);
                                }}
                            />
                        );
                    }
                    return (
                        <select
                            key={fc.columnId}
                            value={getFilterValue(fc.columnId)}
                            onChange={(e) => {
                                const raw = reverseMap(fc, e.target.value);
                                handleSingleFilterChange(fc.columnId, raw);
                            }}
                            className="px-3 py-2 text-sm rounded-lg border border-border bg-bgSurface text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                            aria-label={fc.label}
                        >
                            <option value="">{fc.label}</option>
                            {vals.map((displayVal) => (
                                <option key={displayVal} value={displayVal}>
                                    {displayVal}
                                </option>
                            ))}
                        </select>
                    );
                })}

                <span className="text-sm text-textSecondary whitespace-nowrap">
                    {table.getRowModel().rows.length} / {data.length}
                </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
                <div className="lg:flex-1 min-w-0">
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
                                                        'px-4 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider',
                                                        header.column.getCanSort() &&
                                                            'cursor-pointer select-none hover:text-textPrimary transition-colors'
                                                    )}
                                                    onClick={header.column.getToggleSortingHandler()}
                                                >
                                                    <span className="inline-flex items-center gap-1">
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                        {{
                                                            asc: (
                                                                <ChevronUp className="w-3.5 h-3.5" />
                                                            ),
                                                            desc: (
                                                                <ChevronDown className="w-3.5 h-3.5" />
                                                            ),
                                                        }[header.column.getIsSorted() as string] ??
                                                            null}
                                                    </span>
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody>
                                    {table.getRowModel().rows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={columns.length}
                                                className="px-4 py-12 text-center text-textSecondary"
                                            >
                                                No results match your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        table.getRowModel().rows.map((row) => (
                                            <tr
                                                key={row.id}
                                                onClick={() =>
                                                    handleRowClick(getRowId(row.original))
                                                }
                                                className={clsx(
                                                    'border-b border-border last:border-0 transition-colors cursor-pointer',
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
                                Page {pagination.pageIndex + 1} of {table.getPageCount()}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                    className="p-1.5 rounded text-textSecondary hover:text-textPrimary hover:bg-bgSurface disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                    aria-label="Previous page"
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
                                    aria-label="Next page"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {selectedItem && (
                    <div className="flex-1 min-w-[300px] max-w-[600px]">
                        <div className="sticky top-4 rounded-lg border border-border bg-bgSurface p-5">
                            <div className="flex items-start justify-between mb-2">
                                <h2 className="text-lg font-bold text-textPrimary">
                                    {'name' in selectedItem
                                        ? (selectedItem as { name: string }).name
                                        : selectedItem.id}
                                </h2>
                                <button
                                    onClick={() => setSelectedId(null)}
                                    className="text-textSecondary hover:text-textPrimary transition-colors"
                                    aria-label="Close detail"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            {renderDetail(selectedItem)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
