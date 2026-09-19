import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { FilterConfig } from '@site/src/shared/components/DataCatalog';
import { ScaleList } from '@site/src/shared/components/DetailSections';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import type { BackgroundEntry } from './backgroundsData';
import { columnHeader, enumLabelMeta, localizedTextMeta, useCatalogText } from './catalogI18n';

const CATALOG_ID = 'backgrounds';
const messages = uiMessages.catalogs.backgrounds;

export const BACKGROUND_COLUMNS: ColumnDef<BackgroundEntry>[] = [
    {
        id: 'name',
        header: columnHeader(messages.columns.name),
        accessorKey: 'name',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'name'),
    },
    {
        id: 'shortDescription',
        header: columnHeader(messages.columns.shortDescription),
        accessorKey: 'shortDescription',
        enableSorting: true,
        size: 350,
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

export const BACKGROUND_FILTERS: FilterConfig[] = [
    { columnId: 'category', label: messages.columns.category },
];

function BackgroundDetail({ background }: { background: BackgroundEntry }) {
    const t = useCatalogText(CATALOG_ID);
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {t.text(background, 'description')}
            </p>
            <ScaleList
                scale={t.list(background, 'scale')}
                title={translate(messages.detail.dotRank)}
            />
        </>
    );
}

export function renderBackgroundDetail(background: BackgroundEntry): ReactNode {
    return <BackgroundDetail background={background} />;
}
