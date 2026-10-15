import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { Columns2, ExternalLink, FolderInput, Pencil, SquarePlus, Trash2 } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';

import { collectDeletion } from '../../features/documents/operations';
import {
    documentKey,
    type DocumentsNode,
    entryTitle,
    folderKey,
    placePath,
} from '../../features/documents/rows';
import { kindLabel, kindSettingLabel } from '../../features/sheet/data/documentLabels';
import type { DocumentIndexEntry, Folder } from '../../store/documentIndex';
import { systemRegistry } from '../../systems';

const labels = uiMessages.sheet.documents.manager;

export interface DocumentDetailsProps {
    /** The selected rows; one shows its fields, several show a count. */
    items: readonly DocumentsNode[];
    folders: readonly Folder[];
    entries: readonly DocumentIndexEntry[];
    onOpen: (entry: DocumentIndexEntry) => void;
    /** Shows the document next to the ones already open (spec 034). */
    onOpenBeside: (entry: DocumentIndexEntry) => void;
    onOpenInNewTab: (entry: DocumentIndexEntry) => void;
    /** Commits a name typed in the details; `key` is the row key. */
    onRename: (key: string, name: string) => void;
    onMove: () => void;
    onDelete: () => void;
}

function formatTime(iso: string | undefined): string {
    if (!iso) return translate(labels.details.unknown);
    const time = new Date(iso);
    return Number.isNaN(time.getTime()) ? translate(labels.details.unknown) : time.toLocaleString();
}

function Field({ name, value }: { name: string; value: string }) {
    return (
        <div className="grid gap-0.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-textSecondary">
                {name}
            </dt>
            <dd className="m-0 break-words text-sm text-textPrimary">{value}</dd>
        </div>
    );
}

const actionButton =
    'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors [@media(pointer:coarse)]:px-3 [@media(pointer:coarse)]:py-2.5';

/** The name of the selected row, typed here and saved when the field is left or Enter is pressed. */
function NameField({
    value,
    placeholder,
    onCommit,
}: {
    value: string;
    placeholder?: string;
    onCommit: (name: string) => void;
}) {
    const [draft, setDraft] = useState(value);
    const commit = () => {
        const trimmed = draft.trim();
        if (trimmed && trimmed !== value) onCommit(trimmed);
        else setDraft(value);
    };
    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') commit();
        else if (event.key === 'Escape') setDraft(value);
    };
    return (
        <input
            id={NAME_FIELD_ID}
            value={draft}
            placeholder={placeholder}
            maxLength={200}
            aria-label={translate(labels.details.name)}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
            className="w-full rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-lg font-semibold text-textPrimary hover:border-border focus:border-primary focus:outline-hidden"
        />
    );
}

const NAME_FIELD_ID = 'documents-details-title';

/** Rename lives in the name field above: the button only takes the cursor there. */
function focusName() {
    const field = document.getElementById(NAME_FIELD_ID);
    if (field instanceof HTMLInputElement) {
        field.focus();
        field.select();
    }
}

const rowName = (item: DocumentsNode) =>
    item.type === 'folder' ? item.folder.name : entryTitle(item.entry);

const neutralButton = `${actionButton} border-border text-textPrimary hover:border-secondary hover:bg-secondary/10`;

