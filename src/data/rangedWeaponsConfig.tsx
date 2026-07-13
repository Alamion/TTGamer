import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { RangedWeaponEntry } from './rangedWeaponsData';

export const RANGED_WEAPONS_COLUMNS: ColumnDef<RangedWeaponEntry>[] = [
    {
        id: 'name',
        header: 'Weapon',
        accessorKey: 'name',
        enableSorting: true,
    },
    {
        id: 'damage',
        header: 'Dmg',
        accessorKey: 'damage',
        enableSorting: true,
    },
    {
        id: 'range',
        header: 'Range',
        accessorKey: 'range',
        enableSorting: true,
    },
    {
        id: 'ammo',
        header: 'Ammo',
        accessorKey: 'ammo',
        enableSorting: true,
    },
    {
        id: 'difficulty',
        header: 'Diff',
        accessorKey: 'difficulty',
        enableSorting: true,
    },
    {
        id: 'conceal',
        header: 'Conceal',
        accessorKey: 'conceal',
        enableSorting: true,
    },
];

export function renderRangedWeaponDetail(weapon: RangedWeaponEntry): ReactNode {
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">{weapon.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Damage
                    </span>
                    <p className="text-textSecondary">{weapon.damage}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Range
                    </span>
                    <p className="text-textSecondary">{weapon.range}m</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Ammo
                    </span>
                    <p className="text-textSecondary">{weapon.ammo}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Difficulty
                    </span>
                    <p className="text-textSecondary">{weapon.difficulty}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Conceal
                    </span>
                    <p className="text-textSecondary">{weapon.conceal}</p>
                </div>
            </div>
            <div className="mt-3">
                <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                    Notes
                </span>
                <p className="text-sm text-textSecondary mt-1">{weapon.notes}</p>
            </div>
        </>
    );
}
