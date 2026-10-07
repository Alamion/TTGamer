import type { ColumnDef, ColumnMeta, FilterFn, Row, RowData } from '@tanstack/react-table';
import {
    columnFacetingFeature,
    columnFilteringFeature,
    columnVisibilityFeature,
    createFacetedRowModel,
    createFacetedUniqueValues,
    createFilteredRowModel,
    createPaginatedRowModel,
    createSortedRowModel,
    filterFns,
    globalFilteringFeature,
    rowPaginationFeature,
    rowSortingFeature,
    sortFns,
    tableFeatures,
} from '@tanstack/react-table';

/**
 * What every catalog table can do: sort, filter by column and globally, page, hide columns, and
 * list a column's values for its filter. React Table 9 registers features and their built-in
 * sort and filter functions explicitly; the stock sets keep `'auto'` resolving as before.
 */
export const catalogFeatures = tableFeatures({
    columnFacetingFeature,
    columnFilteringFeature,
    columnVisibilityFeature,
    globalFilteringFeature,
    rowPaginationFeature,
    rowSortingFeature,
    filteredRowModel: createFilteredRowModel(),
    sortedRowModel: createSortedRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    facetedRowModel: createFacetedRowModel(),
    facetedUniqueValues: createFacetedUniqueValues(),
    filterFns,
    sortFns,
});

export type CatalogFeatures = typeof catalogFeatures;

// `TValue` is any value a column holds, as React Table 8's `ColumnDef<T>` allowed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CatalogColumnDef<TData extends RowData> = ColumnDef<CatalogFeatures, TData, any>;
export type CatalogColumnMeta<TData extends RowData> = ColumnMeta<CatalogFeatures, TData>;
export type CatalogRow<TData extends RowData> = Row<CatalogFeatures, TData>;
export type CatalogFilterFn<TData extends RowData> = FilterFn<CatalogFeatures, TData>;
