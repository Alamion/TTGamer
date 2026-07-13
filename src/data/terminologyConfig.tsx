import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { TerminologyEntry } from './terminologyData';

export const TERMINOLOGY_COLUMNS: ColumnDef<TerminologyEntry>[] = [
    {
        id: 'english',
        header: 'English',
        accessorKey: 'english',
        enableSorting: true,
    },
    {
        id: 'russian',
        header: 'Русский',
        accessorKey: 'russian',
        enableSorting: true,
    },
    {
        id: 'category',
        header: 'Section',
        accessorKey: 'category',
        enableSorting: true,
    },
];

export function renderTerminologyDetail(term: TerminologyEntry): ReactNode {
    return (
        <>
            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    Section
                </h5>
                <p className="text-sm text-textSecondary">{term.category}</p>
            </div>
            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    English
                </h5>
                <p className="text-sm text-textPrimary font-medium">{term.english}</p>
            </div>
            <div>
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    Русский
                </h5>
                <p className="text-sm text-textPrimary font-medium">{term.russian}</p>
            </div>
        </>
    );
}
