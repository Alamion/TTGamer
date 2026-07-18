import type { Row } from '@tanstack/react-table';

export function arrayIncludesAnyFilterFn<T>(
    row: Row<T>,
    columnId: string,
    filterValue: string
): boolean {
    if (!filterValue) return true;
    const value = row.getValue<unknown>(columnId);
    if (!Array.isArray(value)) return false;
    const selected = filterValue.split(',').filter(Boolean);
    if (selected.length === 0) return true;
    return selected.some((s) => value.includes(s));
}

export function booleanFilterFn<T>(row: Row<T>, columnId: string, filterValue: string): boolean {
    if (!filterValue) return true;
    const value = row.getValue<boolean>(columnId);
    return filterValue === 'true' ? value === true : value === false;
}
