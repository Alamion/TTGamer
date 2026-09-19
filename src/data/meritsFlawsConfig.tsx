import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { FilterConfig } from '@site/src/shared/components/DataCatalog';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { columnHeader, enumLabelMeta, localizedTextMeta, useCatalogText } from './catalogI18n';
import type { MeritFlawEntry } from './meritsFlawsData';

const CATALOG_ID = 'merits-flaws';
const messages = uiMessages.catalogs.meritsFlaws;

function Points({ count }: { count: number }) {
    const plural = usePluralMessage();
    return <>{plural(messages.points, count)}</>;
}

function TypeLabel({ type }: { type: MeritFlawEntry['type'] }) {
    const t = useCatalogText(CATALOG_ID);
    return (
        <span
            className={
                type === 'Merit'
                    ? 'text-green-400 font-medium'
                    : type === 'Flaw'
                      ? 'text-red-400 font-medium'
                      : 'text-textSecondary font-medium'
            }
        >
            {t.label('type', type)}
        </span>
    );
}

export const MERITS_FLAWS_COLUMNS: ColumnDef<MeritFlawEntry>[] = [
    {
        id: 'name',
        header: columnHeader(messages.columns.name),
        accessorKey: 'name',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'name'),
    },
    {
        id: 'cost',
        header: columnHeader(messages.columns.cost),
        accessorKey: 'cost',
        enableSorting: true,
        cell: ({ getValue }) => (
            <span className="font-medium tabular-nums">
                <Points count={getValue<number>()} />
            </span>
        ),
    },
    {
        id: 'type',
        header: columnHeader(messages.columns.type),
        accessorKey: 'type',
        enableSorting: true,
        meta: enumLabelMeta(CATALOG_ID, 'type'),
        cell: ({ getValue }) => <TypeLabel type={getValue<MeritFlawEntry['type']>()} />,
    },
    {
        id: 'shortDescription',
        header: columnHeader(messages.columns.shortDescription),
        accessorKey: 'shortDescription',
        enableSorting: false,
        size: 300,
        meta: localizedTextMeta(CATALOG_ID, 'shortDescription'),
    },
    {
        id: 'category',
        header: columnHeader(messages.columns.category),
        accessorKey: 'category',
        enableSorting: true,
        meta: enumLabelMeta(CATALOG_ID, 'category'),
    },
];

/** Type filter (merit, flaw, implant). */
export const MERITS_FLAWS_TYPE_FILTERS: FilterConfig[] = [
    { columnId: 'type', label: messages.columns.type },
];

/** Type and category filters for the full catalog. */
export const MERITS_FLAWS_FILTERS: FilterConfig[] = [
    ...MERITS_FLAWS_TYPE_FILTERS,
    { columnId: 'category', label: messages.columns.category },
];

/** Point cost as a severity filter (amputation and injury flaws). */
export const MERITS_FLAWS_SEVERITY_FILTERS: FilterConfig[] = [
    { columnId: 'cost', label: messages.filters.severity },
];

function MeritFlawDetail({ item }: { item: MeritFlawEntry }) {
    const t = useCatalogText(CATALOG_ID);
    const restriction = t.text(item, 'restriction');
    return (
        <>
            {restriction && (
                <p className="text-[11px] text-amber-400 font-medium uppercase tracking-wider mb-2">
                    {restriction}
                </p>
            )}
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {t.text(item, 'description')}
            </p>
            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    {translate(messages.detail.cost)}
                </h5>
                <p className="text-sm text-textSecondary">
                    {item.type === 'Implant' ? (
                        <span className="text-textSecondary font-medium">
                            {translate(messages.detail.implantNoCost)}
                        </span>
                    ) : (
                        <>
                            <span
                                className={
                                    item.type === 'Merit'
                                        ? 'text-green-400 font-medium'
                                        : 'text-red-400 font-medium'
                                }
                            >
                                {item.type === 'Merit' ? '+' : '–'}
                                <Points count={item.cost} />
                            </span>{' '}
                            {t.label('type', item.type)}
                        </>
                    )}
                </p>
            </div>
            {item.tags.length > 0 && (
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                        {translate(messages.detail.tags)}
                    </h5>
                    <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                            <span
                                key={tag}
                                className="px-1.5 py-0.5 text-[10px] rounded-full bg-bgBase text-textSecondary border border-border whitespace-nowrap"
                            >
                                {t.label('tags', tag)}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

export function renderMeritFlawDetail(item: MeritFlawEntry): ReactNode {
    return <MeritFlawDetail item={item} />;
}
