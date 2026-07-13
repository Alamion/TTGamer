import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { ToolGearEntry } from './toolsGearData';

export const TOOLS_GEAR_COLUMNS: ColumnDef<ToolGearEntry>[] = [
    {
        id: 'name',
        header: 'Item',
        accessorKey: 'name',
        enableSorting: true,
    },
    {
        id: 'category',
        header: 'Category',
        accessorKey: 'category',
        enableSorting: true,
    },
    {
        id: 'effect',
        header: 'Effect',
        accessorKey: 'effect',
        enableSorting: false,
    },
    {
        id: 'cost',
        header: 'Cost',
        accessorKey: 'cost',
        enableSorting: true,
    },
];

export function renderToolGearDetail(item: ToolGearEntry): ReactNode {
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">{item.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Category
                    </span>
                    <p className="text-textSecondary">{item.category}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Cost
                    </span>
                    <p className="text-textSecondary">{item.cost}</p>
                </div>
                <div className="col-span-2">
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Effect
                    </span>
                    <p className="text-sm text-textSecondary mt-1">{item.effect}</p>
                </div>
            </div>
        </>
    );
}
