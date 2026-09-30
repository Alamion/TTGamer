import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { NumberInput } from '@site/src/shared/components/NumberInput';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import clsx from 'clsx';
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ClipboardPaste,
    Columns3,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';

import { getCatalogBinding } from '../../../features/sheet/data/catalogBindings';
import {
    addColumn,
    addEntry,
    appendEntries,
    type CatalogEditResult,
    catalogUsage,
    duplicateNames,
    moveColumn,
    moveEntry,
    parsePastedEntries,
    removeColumn,
    removeEntries,
    renameColumn,
    retypeColumn,
    retypeLosses,
    updateEntry,
} from '../../../features/sheet/data/catalogEdit';
import type { CatalogNode } from '../../../features/sheet/data/libraryTree';
import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import { useTemplateStore } from '../../../store/templateStore';
import {
    CATALOG_COLUMN_TYPES,
    type CatalogCellValue,
    type CatalogColumn,
    type CatalogColumnType,
    type CatalogEntry,
    type UserCatalog,
} from '../../../systems/userCatalogs';
import { TEMPLATE_LIMITS } from '../../../types/templateLimits';
import { Checkbox } from '../../controls/Checkbox';
import { ConfirmDialog } from '../ConfirmDialog';

const labels = uiMessages.sheet.library.catalogTable;
const libraryLabels = uiMessages.sheet.library;

const iconButton =
    'rounded p-1 text-textSecondary hover:bg-bgBase hover:text-textPrimary disabled:opacity-30';
const toolbarButton =
    'inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs font-medium text-textPrimary hover:border-secondary hover:bg-secondary/10 disabled:opacity-40';
const cellInput =
    'w-full min-w-[6rem] rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-textPrimary hover:border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const now = () => new Date().toISOString();

interface RowCallbacks {
    rename: (entryId: string, name: string) => void;
    setCell: (entryId: string, columnId: string, value: CatalogCellValue | undefined) => void;
    move: (entryId: string, offset: -1 | 1) => void;
    remove: (entryId: string) => void;
    select: (entryId: string, selected: boolean) => void;
}

/** The entry name: kept locally while empty, so the author can retype it. */
function NameCell({
    entry,
    number,
    duplicate,
    onRename,
}: {
    entry: CatalogEntry;
    number: number;
    duplicate: boolean;
    onRename: (name: string) => void;
}) {
    const [draft, setDraft] = useState(entry.name);
    const [lastName, setLastName] = useState(entry.name);
    if (entry.name !== lastName) {
        setLastName(entry.name);
        setDraft(entry.name);
    }
    const empty = draft.trim() === '';
    return (
        <div className="space-y-0.5">
            <input
                value={draft}
                aria-label={translate(labels.entryName, { number })}
                aria-invalid={empty}
                onChange={(event) => {
                    setDraft(event.target.value);
                    if (event.target.value.trim()) onRename(event.target.value);
                }}
                className={clsx(cellInput, 'font-medium', empty && 'border-error')}
            />
            {empty && (
                <p role="alert" className="text-[11px] text-error">
                    {translate(labels.emptyName)}
                </p>
            )}
            {!empty && duplicate && (
                <p className="text-[11px] text-secondary">{translate(labels.duplicate)}</p>
            )}
        </div>
    );
}

function ValueCell({
    column,
    entry,
    onChange,
}: {
    column: CatalogColumn;
    entry: CatalogEntry;
    onChange: (value: CatalogCellValue | undefined) => void;
}) {
    const value = entry.values[column.id];
    const label = translate(labels.cell, { column: column.name, name: entry.name });
    switch (column.type) {
        case 'number':
            return (
                <NumberInput
                    value={typeof value === 'number' ? value : undefined}
                    onChange={onChange}
                    label={label}
                    className={clsx(cellInput, 'w-24 min-w-0')}
                />
            );
        case 'toggle':
            return (
                <Checkbox
                    checked={value === true}
                    onChange={(checked) => onChange(checked)}
                    label={label}
                    hideLabel
                />
            );
        case 'text':
            return (
                <input
                    value={typeof value === 'string' ? value : ''}
                    aria-label={label}
                    onChange={(event) => onChange(event.target.value || undefined)}
                    className={cellInput}
                />
            );
    }
}