/** The right side of the documents window: the selected rows' fields and what to do with them. */
export function DocumentDetails({
    items,
    folders,
    entries,
    onOpen,
    onOpenBeside,
    onOpenInNewTab,
    onRename,
    onMove,
    onDelete,
}: DocumentDetailsProps) {
    const plural = usePluralMessage();
    if (items.length === 0) {
        return (
            <p className="p-4 text-sm text-textSecondary">{translate(labels.details.nothing)}</p>
        );
    }
    const renameButton = (
        <button type="button" onClick={focusName} className={neutralButton}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {translate(labels.details.rename)}
        </button>
    );
    const moveButton = (
        <button type="button" onClick={onMove} className={neutralButton}>
            <FolderInput className="h-3.5 w-3.5" aria-hidden="true" />
            {translate(labels.details.move)}
        </button>
    );
    const deleteButton = (
        <button
            type="button"
            onClick={onDelete}
            className={`${actionButton} border-error/40 text-error hover:bg-error/10`}
        >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {translate(labels.details.delete)}
        </button>
    );
    const [item] = items;
    if (items.length > 1 || !item) {
        return (
            <section aria-labelledby="documents-details-title" className="space-y-3 p-4">
                <h3 id="documents-details-title" className="text-lg font-semibold">
                    {plural(labels.details.selected, items.length)}
                </h3>
                <p className="text-xs text-textSecondary">{translate(labels.details.hint)}</p>
                <ul className="max-h-48 space-y-0.5 overflow-y-auto text-sm">
                    {items.map((row) => (
                        <li
                            key={row.type === 'folder' ? row.folder.id : row.entry.id}
                            className="truncate"
                        >
                            {rowName(row)}
                        </li>
                    ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                    {moveButton}
                    {deleteButton}
                </div>
            </section>
        );
    }
    const parentId = item.type === 'folder' ? item.folder.parentId : item.entry.parentId;
    const path = placePath(folders, parentId);
    const place = path.length > 0 ? path.join(' / ') : translate(labels.details.top);
    if (item.type === 'folder') {
        const inside = collectDeletion({ entries: [...entries], folders: [...folders] }, [
            item.folder.id,
        ]);
        return (
            <section aria-label={translate(labels.details.heading)} className="space-y-3 p-4">
                <NameField
                    key={`${item.folder.id}:${item.folder.name}`}
                    value={item.folder.name}
                    onCommit={(name) => onRename(folderKey(item.folder.id), name)}
                />
                <dl className="m-0 grid gap-3">
                    <Field name={translate(labels.details.place)} value={place} />
                    <Field
                        name={translate(labels.details.contents)}
                        value={[
                            plural(labels.counts.folders, inside.folderIds.length - 1),
                            plural(labels.counts.documents, inside.documentIds.length),
                        ].join(', ')}
                    />
                    <Field
                        name={translate(labels.details.created)}
                        value={formatTime(item.folder.createdAt)}
                    />
                    <Field
                        name={translate(labels.details.changed)}
                        value={formatTime(item.folder.changedAt)}
                    />
                </dl>
                <div className="flex flex-wrap gap-2">
                    {renameButton}
                    {moveButton}
                    {deleteButton}
                </div>
            </section>
        );
    }
    const { entry } = item;
    const system = systemRegistry.getSystem(entry.systemId);
    return (
        <section aria-label={translate(labels.details.heading)} className="space-y-3 p-4">
            <NameField
                key={`${entry.id}:${entry.name}`}
                value={entry.name}
                placeholder={entryTitle(entry)}
                onCommit={(name) => onRename(documentKey(entry.id), name)}
            />
            <dl className="m-0 grid gap-3">
                <Field
                    name={translate(labels.details.kind)}
                    value={kindLabel(entry.systemId, entry.kind)}
                />
                <Field
                    name={translate(labels.details.system)}
                    value={system ? translate(system.label) : entry.systemId}
                />
                <Field
                    name={translate(labels.details.setting)}
                    value={kindSettingLabel(entry.systemId, entry.kind)}
                />
                <Field name={translate(labels.details.place)} value={place} />
                <Field
                    name={translate(labels.details.created)}
                    value={formatTime(entry.createdAt)}
                />
                <Field
                    name={translate(labels.details.changed)}
                    value={formatTime(entry.changedAt)}
                />
            </dl>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onOpen(entry)} className={neutralButton}>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    {translate(labels.details.open)}
                </button>
                <button
                    type="button"
                    onClick={() => onOpenInNewTab(entry)}
                    className={neutralButton}
                >
                    <SquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                    {translate(labels.details.openInNewTab)}
                </button>
                <button type="button" onClick={() => onOpenBeside(entry)} className={neutralButton}>
                    <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {translate(labels.details.openBeside)}
                </button>
                {renameButton}
                {moveButton}
                {deleteButton}
            </div>
        </section>
    );
}
