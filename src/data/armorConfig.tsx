import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { ArmorEntry } from './armorData';

export const ARMOR_COLUMNS: ColumnDef<ArmorEntry>[] = [
    {
        id: 'name',
        header: 'Armor',
        accessorKey: 'name',
        enableSorting: true,
    },
    {
        id: 'classVal',
        header: 'Class',
        accessorKey: 'classVal',
        enableSorting: true,
    },
    {
        id: 'ar',
        header: 'AR',
        accessorKey: 'ar',
        enableSorting: true,
    },
    {
        id: 'dexPenalty',
        header: 'Dex Penalty',
        accessorKey: 'dexPenalty',
        enableSorting: true,
    },
    {
        id: 'cost',
        header: 'Cost',
        accessorKey: 'cost',
        enableSorting: true,
    },
];

export function renderArmorDetail(armor: ArmorEntry): ReactNode {
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">{armor.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Class
                    </span>
                    <p className="text-textSecondary">{armor.classVal}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        AR (Soak Dice)
                    </span>
                    <p className="text-textSecondary">{armor.ar}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Dex Penalty
                    </span>
                    <p className="text-textSecondary">{armor.dexPenalty}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Cost
                    </span>
                    <p className="text-textSecondary">{armor.cost}</p>
                </div>
            </div>
            <div className="mt-3">
                <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                    Notes
                </span>
                <p className="text-sm text-textSecondary mt-1">{armor.notes}</p>
            </div>
        </>
    );
}
