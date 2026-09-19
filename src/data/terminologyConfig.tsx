import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { FilterConfig } from '@site/src/shared/components/DataCatalog';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { columnHeader, enumLabelMeta, useCatalogText } from './catalogI18n';
import type { TerminologyEntry } from './terminologyData';

const CATALOG_ID = 'terminology';
const messages = uiMessages.catalogs.terminology;

export const TERMINOLOGY_COLUMNS: ColumnDef<TerminologyEntry>[] = [
    {
        id: 'english',
        header: columnHeader(messages.columns.english),
        accessorKey: 'english',
        enableSorting: true,
    },
    {
        id: 'russian',
        header: columnHeader(messages.columns.russian),
        accessorKey: 'russian',
        enableSorting: true,
    },
    {
        id: 'category',
        header: columnHeader(messages.columns.category),
        accessorKey: 'category',
        enableSorting: true,
        meta: enumLabelMeta(CATALOG_ID, 'category'),
    },
];

export const TERMINOLOGY_FILTERS: FilterConfig[] = [
    { columnId: 'category', label: messages.columns.category },
];

function TerminologyDetail({ term }: { term: TerminologyEntry }) {
    const t = useCatalogText(CATALOG_ID);
    return (
        <>
            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    {translate(messages.columns.category)}
                </h5>
                <p className="text-sm text-textSecondary">{t.label('category', term.category)}</p>
            </div>
            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    {translate(messages.columns.english)}
                </h5>
                <p className="text-sm text-textPrimary font-medium">{term.english}</p>
            </div>
            <div>
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    {translate(messages.columns.russian)}
                </h5>
                <p className="text-sm text-textPrimary font-medium">{term.russian}</p>
            </div>
        </>
    );
}

export function renderTerminologyDetail(term: TerminologyEntry): ReactNode {
    return <TerminologyDetail term={term} />;
}