/**
 * One entry. Memoized: an edit replaces only that entry object (catalog edits keep the others),
 * and the callbacks are stable, so editing one cell re-renders only its row.
 */
const EntryRow = memo(function EntryRow({
    entry,
    index,
    count,
    columns,
    duplicate,
    selected,
    callbacks,
}: {
    entry: CatalogEntry;
    index: number;
    count: number;
    columns: readonly CatalogColumn[];
    duplicate: boolean;
    selected: boolean;
    callbacks: RowCallbacks;
}) {
    const name = entry.name;
    return (
        <tr data-catalog-entry={entry.id} className="border-b border-border/60 align-top">
            <td className="px-1 py-1">
                <input
                    type="checkbox"
                    checked={selected}
                    aria-label={translate(labels.selectEntry, { name })}
                    onChange={(event) => callbacks.select(entry.id, event.target.checked)}
                    className="mt-2 h-3.5 w-3.5"
                />
            </td>
            <td className="px-1 py-1">
                <NameCell
                    entry={entry}
                    number={index + 1}
                    duplicate={duplicate}
                    onRename={(next) => callbacks.rename(entry.id, next)}
                />
            </td>
            {columns.map((column) => (
                <td key={column.id} className="px-1 py-1">
                    <ValueCell
                        column={column}
                        entry={entry}
                        onChange={(value) => callbacks.setCell(entry.id, column.id, value)}
                    />
                </td>
            ))}
            <td className="whitespace-nowrap px-1 py-1 text-right">
                <button
                    type="button"
                    disabled={index === 0}
                    aria-label={translate(labels.moveEntryUp, { name })}
                    onClick={() => callbacks.move(entry.id, -1)}
                    className={iconButton}
                >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    disabled={index === count - 1}
                    aria-label={translate(labels.moveEntryDown, { name })}
                    onClick={() => callbacks.move(entry.id, 1)}
                    className={iconButton}
                >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    aria-label={translate(labels.deleteEntry, { name })}
                    onClick={() => callbacks.remove(entry.id)}
                    className={clsx(iconButton, 'hover:text-error')}
                >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            </td>
        </tr>
    );
});

