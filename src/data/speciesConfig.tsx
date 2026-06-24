import { type ColumnDef, type Row } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { SpeciesEntry } from './speciesData';

function arrayIncludesAnyFilterFn<T>(row: Row<T>, columnId: string, filterValue: string): boolean {
    if (!filterValue) return true;
    const value = row.getValue<unknown>(columnId);
    if (!Array.isArray(value)) return false;
    const selected = filterValue.split(',').filter(Boolean);
    if (selected.length === 0) return true;
    return selected.some((s) => value.includes(s));
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
        accessorKey: 'freebieAdjustment',
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
        header: 'Eras',
        accessorKey: 'eras',
        enableSorting: false,
        filterFn: arrayIncludesAnyFilterFn,
        cell: ({ getValue }) => {
            const eras = getValue<string[]>();
            return (
                <div className="flex flex-wrap gap-1 max-w-[240px]">
                    {eras.map((era) => (
                        <span
                            key={era}
                            className="px-1.5 py-0.5 text-[10px] rounded-full bg-bgBase text-textSecondary border border-border whitespace-nowrap"
                        >
                            {era}
                        </span>
                    ))}
                </div>
            );
        },
    },
];

function EraTags({ eras }: { eras: string[] }) {
    return (
        <div className="flex flex-wrap gap-1">
            {eras.map((era) => (
                <span
                    key={era}
                    className="px-1.5 py-0.5 text-[10px] rounded-full bg-bgBase text-textSecondary border border-border whitespace-nowrap"
                >
                    {era}
                </span>
            ))}
        </div>
    );
}

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
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">{species.description}</p>

            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    Freebie Adjustment
                </h5>
                <p className="text-sm text-textSecondary">
                    {species.freebieAdjustment > 0
                        ? `+${species.freebieAdjustment}`
                        : species.freebieAdjustment}
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
                <MeritFlawList items={species.merits} type="merit" />
            </div>

            <div>
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    Flaws
                </h5>
                <MeritFlawList items={species.flaws} type="flaw" />
            </div>
        </>
    );
}
