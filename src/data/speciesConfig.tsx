import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { FilterConfig } from '@site/src/shared/components/DataCatalog';
import { EraTags } from '@site/src/shared/components/EraTags';
import { catalogEntryText } from '@site/src/sheet_manager/systems/catalogs';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { columnHeader, enumLabelMeta, localizedTextMeta, useCatalogText } from './catalogI18n';
import { arrayIncludesAnyFilterFn } from './dataFilters';
import { MERITS_FLAWS } from './meritsFlawsData';
import type { SpeciesEntry } from './speciesData';

const CATALOG_ID = 'species';
const MERITS_FLAWS_CATALOG_ID = 'merits-flaws';
const messages = uiMessages.catalogs.species;

function getMeritFlaw(id: string) {
    const item = MERITS_FLAWS.find((mf) => mf.id === id);
    if (!item) {
        console.warn(`Merit/Flaw not found: ${id}`);
        return { id, name: id, cost: 0 };
    }
    return item;
}

function calcFreebieAdjustment(species: SpeciesEntry): number {
    const meritCost = species.merits.reduce((sum, id) => sum + getMeritFlaw(id).cost, 0);
    const flawCost = species.flaws.reduce((sum, id) => sum + getMeritFlaw(id).cost, 0);
    return flawCost - meritCost;
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

export const SPECIES_COLUMNS: ColumnDef<SpeciesEntry>[] = [
    {
        id: 'name',
        header: columnHeader(messages.columns.name),
        accessorKey: 'name',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'name'),
    },
    {
        id: 'freebieAdjustment',
        header: columnHeader(messages.columns.freebieAdjustment),
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
        header: columnHeader(messages.columns.category),
        accessorKey: 'category',
        enableSorting: true,
        meta: enumLabelMeta(CATALOG_ID, 'category'),
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

export const SPECIES_FILTERS: FilterConfig[] = [
    { columnId: 'category', label: messages.columns.category },
    { columnId: 'eras', label: messages.columns.eras, mode: 'multi' },
];

function MeritFlawList({
    items,
    type,
}: {
    items: { name: string; cost: number }[];
    type: 'merit' | 'flaw';
}) {
    if (items.length === 0)
        return (
            <p className="text-sm text-textSecondary italic">{translate(messages.detail.none)}</p>
        );
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

function SpeciesDetail({ species }: { species: SpeciesEntry }) {
    const t = useCatalogText(CATALOG_ID);
    const adjustment = calcFreebieAdjustment(species);
    const toItem = (id: string) => {
        const item = getMeritFlaw(id);
        return {
            name: catalogEntryText(MERITS_FLAWS_CATALOG_ID, item, 'name', t.locale) ?? item.name,
            cost: item.cost,
        };
    };
    const meritItems = species.merits.map(toItem);
    const flawItems = species.flaws.map(toItem);

    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {t.text(species, 'description')}
            </p>

            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    {translate(messages.detail.freebieAdjustment)}
                </h5>
                <p className="text-sm text-textSecondary">
                    {adjustment > 0 ? `+${adjustment}` : adjustment}
                </p>
            </div>

            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    {translate(messages.detail.eras)}
                </h5>
                <EraTags eras={species.eras} getLabel={(era) => t.label('eras', era)} />
            </div>

            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    {translate(messages.detail.merits)}
                </h5>
                <MeritFlawList items={meritItems} type="merit" />
            </div>

            <div>
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    {translate(messages.detail.flaws)}
                </h5>
                <MeritFlawList items={flawItems} type="flaw" />
            </div>
        </>
    );
}

export function renderSpeciesDetail(species: SpeciesEntry): ReactNode {
    return <SpeciesDetail species={species} />;
}