function ColumnHeader({
    column,
    index,
    count,
    onRename,
    onRetype,
    onMove,
    onRemove,
}: {
    column: CatalogColumn;
    index: number;
    count: number;
    onRename: (name: string) => void;
    onRetype: (type: CatalogColumnType) => void;
    onMove: (offset: -1 | 1) => void;
    onRemove: () => void;
}) {
    const [draft, setDraft] = useState(column.name);
    const [lastName, setLastName] = useState(column.name);
    if (column.name !== lastName) {
        setLastName(column.name);
        setDraft(column.name);
    }
    return (
        <th scope="col" className="min-w-[8rem] px-1 py-1 text-left align-top font-normal">
            <input
                value={draft}
                aria-label={translate(labels.columnName)}
                onChange={(event) => {
                    setDraft(event.target.value);
                    if (event.target.value.trim()) onRename(event.target.value);
                }}
                className={clsx(cellInput, 'text-xs font-semibold')}
            />
            <div className="flex items-center gap-0.5">
                <select
                    value={column.type}
                    aria-label={translate(labels.columnType, { column: column.name })}
                    onChange={(event) => onRetype(event.target.value as CatalogColumnType)}
                    className="rounded border border-border bg-bgBase px-1 py-0.5 text-xs text-textPrimary"
                >
                    {CATALOG_COLUMN_TYPES.map((type) => (
                        <option key={type} value={type}>
                            {translate(labels.types[type])}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    disabled={index === 0}
                    aria-label={translate(labels.moveColumnLeft, { column: column.name })}
                    onClick={() => onMove(-1)}
                    className={iconButton}
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    disabled={index === count - 1}
                    aria-label={translate(labels.moveColumnRight, { column: column.name })}
                    onClick={() => onMove(1)}
                    className={iconButton}
                >
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    aria-label={translate(labels.deleteColumn, { column: column.name })}
                    onClick={onRemove}
                    className={clsx(iconButton, 'hover:text-error')}
                >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            </div>
        </th>
    );
}

function PastePanel({
    catalog,
    onAdd,
    onClose,
}: {
    catalog: UserCatalog;
    onAdd: (entries: ReturnType<typeof parsePastedEntries>['entries']) => void;
    onClose: () => void;
}) {
    const plural = usePluralMessage();
    const [text, setText] = useState('');
    const room = TEMPLATE_LIMITS.catalogEntriesMax - catalog.entries.length;
    const parsed = useMemo(
        () => parsePastedEntries(text, catalog.columns, room),
        [text, catalog.columns, room]
    );
    return (
        <div className="space-y-2 rounded border border-border bg-bgBase p-3">
            <p className="text-sm font-semibold text-textPrimary">{translate(labels.pasteTitle)}</p>
            <p className="text-xs text-textSecondary">{translate(labels.pasteHint)}</p>
            <textarea
                value={text}
                aria-label={translate(labels.pasteLabel)}
                onChange={(event) => setText(event.target.value)}
                rows={5}
                className="w-full rounded border border-border bg-bgSurface p-2 font-mono text-xs text-textPrimary focus:border-primary focus:outline-none"
            />
            {parsed.rejected.length > 0 && (
                <div className="text-xs text-error">
                    <p>{plural(labels.pasteRejected, parsed.rejected.length)}</p>
                    <ul className="list-disc pl-5">
                        {parsed.rejected.map(({ line, reason }) => (
                            <li key={line}>
                                {translate(labels.rejectLine, {
                                    line,
                                    reason: translate(labels.rejectReasons[reason]),
                                })}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={parsed.entries.length === 0}
                    onClick={() => onAdd(parsed.entries)}
                    className="rounded bg-primary-muted px-3 py-1 text-xs font-medium text-white hover:bg-primary disabled:opacity-40"
                >
                    {plural(labels.pasteAdd, parsed.entries.length)}
                </button>
                <button type="button" onClick={onClose} className={toolbarButton}>
                    {translate(labels.cancel)}
                </button>
            </div>
        </div>
    );
}

interface PendingConfirmation {
    title: string;
    description: string;
    run: () => void;
}

/** Entries and columns of a user catalog, edited in place (contracts/catalog-ui.md). */
function EditableCatalogTable({ catalog }: { catalog: UserCatalog }) {
    const plural = usePluralMessage();
    const templates = useTemplateStore((state) => state.templates);
    const usage = useMemo(() => catalogUsage(catalog.id, templates), [catalog.id, templates]);
    const duplicates = useMemo(() => duplicateNames(catalog), [catalog]);
    const [selected, setSelected] = useState<Set<string>>(() => new Set());
    const [pasting, setPasting] = useState(false);
    const [confirmation, setConfirmation] = useState<PendingConfirmation>();
    // Stable row callbacks read the stored catalog, so memoized rows are not re-rendered.
    const catalogId = catalog.id;
    const current = useCallback(
        () => useDocumentTypeStore.getState().catalogs[catalogId] ?? catalog,
        // `catalog` is only the fallback before the store has it; the id decides.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [catalogId]
    );

    const save = useCallback((result: CatalogEditResult) => {
        if (result.ok) useDocumentTypeStore.getState().saveCatalog(result.catalog);
    }, []);

    const callbacks = useMemo<RowCallbacks>(
        () => ({
            rename: (entryId, name) => save(updateEntry(current(), entryId, { name }, now())),
            setCell: (entryId, columnId, value) =>
                save(updateEntry(current(), entryId, { columnId, value }, now())),
            move: (entryId, offset) => save(moveEntry(current(), entryId, offset, now())),
            remove: (entryId) => save(removeEntries(current(), new Set([entryId]), now())),
            select: (entryId, isSelected) =>
                setSelected((current) => {
                    const next = new Set(current);
                    if (isSelected) next.add(entryId);
                    else next.delete(entryId);
                    return next;
                }),
        }),
        [save, current]
    );

    const entriesFull = catalog.entries.length >= TEMPLATE_LIMITS.catalogEntriesMax;
    const columnsFull = catalog.columns.length >= TEMPLATE_LIMITS.catalogColumnsMax;

    const requestRetype = (column: CatalogColumn, type: CatalogColumnType) => {
        const losses = retypeLosses(catalog, column.id, type);
        const run = () => save(retypeColumn(current(), column.id, type, now()));
        if (losses === 0) return run();
        setConfirmation({
            title: translate(labels.retypeTitle),
            description: plural(labels.retypeBody, losses),
            run,
        });
    };

    const requestRemoveColumn = (column: CatalogColumn) => {
        const sites = usage.columns.get(column.id) ?? [];
        const run = () => save(removeColumn(current(), column.id, now()));
        if (sites.length === 0) return run();
        const names = [...new Set(sites.map(({ template }) => template.name))];
        setConfirmation({
            title: translate(labels.deleteColumnTitle),
            description: plural(labels.deleteColumnBody, names.length, {
                column: column.name,
                names: names.join(', '),
            }),
            run,
        });
    };

    return (
        <div className="space-y-2">
            <p className="text-xs text-textSecondary">
                {plural(libraryLabels.details.usedBy, usage.templates.length)}
            </p>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    disabled={entriesFull}
                    onClick={() => save(addEntry(catalog, translate(labels.newEntry), now()))}
                    className={toolbarButton}
                >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {translate(labels.addEntry)}
                </button>
                <button
                    type="button"
                    disabled={columnsFull}
                    onClick={() =>
                        save(
                            addColumn(
                                catalog,
                                translate(labels.newColumn, {
                                    number: catalog.columns.length + 1,
                                }),
                                'text',
                                now()
                            )
                        )
                    }
                    className={toolbarButton}
                >
                    <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
                    {translate(labels.addColumn)}
                </button>
                <button
                    type="button"
                    disabled={entriesFull}
                    aria-expanded={pasting}
                    onClick={() => setPasting((open) => !open)}
                    className={toolbarButton}
                >
                    <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
                    {translate(labels.paste)}
                </button>
                <button
                    type="button"
                    disabled={selected.size === 0}
                    onClick={() => {
                        save(removeEntries(catalog, selected, now()));
                        setSelected(new Set());
                    }}
                    className={clsx(toolbarButton, 'hover:text-error')}
                >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {translate(labels.deleteSelected)}
                </button>
            </div>
            {entriesFull && (
                <p className="text-xs text-textSecondary">
                    {translate(labels.limits.entries, {
                        limit: TEMPLATE_LIMITS.catalogEntriesMax,
                    })}
                </p>
            )}
            {columnsFull && (
                <p className="text-xs text-textSecondary">
                    {translate(labels.limits.columns, {
                        limit: TEMPLATE_LIMITS.catalogColumnsMax,
                    })}
                </p>
            )}
            {pasting && (
                <PastePanel
                    catalog={catalog}
                    onAdd={(entries) => {
                        save(appendEntries(catalog, entries, now()));
                        setPasting(false);
                    }}
                    onClose={() => setPasting(false)}
                />
            )}
            {catalog.entries.length === 0 && catalog.columns.length === 0 ? (
                <p className="text-sm text-textSecondary">{translate(labels.empty)}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table
                        aria-label={translate(labels.label, { name: catalog.name })}
                        className="w-full border-collapse text-sm"
                    >
                        <thead>
                            <tr className="border-b border-border">
                                <th scope="col" className="w-6 px-1">
                                    <span className="sr-only">
                                        {translate(labels.deleteSelected)}
                                    </span>
                                </th>
                                <th
                                    scope="col"
                                    className="min-w-[10rem] px-2 py-1 text-left text-xs font-semibold text-textSecondary"
                                >
                                    {translate(labels.nameColumn)}
                                </th>
                                {catalog.columns.map((column, index) => (
                                    <ColumnHeader
                                        key={column.id}
                                        column={column}
                                        index={index}
                                        count={catalog.columns.length}
                                        onRename={(name) =>
                                            save(renameColumn(current(), column.id, name, now()))
                                        }
                                        onRetype={(type) => requestRetype(column, type)}
                                        onMove={(offset) =>
                                            save(moveColumn(current(), column.id, offset, now()))
                                        }
                                        onRemove={() => requestRemoveColumn(column)}
                                    />
                                ))}
                                <th scope="col" className="w-20 px-1">
                                    <span className="sr-only">
                                        {translate(libraryLabels.row.actions, { name: '' })}
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {catalog.entries.map((entry, index) => (
                                <EntryRow
                                    key={entry.id}
                                    entry={entry}
                                    index={index}
                                    count={catalog.entries.length}
                                    columns={catalog.columns}
                                    duplicate={duplicates.has(entry.id)}
                                    selected={selected.has(entry.id)}
                                    callbacks={callbacks}
                                />
                            ))}
                        </tbody>
                    </table>
                    {catalog.entries.length === 0 && (
                        <p className="p-2 text-sm text-textSecondary">{translate(labels.empty)}</p>
                    )}
                </div>
            )}
            <ConfirmDialog
                open={confirmation !== undefined}
                onOpenChange={(open) => {
                    if (!open) setConfirmation(undefined);
                }}
                onConfirm={() => {
                    confirmation?.run();
                    setConfirmation(undefined);
                }}
                title={confirmation?.title ?? ''}
                description={confirmation?.description ?? ''}
                confirmLabel={translate(labels.confirm)}
                cancelLabel={translate(labels.cancel)}
            />
        </div>
    );
}

/** A shipped catalog's entries and details, read-only. */
function ShippedCatalogTable({ catalogId, name }: { catalogId: string; name: string }) {
    const locale = useDocusaurusContext().i18n.currentLocale;
    const binding = getCatalogBinding(catalogId);
    if (!binding) return null;
    const details = binding.fillableDetails.filter(({ kind }) => kind !== 'rows');
    const valueOf = (entry: object, key: string) => {
        const value = (entry as Record<string, unknown>)[key];
        return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    };
    return (
        <div className="space-y-2">
            <p className="text-xs text-textSecondary">{translate(labels.readOnly)}</p>
            <div className="max-h-96 overflow-auto">
                <table
                    aria-label={translate(labels.label, { name })}
                    className="w-full border-collapse text-sm"
                >
                    <thead>
                        <tr className="border-b border-border">
                            <th
                                scope="col"
                                className="px-2 py-1 text-left text-xs font-semibold text-textSecondary"
                            >
                                {translate(labels.nameColumn)}
                            </th>
                            {details.map(({ key, label }) => (
                                <th
                                    key={key}
                                    scope="col"
                                    className="px-2 py-1 text-left text-xs font-semibold text-textSecondary"
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {binding.entries.map((entry) => (
                            <tr key={entry.id} className="border-b border-border/60">
                                <td className="px-2 py-1 text-textPrimary">
                                    {binding.entryLabel(entry, locale)}
                                </td>
                                {details.map(({ key }) => (
                                    <td key={key} className="px-2 py-1 text-textSecondary">
                                        {valueOf(entry, key)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/** The details-pane body of a catalog node. */
export function CatalogTable({ node }: { node: CatalogNode }) {
    const catalog = useDocumentTypeStore((state) =>
        node.ref.kind === 'user' ? state.catalogs[node.ref.catalogId] : undefined
    );
    if (node.ref.kind === 'shipped') {
        return <ShippedCatalogTable catalogId={node.ref.catalogId} name={node.name} />;
    }
    return catalog && !node.unavailable ? <EditableCatalogTable catalog={catalog} /> : null;
}
