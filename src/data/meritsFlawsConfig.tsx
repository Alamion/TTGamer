import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { MeritFlawEntry } from './meritsFlawsData';

export const MERITS_FLAWS_COLUMNS: ColumnDef<MeritFlawEntry>[] = [
    {
        id: 'name',
        header: 'Merit / Flaw',
        accessorKey: 'name',
        enableSorting: true,
    },
    {
        id: 'cost',
        header: 'Cost',
        accessorKey: 'cost',
        enableSorting: true,
        cell: ({ getValue }) => {
            const val = getValue<number>();
            return (
                <span className="font-medium tabular-nums">
                    {val} {val === 1 ? 'pt' : 'pts'}
                </span>
            );
        },
    },
    {
        id: 'type',
        header: 'Type',
        accessorKey: 'type',
        enableSorting: true,
        cell: ({ getValue }) => {
            const val = getValue<'Merit' | 'Flaw'>();
            return (
                <span
                    className={
                        val === 'Merit' ? 'text-green-400 font-medium' : 'text-red-400 font-medium'
                    }
                >
                    {val}
                </span>
            );
        },
    },
    {
        id: 'shortDescription',
        header: 'Description',
        accessorKey: 'shortDescription',
        enableSorting: false,
        size: 300,
    },
    {
        id: 'category',
        header: 'Category',
        accessorKey: 'category',
        enableSorting: true,
    },
];

export function renderMeritFlawDetail(item: MeritFlawEntry): ReactNode {
    return (
        <>
            {item.restriction && (
                <p className="text-[11px] text-amber-400 font-medium uppercase tracking-wider mb-2">
                    {item.restriction}
                </p>
            )}
            <p className="text-sm text-textSecondary leading-relaxed mb-4">{item.description}</p>
            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    Cost
                </h5>
                <p className="text-sm text-textSecondary">
                    <span
                        className={
                            item.type === 'Merit'
                                ? 'text-green-400 font-medium'
                                : 'text-red-400 font-medium'
                        }
                    >
                        {item.type === 'Merit' ? '+' : '–'}
                        {item.cost} {item.cost === 1 ? 'pt' : 'pts'}
                    </span>{' '}
                    {item.type}
                </p>
            </div>
            {item.tags.length > 0 && (
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                        Tags
                    </h5>
                    <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                            <span
                                key={tag}
                                className="px-1.5 py-0.5 text-[10px] rounded-full bg-bgBase text-textSecondary border border-border whitespace-nowrap"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
