import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { FilterConfig } from '@site/src/shared/components/DataCatalog';
import { EraTags } from '@site/src/shared/components/EraTags';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { columnHeader, enumLabelMeta, localizedTextMeta, useCatalogText } from './catalogI18n';
import { arrayIncludesAnyFilterFn } from './dataFilters';
import type { VehicleEntry } from './vehicleData';

const CATALOG_ID = 'vehicles';
const messages = uiMessages.catalogs.vehicles;
const detail = messages.detail;

function ScaleBadge({ scale }: { scale: VehicleEntry['scale'] }) {
    const t = useCatalogText(CATALOG_ID);
    const colors: Record<string, string> = {
        Speeder: 'bg-blue-500/20 text-blue-300',
        Walker: 'bg-green-500/20 text-green-300',
        Starfighter: 'bg-yellow-500/20 text-yellow-300',
        Transport: 'bg-purple-500/20 text-purple-300',
        Capital: 'bg-red-500/20 text-red-300',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[scale] ?? ''}`}>
            {t.label('scale', scale)}
        </span>
    );
}

function FirstEra({ eras }: { eras: string[] }) {
    const t = useCatalogText(CATALOG_ID);
    if (!eras || eras.length === 0) return <span className="text-textSecondary">—</span>;
    return (
        <span className="text-xs text-textSecondary whitespace-nowrap">
            {t.label('eras', eras[0])}
            {eras.length > 1 && (
                <span className="ml-1 px-1 py-0.5 rounded bg-bgSurface text-textTertiary text-[10px]">
                    +{eras.length - 1}
                </span>
            )}
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
        header: columnHeader(messages.columns.name),
        accessorKey: 'name',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'name'),
    },
    {
        id: 'scale',
        header: columnHeader(messages.columns.scale),
        accessorKey: 'scale',
        enableSorting: true,
        meta: enumLabelMeta(CATALOG_ID, 'scale'),
        cell: ({ getValue }) => <ScaleBadge scale={getValue<VehicleEntry['scale']>()} />,
    },
    {
        id: 'maneuverability',
        header: columnHeader(messages.columns.maneuverability),
        accessorKey: 'maneuverability',
        enableSorting: true,
        cell: ({ getValue }) => <Stat value={getValue<number>()} />,
    },
    {
        id: 'durability',
        header: columnHeader(messages.columns.durability),
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
                                <span
                                    className="text-xs text-yellow-400 ml-1"
                                    title={translate(detail.reroll)}
                                >
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
        header: columnHeader(messages.columns.speed),
        accessorKey: 'speed',
        enableSorting: true,
        cell: ({ getValue }) => <Stat value={getValue<number | string>()} />,
    },
    {
        id: 'hyperdrive',
        header: columnHeader(messages.columns.hyperdrive),
        accessorKey: 'hyperdrive',
        enableSorting: true,
        cell: ({ getValue }) => <Stat value={getValue<number | null>()} />,
    },
    {
        id: 'shields',
        header: columnHeader(messages.columns.shields),
        accessorKey: 'shields',
        enableSorting: true,
        cell: ({ getValue }) => <Stat value={getValue<number>()} />,
    },
    {
        id: 'eras',
        header: columnHeader(messages.columns.eras),
        accessorKey: 'eras',
        enableSorting: false,
        filterFn: arrayIncludesAnyFilterFn,
        meta: enumLabelMeta(CATALOG_ID, 'eras'),
        cell: ({ getValue }) => <FirstEra eras={getValue<string[]>()} />,
    },
];

export const VEHICLE_FILTERS: FilterConfig[] = [
    { columnId: 'scale', label: messages.columns.scale },
    { columnId: 'eras', label: messages.columns.eras, mode: 'multi' },
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

function VehicleDetail({ vehicle }: { vehicle: VehicleEntry }) {
    const t = useCatalogText(CATALOG_ID);
    const none = <span className="text-textSecondary">{translate(detail.none)}</span>;
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {t.text(vehicle, 'description')}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        {translate(detail.configuration)}
                    </h5>
                    <DetailStatRow
                        label={translate(detail.maneuverability)}
                        value={<span className="font-mono">{vehicle.maneuverability}D</span>}
                    />
                    <DetailStatRow
                        label={translate(detail.durability)}
                        value={
                            <span className="font-mono">
                                {vehicle.durability}D
                                {vehicle.durabilityReroll && (
                                    <span
                                        className="text-xs text-yellow-400 ml-1"
                                        title={translate(detail.reroll)}
                                    >
                                        ⟳
                                    </span>
                                )}
                            </span>
                        }
                    />
                    <DetailStatRow
                        label={translate(detail.speed)}
                        value={
                            <Stat
                                value={
                                    typeof vehicle.speed === 'string'
                                        ? t.text(vehicle, 'speed')
                                        : vehicle.speed
                                }
                            />
                        }
                    />
                    <DetailStatRow
                        label={translate(detail.altitude)}
                        value={t.text(vehicle, 'altitude') || translate(detail.ground)}
                    />
                    <DetailStatRow
                        label={translate(detail.shields)}
                        value={
                            vehicle.shields > 0 ? (
                                <span className="font-mono">{vehicle.shields}D</span>
                            ) : (
                                none
                            )
                        }
                    />
                </div>
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        {translate(detail.astrogation)}
                    </h5>
                    <DetailStatRow
                        label={translate(detail.hyperdrive)}
                        value={
                            vehicle.hyperdrive !== null ? (
                                <span className="font-mono">{vehicle.hyperdrive}</span>
                            ) : (
                                none
                            )
                        }
                    />
                    <DetailStatRow
                        label={translate(detail.navComputer)}
                        value={t.text(vehicle, 'navComputer')}
                    />
                    <DetailStatRow
                        label={translate(detail.commSensors)}
                        value={
                            vehicle.commSensors > 0 ? (
                                <span className="font-mono">{vehicle.commSensors}D</span>
                            ) : (
                                none
                            )
                        }
                    />
                    <DetailStatRow
                        label={translate(detail.sensorRange)}
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
                        {translate(detail.crewCapacity)}
                    </h5>
                    <DetailStatRow label={translate(detail.crew)} value={t.text(vehicle, 'crew')} />
                    <DetailStatRow
                        label={translate(detail.passengers)}
                        value={t.text(vehicle, 'passengers')}
                    />
                    <DetailStatRow
                        label={translate(detail.cargo)}
                        value={t.text(vehicle, 'cargo')}
                    />
                    {vehicle.consumables && (
                        <DetailStatRow
                            label={translate(detail.consumables)}
                            value={t.text(vehicle, 'consumables')}
                        />
                    )}
                </div>
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        {translate(detail.physical)}
                    </h5>
                    <DetailStatRow
                        label={translate(detail.type)}
                        value={t.label('category', vehicle.category)}
                    />
                    <DetailStatRow
                        label={translate(detail.length)}
                        value={t.text(vehicle, 'length')}
                    />
                    <DetailStatRow
                        label={translate(detail.era)}
                        value={
                            <EraTags eras={vehicle.eras} getLabel={(era) => t.label('eras', era)} />
                        }
                    />
                </div>
            </div>

            {vehicle.weapons.length > 0 && (
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        {translate(detail.weapons)}
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

export function renderVehicleDetail(vehicle: VehicleEntry): ReactNode {
    return <VehicleDetail vehicle={vehicle} />;
}
