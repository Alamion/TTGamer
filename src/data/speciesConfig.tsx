import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { SpeciesEntry } from './speciesData';
import { MERITS_FLAWS } from './meritsFlawsData';
import { arrayIncludesAnyFilterFn } from './dataFilters';
import { EraTags } from '@site/src/shared/components/EraTags';

function getMeritFlaw(id: string) {
    const item = MERITS_FLAWS.find((mf) => mf.id === id);
    if (!item) {
        console.warn(`Merit/Flaw not found: ${id}`);
        return { name: id, cost: 0 };
    }
    return item;
}

function calcFreebieAdjustment(species: SpeciesEntry): number {
    const meritCost = species.merits.reduce((sum, id) => sum + getMeritFlaw(id).cost, 0);
    const flawCost = species.flaws.reduce((sum, id) => sum + getMeritFlaw(id).cost, 0);
    return flawCost - meritCost;
}

export const SPECIES_COLUMNS: ColumnDef<SpeciesEntry>[] = [
    {
        id: 'name',
        header: 'Species',
        accessorKey: 'name',
        enableSorting: true,
    },
    {
        id: 'freebieAdjustment',
        header: 'Freebie Adj.',
        accessorFn: (row) => calcFreebieAdjustment(row),
        enableSorting: true,
        cell: ({ getValue }) => {
            const val = getValue<number>();
            return (
                <span
                    className={
                        val > 0
                            ? 'text-green-400 font-medium'
                            : val < 0
                              ? 'text-red-400 font-medium'
                              : 'font-medium'
                    }
                >
                    {val > 0 ? `+${val}` : val}
                </span>
            );
        },
    },
    {
        id: 'category',
        header: 'Category',
        accessorKey: 'category',
        enableSorting: true,
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

function MeritFlawList({
    items,
    type,
}: {
    items: { name: string; cost: number }[];
    type: 'merit' | 'flaw';
}) {
    if (items.length === 0) return <p className="text-sm text-textSecondary italic">None</p>;
    return (
        <ul className="space-y-1">
            {items.map((item) => (
                <li key={item.name} className="text-sm text-textSecondary">
                    <span
                        className={
                            type === 'merit'
                                ? 'text-green-400 font-medium'
                                : 'text-red-400 font-medium'
                        }
                    >
                        {type === 'merit' ? '+' : '–'}
                        {item.cost}
                    </span>{' '}
                    {item.name}
                </li>
            ))}
        </ul>
    );
}

export function renderSpeciesDetail(species: SpeciesEntry): ReactNode {
    const adjustment = calcFreebieAdjustment(species);
    const meritItems = species.merits.map((id) => ({
        name: getMeritFlaw(id).name,
        cost: getMeritFlaw(id).cost,
    }));
    const flawItems = species.flaws.map((id) => ({
        name: getMeritFlaw(id).name,
        cost: getMeritFlaw(id).cost,
    }));

    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">{species.description}</p>

            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    Freebie Adjustment
                </h5>
                <p className="text-sm text-textSecondary">
                    {adjustment > 0 ? `+${adjustment}` : adjustment}
                </p>
            </div>

            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    Eras
                </h5>
                <EraTags eras={species.eras} />
            </div>

            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    Merits
                </h5>
                <MeritFlawList items={meritItems} type="merit" />
            </div>

            <div>
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    Flaws
                </h5>
                <MeritFlawList items={flawItems} type="flaw" />
            </div>
        </>
    );
}
