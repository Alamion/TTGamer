import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { MeleeWeaponEntry } from './meleeWeaponsData';

export const MELEE_WEAPONS_COLUMNS: ColumnDef<MeleeWeaponEntry>[] = [
    {
        id: 'name',
        header: 'Weapon',
        accessorKey: 'name',
        enableSorting: true,
    },
    {
        id: 'difficulty',
        header: 'Diff',
        accessorKey: 'difficulty',
        enableSorting: true,
    },
    {
        id: 'damage',
        header: 'Damage',
        accessorKey: 'damage',
        enableSorting: true,
    },
    {
        id: 'conceal',
        header: 'Conceal',
        accessorKey: 'conceal',
        enableSorting: true,
    },
];

export function renderMeleeWeaponDetail(weapon: MeleeWeaponEntry): ReactNode {
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
