import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { VehicleEntry } from './vehicleData';
import { arrayIncludesAnyFilterFn } from './dataFilters';
import { EraTags } from '@site/src/shared/components/EraTags';

function ScaleBadge({ scale }: { scale: VehicleEntry['scale'] }) {
    const colors: Record<string, string> = {
        Speeder: 'bg-blue-500/20 text-blue-300',
        Walker: 'bg-green-500/20 text-green-300',
        Starfighter: 'bg-yellow-500/20 text-yellow-300',
        Transport: 'bg-purple-500/20 text-purple-300',
        Capital: 'bg-red-500/20 text-red-300',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[scale] ?? ''}`}>
            {scale}
        </span>
    );
}

function Stat({ value }: { value: number | string | null | undefined }) {
    if (value === null || value === undefined || value === 0) {
        return <span className="text-textSecondary">—</span>;
    }
    return <span className="font-mono">{value}</span>;
}

export const VEHICLE_COLUMNS: ColumnDef<VehicleEntry>[] = [
    {
        id: 'name',
        header: 'Vehicle',
        accessorKey: 'name',
        enableSorting: true,
    },
    {
        id: 'scale',
        header: 'Scale',
        accessorKey: 'scale',
        enableSorting: true,
        cell: ({ getValue }) => <ScaleBadge scale={getValue<VehicleEntry['scale']>()} />,
    },
    {
        id: 'maneuverability',
        header: 'Maneuver',
        accessorKey: 'maneuverability',
        enableSorting: true,
        cell: ({ getValue }) => <Stat value={getValue<number>()} />,
    },
    {
        id: 'durability',
        header: 'Durability',
        accessorKey: 'durability',
        enableSorting: true,
        cell: ({ getValue, row }) => {
            const val = getValue<number>();
            const reroll = row.original.durabilityReroll;
            return (
                <span className="font-mono">
                    {val === 0 ? (
                        <span className="text-textSecondary">—</span>
                    ) : (
                        <>
                            {val}D
                            {reroll ? (
                                <span className="text-xs text-yellow-400 ml-1" title="Reroll 10s">
                                    ⟳
                                </span>
                            ) : (
                                ''
                            )}
                        </>
                    )}
                </span>
            );
        },
    },
    {
        id: 'speed',
        header: 'Speed',
        accessorKey: 'speed',
        enableSorting: true,
        cell: ({ getValue }) => <Stat value={getValue<number | string>()} />,
    },
    {
        id: 'hyperdrive',
        header: 'Hyper',
        accessorKey: 'hyperdrive',
        enableSorting: true,
        cell: ({ getValue }) => <Stat value={getValue<number | null>()} />,
    },
    {
        id: 'shields',
        header: 'Shields',
        accessorKey: 'shields',
        enableSorting: true,
        cell: ({ getValue }) => <Stat value={getValue<number>()} />,
    },
    {
        id: 'eras',
        header: 'Era',
        accessorKey: 'eras',
        enableSorting: false,
        filterFn: arrayIncludesAnyFilterFn,
        cell: ({ getValue }) => {
            const eras = getValue<string[]>();
            if (!eras || eras.length === 0) return <span className="text-textSecondary">—</span>;
            return (
                <span className="text-xs text-textSecondary whitespace-nowrap">
                    {eras[0]}
                    {eras.length > 1 && (
                        <span className="ml-1 px-1 py-0.5 rounded bg-bgSurface text-textTertiary text-[10px]">
                            +{eras.length - 1}
                        </span>
                    )}
                </span>
            );
        },
    },
];

function DetailStatRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-4 py-0.5">
            <span className="text-xs font-medium text-textSecondary uppercase tracking-wider">
                {label}
            </span>
            <span className="text-sm text-textPrimary">{value}</span>
        </div>
    );
}

export function renderVehicleDetail(vehicle: VehicleEntry): ReactNode {
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">{vehicle.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        Configuration
                    </h5>
                    <DetailStatRow
                        label="Maneuver"
                        value={<span className="font-mono">{vehicle.maneuverability}D</span>}
                    />
                    <DetailStatRow
                        label="Durability"
                        value={
                            <span className="font-mono">
                                {vehicle.durability}D
                                {vehicle.durabilityReroll && (
                                    <span
                                        className="text-xs text-yellow-400 ml-1"
                                        title="Reroll 10s"
                                    >
                                        ⟳
                                    </span>
                                )}
                            </span>
                        }
                    />
                    <DetailStatRow label="Speed" value={<Stat value={vehicle.speed} />} />
                    <DetailStatRow label="Altitude" value={vehicle.altitude || 'Ground'} />
                    <DetailStatRow
                        label="Shields"
                        value={
                            vehicle.shields > 0 ? (
                                <span className="font-mono">{vehicle.shields}D</span>
                            ) : (
                                <span className="text-textSecondary">None</span>
                            )
                        }
                    />
                </div>
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        Astrogation
                    </h5>
                    <DetailStatRow
                        label="Hyperdrive"
                        value={
                            vehicle.hyperdrive !== null ? (
                                <span className="font-mono">{vehicle.hyperdrive}</span>
                            ) : (
                                <span className="text-textSecondary">None</span>
                            )
                        }
                    />
                    <DetailStatRow label="Nav Computer" value={vehicle.navComputer} />
                    <DetailStatRow
                        label="Comm/Sensors"
                        value={
                            vehicle.commSensors > 0 ? (
                                <span className="font-mono">{vehicle.commSensors}D</span>
                            ) : (
                                <span className="text-textSecondary">None</span>
                            )
                        }
                    />
                    <DetailStatRow
                        label="Sensor Range"
                        value={
                            vehicle.sensorRange !== null ? (
                                <span className="font-mono">{vehicle.sensorRange}</span>
                            ) : (
                                <span className="text-textSecondary">—</span>
                            )
                        }
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        Crew & Capacity
                    </h5>
                    <DetailStatRow label="Crew" value={vehicle.crew} />
                    <DetailStatRow label="Passengers" value={vehicle.passengers} />
                    <DetailStatRow label="Cargo" value={vehicle.cargo} />
                    {vehicle.consumables && (
                        <DetailStatRow label="Consumables" value={vehicle.consumables} />
                    )}
                </div>
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        Physical
                    </h5>
                    <DetailStatRow label="Type" value={vehicle.category} />
                    <DetailStatRow label="Length" value={vehicle.length} />
                    <DetailStatRow label="Era" value={<EraTags eras={vehicle.eras} />} />
                </div>
            </div>

            {vehicle.weapons.length > 0 && (
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        Weapons
                    </h5>
                    <div className="space-y-1">
                        {vehicle.weapons.map((w) => (
                            <div key={w.name} className="flex items-center gap-2 text-sm font-mono">
                                <span className="text-textPrimary">{w.name}</span>
                                <span className="text-textTertiary">[{w.arc}]</span>
                                <span className="text-textSecondary">{w.damage}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
