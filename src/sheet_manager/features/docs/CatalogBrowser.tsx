import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { DataCatalog } from '@site/src/shared/components/DataCatalog';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

import { reportSheetIssue } from '../../diagnostics';
import type { CatalogBindingEntry, CatalogBrowseColumn, CatalogMessage } from '../../systems';
import { CATALOG_BINDINGS } from '../sheet/data/catalogBindings';

const messages = uiMessages.sheet.catalogBrowser;

type BrowserRow = { id: string; name: string; children: string[] } & Record<string, unknown>;

const isMessage = (value: unknown): value is CatalogMessage =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as CatalogMessage).id === 'string' &&
    typeof (value as CatalogMessage).message === 'string';

function cellText(
    catalog: CatalogBindingEntry,
    entry: CatalogBindingEntry['entries'][number],
    column: CatalogBrowseColumn,
    lang: string
): string {
    const value = (entry as unknown as Record<string, unknown>)[column.key];
    if (isMessage(value)) return translate(value);
    if (typeof value === 'string' && column.labels?.[value]) {
        return translate(column.labels[value]);
    }
    if (typeof value === 'string') return catalog.entryText(entry, column.key, lang) ?? value;
    return value === undefined || value === null ? '' : String(value);
}

/**
 * A searchable documentation table over any catalog that declares `browse` (plugin-owned
 * columns, filters, and child entries). Names and texts follow the reader's locale.
 */
export function CatalogBrowser({ catalogId }: { catalogId: string }) {
    const lang = useDocusaurusContext().i18n.currentLocale;
    const catalog = CATALOG_BINDINGS.get(catalogId);
    const browse = catalog?.browse;
    const children = browse?.children ? CATALOG_BINDINGS.get(browse.children.catalogId) : undefined;

    const rows = useMemo<BrowserRow[]>(() => {
        if (!catalog || !browse) return [];
        return catalog.entries.map((entry) => ({
            id: entry.id,
            name: catalog.entryLabel(entry, lang),
            ...Object.fromEntries(
                browse.columns.map((column) => [column.key, cellText(catalog, entry, column, lang)])
            ),
            children: children
                ? children.entries
                      .filter(
                          (child) =>
                              (child as unknown as Record<string, unknown>)[
                                  browse.children!.key
                              ] === entry.id
                      )
                      .map((child) => children.entryLabel(child, lang))
                : [],
        }));
    }, [catalog, browse, children, lang]);

    if (!catalog || !browse || (browse.children && !children)) {
        reportSheetIssue({
            code: 'catalog-unavailable',
            message: 'Documentation browser references a catalog without a browse declaration',
            details: { catalogId },
        });
        return null;
    }

    const columns: ColumnDef<BrowserRow>[] = [
        {
            id: 'name',
            header: translate(messages.name),
            accessorKey: 'name',
            enableSorting: true,
        },
        ...browse.columns
            .filter((column) => !column.detailOnly)
            .map(
                (column): ColumnDef<BrowserRow> => ({
                    id: column.key,
                    header: translate(column.header),
                    accessorKey: column.key,
                    enableSorting: Boolean(column.filter),
                })
            ),
    ];

    return (
        <DataCatalog
            id={catalogId}
            data={rows}
            columns={columns}
            filters={browse.columns
                .filter((column) => column.filter)
                .map((column) => ({ columnId: column.key, label: translate(column.header) }))}
            searchPlaceholder={translate(messages.search)}
            renderDetail={(row) => (
                <dl className="grid gap-3 text-sm">
                    {browse.columns.map((column) =>
                        row[column.key] ? (
                            <div key={column.key}>
                                <dt className="text-xs font-semibold uppercase tracking-wider text-textSecondary">
                                    {translate(column.header)}
                                </dt>
                                <dd className="m-0 text-textPrimary">{String(row[column.key])}</dd>
                            </div>
                        ) : null
                    )}
                    {browse.children && row.children.length > 0 && (
                        <div>
                            <dt className="text-xs font-semibold uppercase tracking-wider text-textSecondary">
                                {translate(browse.children.header)}
                            </dt>
                            <dd className="m-0 text-textPrimary">{row.children.join(' · ')}</dd>
                        </div>
                    )}
                </dl>
            )}
        />
    );
}
