import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { FilterConfig } from '@site/src/shared/components/DataCatalog';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { columnHeader, enumLabelMeta, localizedTextMeta, useCatalogText } from './catalogI18n';
import type { ToolGearEntry } from './toolsGearData';

const CATALOG_ID = 'tools-gear';
const messages = uiMessages.catalogs.toolsGear;

export const TOOLS_GEAR_COLUMNS: ColumnDef<ToolGearEntry>[] = [
    {
        id: 'name',
        header: columnHeader(messages.columns.name),
        accessorKey: 'name',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'name'),
    },
    {
        id: 'category',
        header: columnHeader(messages.columns.category),
        accessorKey: 'category',
        enableSorting: true,
        meta: enumLabelMeta(CATALOG_ID, 'category'),
    },
    {
        id: 'effect',
        header: columnHeader(messages.columns.effect),
        accessorKey: 'effect',
        enableSorting: false,
        meta: localizedTextMeta(CATALOG_ID, 'effect'),
    },
    {
        id: 'cost',
        header: columnHeader(messages.columns.cost),
        accessorKey: 'cost',
        enableSorting: true,
    },
];

export const TOOLS_GEAR_FILTERS: FilterConfig[] = [
    { columnId: 'category', label: messages.columns.category },
];

function ToolGearDetail({ item }: { item: ToolGearEntry }) {
    const t = useCatalogText(CATALOG_ID);
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {t.text(item, 'description')}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.category)}
                    </span>
                    <p className="text-textSecondary">{t.label('category', item.category)}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.cost)}
                    </span>
                    <p className="text-textSecondary">{item.cost}</p>
                </div>
                <div className="col-span-2">
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.effect)}
                    </span>
                    <p className="text-sm text-textSecondary mt-1">{t.text(item, 'effect')}</p>
                </div>
            </div>
        </>
    );
}

export function renderToolGearDetail(item: ToolGearEntry): ReactNode {
    return <ToolGearDetail item={item} />;
}
