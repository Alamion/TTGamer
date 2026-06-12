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
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useHistory, useLocation } from '@docusaurus/router';

export interface DataCatalogProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    renderDetail: (item: T) => ReactNode;
    getRowId?: (item: T) => string;
    searchPlaceholder?: string;
    filterColumnId?: string;
    pageSize?: number;
}

export function DataCatalog<T extends { id: string }>({
    data,
    columns,
    renderDetail,
    getRowId = (item: T) => item.id,
    searchPlaceholder = 'Search...',
    filterColumnId,
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

    const categoryValues = useMemo(() => {
        if (!filterColumnId) return [];
        const faceted = table.getColumn(filterColumnId)?.getFacetedUniqueValues();
        if (!faceted) return [];
        return Array.from(faceted.keys()).sort() as string[];
    }, [table, filterColumnId]);

    const handleRowClick = (id: string) => {
        setSelectedId((prev) => (prev === id ? null : id));
    };

    function buildSearchString() {
        const params = new URLSearchParams();
        if (globalFilter) params.set('search', globalFilter);
        if (filterColumnId && columnFilters.length > 0) {
            const cat = columnFilters.find((f) => f.id === filterColumnId)?.value;
            if (cat) params.set('category', String(cat));
        }
        if (sorting.length > 0) {
            const { id, desc } = sorting[0];
            params.set('sort', `${id}:${desc ? 'desc' : 'asc'}`);
        }
        if (selectedId) params.set('selected', selectedId);
        if (pagination.pageIndex > 0) params.set('page', String(pagination.pageIndex + 1));
        return params.toString();
    }

    function applyUrlParams(search: string) {
        const params = new URLSearchParams(search);
        setGlobalFilter(params.get('search') ?? '');
        if (filterColumnId) {
            const cat = params.get('category');
            setColumnFilters(cat ? [{ id: filterColumnId, value: cat }] : []);
        }
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

    const handleCategoryChange = (value: string) => {
        setColumnFilters(value ? [{ id: filterColumnId!, value }] : []);
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

                {filterColumnId && (
                    <select
                        value={
                            (columnFilters.find((f) => f.id === filterColumnId)?.value as string) ??
                            ''
                        }
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg border border-border bg-bgSurface text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                        aria-label="Filter by category"
                    >
                        <option value="">All Categories</option>
                        {categoryValues.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                )}

                <span className="text-sm text-textSecondary whitespace-nowrap">
                    {table.getRowModel().rows.length} / {data.length}
                </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
                <div className="shrink-0">
                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-auto text-sm">
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
                                                        asc: <ChevronUp className="w-3.5 h-3.5" />,
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
                                            onClick={() => handleRowClick(getRowId(row.original))}
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
