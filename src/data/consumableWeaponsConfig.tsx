import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { ConsumableWeaponEntry } from './consumableWeaponsData';

export const CONSUMABLE_WEAPONS_COLUMNS: ColumnDef<ConsumableWeaponEntry>[] = [
    {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        enableSorting: true,
    },
    {
        id: 'type',
        header: 'Type',
        accessorKey: 'type',
        enableSorting: true,
    },
    {
        id: 'damage',
        header: 'Damage',
        accessorKey: 'damage',
        enableSorting: true,
    },
    {
        id: 'damageType',
        header: 'Dmg Type',
        accessorKey: 'damageType',
        enableSorting: true,
        cell: ({ getValue }) => {
            const dt = getValue<string>();
            const colors: Record<string, string> = {
                L: 'text-red-400',
                B: 'text-yellow-400',
                Special: 'text-blue-400',
            };
            return <span className={`font-medium ${colors[dt] ?? ''}`}>{dt}</span>;
        },
    },
    {
        id: 'falloff',
        header: 'Falloff',
        accessorKey: 'falloff',
        enableSorting: false,
    },
    {
        id: 'cost',
        header: 'Cost',
        accessorKey: 'cost',
        enableSorting: true,
    },
];

export function renderConsumableWeaponDetail(weapon: ConsumableWeaponEntry): ReactNode {
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">{weapon.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Type
                    </span>
                    <p className="text-textSecondary">{weapon.type}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Damage
                    </span>
                    <p className="text-textSecondary">
                        {weapon.damage}{' '}
                        <span
                            className={
                                weapon.damageType === 'L'
                                    ? 'text-red-400'
                                    : weapon.damageType === 'B'
                                      ? 'text-yellow-400'
                                      : 'text-blue-400'
                            }
                        >
                            ({weapon.damageType})
                        </span>
                    </p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Falloff
                    </span>
                    <p className="text-textSecondary">{weapon.falloff}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        Cost
                    </span>
                    <p className="text-textSecondary">{weapon.cost}</p>
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
