import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { BackgroundEntry } from './backgroundsData';

export const BACKGROUND_COLUMNS: ColumnDef<BackgroundEntry>[] = [
    {
        id: 'name',
        header: 'Background',
        accessorKey: 'name',
        enableSorting: true,
    },
    {
        id: 'shortDescription',
        header: 'Description',
        accessorKey: 'shortDescription',
        enableSorting: true,
        size: 350,
    },
    {
        id: 'category',
        header: 'Category',
        accessorKey: 'category',
        enableSorting: true,
    },
];

export function renderBackgroundDetail(background: BackgroundEntry): ReactNode {
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {background.description}
            </p>
            <div>
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    Dot Rank
                </h5>
                <ul className="space-y-1">
                    {background.scale.map((s, i) => (
                        <li key={i} className="text-xs text-textSecondary">
                            {'\u2022'.repeat(i + 1)} {s}
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}
