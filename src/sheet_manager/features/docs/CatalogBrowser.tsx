import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { CatalogColumnDef } from '@site/src/shared/components/catalogTable';
import { DataCatalog } from '@site/src/shared/components/DataCatalog';
import { useMemo } from 'react';

import { reportSheetIssue } from '../../diagnostics';
import type { CatalogBindingEntry, CatalogBrowseColumn, CatalogMessage } from '../../systems';
import { CATALOG_BINDINGS } from '../sheet/data/catalogBindings';
import { catalogTextField, useLoadedCatalogText } from '../sheet/data/catalogText';

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
    const named = column.entriesOf ? CATALOG_BINDINGS.get(column.entriesOf) : undefined;
    if (named && (typeof value === 'string' || Array.isArray(value))) {
        return ([] as unknown[])
            .concat(value)
            .map((item) => {
                const [id = '', suffix] = String(item).split(':');
                const target = named.entries.find((candidate) => candidate.id === id);
                const name = target ? named.entryLabel(target, lang) : id;
                return suffix ? `${name} ${suffix}` : name;
            })
            .join(', ');
    }
    if (isMessage(value)) return translate(value);
    if (typeof value === 'string' && column.labels?.[value]) {
        return translate(column.labels[value]);
    }
    if (typeof value === 'string') return catalog.entryText(entry, column.key, lang) ?? value;
    return value === undefined || value === null ? '' : String(value);
}

/**
 * A searchable documentation table over any catalog that declares `browse` (plugin-owned
 * columns, filters, and child entries). Names and texts follow the reader's locale; the
 * catalog's long texts load on demand and show in the detail panel.
 */
export function CatalogBrowser({ catalogId }: { catalogId: string }) {
    const lang = useDocusaurusContext().i18n.currentLocale;
    const catalog = CATALOG_BINDINGS.get(catalogId);
    const browse = catalog?.browse;
    const children = browse?.children ? CATALOG_BINDINGS.get(browse.children.catalogId) : undefined;
    const longTexts = useMemo(() => catalog?.texts?.filter((text) => text.lazy) ?? [], [catalog]);
    const loadedTexts = useLoadedCatalogText(longTexts.length > 0 ? catalogId : undefined);

    const rows = useMemo<BrowserRow[]>(() => {
        if (!catalog || !browse) return [];
        return catalog.entries.map((entry) => ({
            id: entry.id,
            name: catalog.entryLabel(entry, lang),
            bookName: entry.name,
            ...Object.fromEntries(
                browse.columns.map((column) => [column.key, cellText(catalog, entry, column, lang)])
            ),
            ...Object.fromEntries(
                longTexts.map((text) => [
                    text.key,
                    catalogTextField(loadedTexts, lang, entry.id, text.key) ?? '',
                ])
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
    }, [catalog, browse, children, lang, longTexts, loadedTexts]);

    if (!catalog || !browse || (browse.children && !children)) {
        reportSheetIssue({
            code: 'catalog-unavailable',
            message: 'Documentation browser references a catalog without a browse declaration',
            details: { catalogId },
        });
        return null;
    }

    const columns: CatalogColumnDef<BrowserRow>[] = [
        {
            // Shows the localized name; the column id points search at the English book name
            // too (DataCatalog also matches the row's own value under the column id).
            id: 'bookName',
            header: translate(messages.name),
            accessorFn: (row) => row.name,
            enableSorting: true,
        },
        ...browse.columns
            .filter((column) => !column.detailOnly)
            .map((column): CatalogColumnDef<BrowserRow> => ({
                id: column.key,
                header: translate(column.header),
                accessorKey: column.key,
                enableSorting: Boolean(column.filter),
            })),
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
                    {longTexts.map((text) =>
                        row[text.key] ? (
                            <div key={text.key}>
                                <dt className="text-xs font-semibold uppercase tracking-wider text-textSecondary">
                                    {typeof text.label === 'string'
                                        ? text.label
                                        : translate(text.label)}
                                </dt>
                                <dd className="m-0 text-textPrimary">{String(row[text.key])}</dd>
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
