import { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, Folder, Search } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import {
    type ChoiceGroup,
    type CreateChoice,
    createChoices,
    type CreatePreferences,
    filterChoices,
    listChoices,
    readCreatePreferences,
    recentChoices,
    writeCreatePreferences,
} from '../../features/documents/createChoices';
import { createFromChoice } from '../../features/documents/createFromChoice';
import { useLibraryTree } from '../../features/sheet/data/useLibraryTree';
import type { Folder as FolderRecord } from '../../store/documentIndex';
import { useDocumentStore } from '../../store/documentStore';
import { systemRegistry } from '../../systems';
import { MoveToPicker } from '../documents/MoveToPicker';

interface DocumentCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Show the new document on the sheet (the default); false only creates it. */
    activate?: boolean;
    /** The folder the new document goes into; the top level when absent. */
    parentId?: string | null;
    /** `named`: the player typed a name (no rename needed); `parentId`: where it went. */
    onCreated?: (id: string, created: { named: boolean; parentId: string | null }) => void;
}

const labels = uiMessages.sheet.documents.create;
const NO_FOLDERS_MOVING: ReadonlySet<string> = new Set();
const FOLDER_DEPTH_LIMIT = 64;

/** "Campaign / Session 3", or `undefined` when the folder is gone. */
function folderPath(folders: readonly FolderRecord[], id: string): string | undefined {
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    const names: string[] = [];
    for (let at = byId.get(id); at && names.length < FOLDER_DEPTH_LIMIT;) {
        names.unshift(at.name);
        at = at.parentId ? byId.get(at.parentId) : undefined;
    }
    return names.length > 0 ? names.join(' / ') : undefined;
}

/** One row of the list, in the order the arrows walk it. */
interface Row {
    id: string;
    choice: CreateChoice;
}

/** The kinds of the library tree, searchable, with the device's recent kinds first (spec 039). */
export function DocumentCreateDialog({ open, onOpenChange, ...rest }: DocumentCreateDialogProps) {
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');
    const justCreated = useRef(false);
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[9998]" />
                <CreateDialogContent
                    {...rest}
                    onClose={(created) => {
                        justCreated.current = created;
                        onOpenChange(false);
                    }}
                    justCreatedRef={justCreated}
                />
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function CreateDialogContent({
    activate = true,
    parentId = null,
    onCreated,
    onClose,
    justCreatedRef,
}: Omit<DocumentCreateDialogProps, 'open' | 'onOpenChange'> & {
    onClose: (created: boolean) => void;
    justCreatedRef: { current: boolean };
}) {
    const tree = useLibraryTree();
    const groups = useMemo(() => createChoices(tree, systemRegistry), [tree]);
    const [preferences, setPreferences] = useState<CreatePreferences>(() => {
        const read = readCreatePreferences();
        return { ...read, recent: recentChoices(groups, read).map(({ key }) => key) };
    });
    const [query, setQuery] = useState('');
    const searching = query.trim() !== '';
    const shown = useMemo(() => filterChoices(groups, query), [groups, query]);
    const byKey = useMemo(
        () => new Map(listChoices(groups).map((choice) => [choice.key, choice])),
        [groups]
    );
    // Kinds deleted while the dialog is open disappear from Recent without a report.
    const recent = searching
        ? []
        : preferences.recent.flatMap((key) => (byKey.has(key) ? [byKey.get(key)!] : []));
    const [selectedKey, setSelectedKey] = useState<string | undefined>(
        () => recent[0]?.key ?? listChoices(groups)[0]?.key
    );
    const selected = selectedKey ? byKey.get(selectedKey) : undefined;
    const folded = useMemo(() => new Set(preferences.folded), [preferences.folded]);
    const idBase = useId();
    const plural = usePluralMessage();

    const rows: Row[] = [];
    const rowId = (scope: string, key: string) => `${idBase}-${scope}-${rows.length}-${key}`;
    for (const choice of recent) rows.push({ id: rowId('recent', choice.key), choice });
    const optionRows = new Map<string, Row>();
    for (const group of shown) {
        if (!searching && folded.has(group.key)) continue;
        for (const section of group.sections) {
            if (!searching && section.name && folded.has(section.key)) continue;
            for (const choice of section.choices) {
                const row = { id: rowId('kind', choice.key), choice };
                rows.push(row);
                optionRows.set(choice.key, row);
            }
        }
    }
    const [activeId, setActiveId] = useState<string | undefined>();
    const active = rows.find(({ id }) => id === activeId) ?? undefined;
    const matches = listChoices(shown).length;
    const listRef = useRef<HTMLDivElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState('');
    const folders = useDocumentStore((state) => state.folders);
    const [folderId, setFolderId] = useState<string | null>(parentId);
    // A folder deleted meanwhile reads as the top level; createDocument reports it on create.
    const shownFolder = folderId ? folderPath(folders, folderId) : undefined;
    const [picking, setPicking] = useState(false);

    useEffect(() => {
        if (!activeId) return;
        document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
    }, [activeId]);

    const toggleFold = (key: string) => {
        const next = folded.has(key)
            ? preferences.folded.filter((other) => other !== key)
            : [...preferences.folded, key];
        const stored = { ...readCreatePreferences(), folded: next };
        writeCreatePreferences(stored);
        setPreferences((current) => ({ ...current, folded: next }));
    };

    const choose = (choice: CreateChoice, then?: 'focus-details') => {
        setSelectedKey(choice.key);
        if (then) nameRef.current?.focus();
    };

    const changeQuery = (next: string) => {
        setQuery(next);
        setActiveId(undefined);
        const found = listChoices(filterChoices(groups, next));
        // A single match is chosen, so Enter goes on to the details.
        if (next.trim() && found.length === 1) setSelectedKey(found[0]!.key);
    };

    const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (rows.length === 0) return;
            const index = active ? rows.indexOf(active) : -1;
            const step = event.key === 'ArrowDown' ? 1 : -1;
            const next =
                index < 0
                    ? step > 0
                        ? 0
                        : rows.length - 1
                    : (index + step + rows.length) % rows.length;
            setActiveId(rows[next]!.id);
            setSelectedKey(rows[next]!.choice.key);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const target = active?.choice ?? (selected && matches > 0 ? selected : undefined);
            if (target) choose(target, 'focus-details');
        }
    };

    const create = () => {
        if (!selected) return;
        const target = shownFolder ? folderId : null;
        const created = createFromChoice(selected, { activate, parentId: folderId, name });
        const named = name.trim() !== '';
        onCreated?.(created.id, { named, parentId: target });
        // Unnamed, the owner places the focus on the name to type; named, it returns as usual.
        onClose(!named);
    };

    const optionProps = (row: Row) => ({
        id: row.id,
        role: 'option' as const,
        'aria-selected': row.choice.key === selectedKey,
        onClick: () => choose(row.choice),
        // The search keeps the focus; a pointer press must not move it.
        onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault(),
        className: clsx(
            'flex min-h-8 cursor-pointer flex-col justify-center rounded-sm px-2 py-1.5 text-left',
            row.choice.key === selectedKey
                ? 'bg-primary-muted/15 text-textPrimary'
                : 'text-textPrimary hover:bg-bgBase',
            row.id === activeId && 'outline outline-2 -outline-offset-2 outline-primary'
        ),
    });

    return (
        <Dialog.Content
            onCloseAutoFocus={(event) => {
                // The owner places the focus on what was made (a name to type).
                if (justCreatedRef.current && onCreated) event.preventDefault();
                justCreatedRef.current = false;
            }}
            onOpenAutoFocus={(event) => {
                event.preventDefault();
                document.getElementById(`${idBase}-search`)?.focus();
            }}
            onEscapeKeyDown={(event) => {
                if (!query) return;
                event.preventDefault();
                changeQuery('');
            }}
            className="fixed left-1/2 top-1/2 z-[9999] flex h-[min(36rem,calc(100dvh-2rem))] w-[min(52rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-bgSurface p-4 shadow-xl focus:outline-hidden sm:p-6"
        >
            <Dialog.Title className="text-lg font-semibold text-textPrimary">
                {translate(labels.title)}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-textSecondary">
                {translate(labels.prompt)}
            </Dialog.Description>
            <div className="mt-4 grid min-h-0 flex-1 gap-4 sm:grid-cols-[minmax(16rem,1fr)_20rem]">
                <div className="flex min-h-0 flex-col gap-2">
                    <div className="relative">
                        <Search
                            className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary"
                            aria-hidden="true"
                        />
                        <input
                            id={`${idBase}-search`}
                            type="search"
                            role="combobox"
                            aria-label={translate(labels.search)}
                            aria-controls={`${idBase}-list`}
                            aria-expanded="true"
                            aria-autocomplete="list"
                            aria-activedescendant={active?.id}
                            placeholder={translate(labels.searchPlaceholder)}
                            value={query}
                            onChange={(event) => changeQuery(event.target.value)}
                            onKeyDown={onSearchKey}
                            className="w-full rounded-sm border border-border bg-bgBase py-2 pl-8 pr-2 text-sm text-textPrimary"
                        />
                    </div>
                    <p className="sr-only" aria-live="polite">
                        {searching ? plural(labels.matches, matches) : ''}
                    </p>
                    <div
                        ref={listRef}
                        id={`${idBase}-list`}
                        role="listbox"
                        aria-label={translate(labels.kinds)}
                        className="min-h-0 flex-1 overflow-y-auto rounded-sm border border-border p-1"
                    >
                        {recent.length > 0 && (
                            <div role="group" aria-labelledby={`${idBase}-recent`}>
                                <div
                                    id={`${idBase}-recent`}
                                    className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-textSecondary"
                                >
                                    {translate(labels.recent)}
                                </div>
                                {rows.slice(0, recent.length).map((row) => (
                                    <div
                                        key={row.id}
                                        {...optionProps(row)}
                                        data-recent-kind={row.choice.key}
                                    >
                                        <ChoiceLabel choice={row.choice} />
                                    </div>
                                ))}
                            </div>
                        )}
                        {shown.map((group) => (
                            <ChoiceGroupView
                                key={group.key}
                                group={group}
                                idBase={idBase}
                                searching={searching}
                                folded={folded}
                                onToggle={toggleFold}
                                renderOption={(choice) => {
                                    const row = optionRows.get(choice.key);
                                    return row ? (
                                        <div
                                            key={row.id}
                                            {...optionProps(row)}
                                            data-kind={choice.key}
                                        >
                                            <ChoiceLabel choice={choice} />
                                        </div>
                                    ) : null;
                                }}
                            />
                        ))}
                        {searching && matches === 0 && (
                            <div className="grid justify-items-start gap-2 p-3 text-sm text-textSecondary">
                                <p>{translate(labels.noMatch, { query: query.trim() })}</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        changeQuery('');
                                        document.getElementById(`${idBase}-search`)?.focus();
                                    }}
                                    className="rounded-sm border border-border px-2 py-1 text-textPrimary hover:bg-bgBase"
                                >
                                    {translate(labels.clearSearch)}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <section
                    aria-label={translate(labels.details)}
                    className="flex min-h-0 flex-col gap-3 overflow-y-auto"
                >
                    {selected ? (
                        <div>
                            <h3 className="m-0 text-base font-semibold text-textPrimary">
                                {selected.name}
                            </h3>
                            {selected.context && (
                                <p className="m-0 text-sm text-textSecondary">{selected.context}</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-textSecondary">{translate(labels.chooseKind)}</p>
                    )}
                    <label className="grid gap-1 text-sm text-textPrimary">
                        {translate(labels.name)}
                        <input
                            ref={nameRef}
                            type="text"
                            value={name}
                            maxLength={200}
                            placeholder={translate(labels.namePlaceholder)}
                            onChange={(event) => setName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter') return;
                                event.preventDefault();
                                create();
                            }}
                            className="rounded-sm border border-border bg-bgBase px-2 py-2 text-sm"
                        />
                    </label>
                    <div className="grid gap-1 text-sm text-textPrimary">
                        <span id={`${idBase}-folder`}>{translate(labels.folder)}</span>
                        <button
                            type="button"
                            aria-labelledby={`${idBase}-folder ${idBase}-folder-value`}
                            onClick={() => setPicking(true)}
                            className="flex min-h-8 items-center gap-2 rounded-sm border border-border px-2 py-1.5 text-left hover:bg-bgBase"
                        >
                            <Folder
                                className="h-4 w-4 shrink-0 text-textSecondary"
                                aria-hidden="true"
                            />
                            <span id={`${idBase}-folder-value`} className="min-w-0 truncate">
                                {shownFolder ?? translate(labels.topLevel)}
                            </span>
                        </button>
                    </div>
                    <div className="mt-auto flex justify-end gap-2">
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="rounded-sm border border-border bg-bgSurface px-3 py-2 text-sm text-textPrimary hover:bg-bgBase"
                            >
                                {translate(labels.cancel)}
                            </button>
                        </Dialog.Close>
                        <button
                            type="button"
                            onClick={create}
                            disabled={!selected}
                            className="rounded-sm border border-transparent bg-primary-muted px-3 py-2 text-sm font-medium text-white hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {translate(labels.confirm)}
                        </button>
                    </div>
                </section>
            </div>
            {picking && (
                <MoveToPicker
                    open
                    onOpenChange={setPicking}
                    folders={folders}
                    moving={NO_FOLDERS_MOVING}
                    title={translate(labels.chooseFolder)}
                    initialId={shownFolder ? folderId : null}
                    confirmLabel={translate(labels.pickFolder)}
                    onPick={setFolderId}
                />
            )}
        </Dialog.Content>
    );
}

function ChoiceLabel({ choice }: { choice: CreateChoice }) {
    return (
        <>
            <span className="text-sm font-medium">
                {choice.name}
                {choice.context && (
                    <span className="font-normal text-textSecondary"> · {choice.context}</span>
                )}
            </span>
            {choice.userKind && (
                // Types may share a name; the description tells them apart.
                <span className="text-xs text-textSecondary">
                    {choice.description ||
                        translate(uiMessages.sheet.templates.library.noDescription)}
                </span>
            )}
        </>
    );
}

function FoldHeading({
    id,
    name,
    expanded,
    searching,
    nested,
    onToggle,
}: {
    id: string;
    name: string;
    expanded: boolean;
    searching: boolean;
    nested?: boolean;
    onToggle: () => void;
}) {
    const text = clsx(
        'text-xs font-semibold uppercase tracking-wider text-textSecondary',
        nested && 'normal-case tracking-normal'
    );
    // While searching every match shows, so headings only label.
    if (searching) {
        return (
            <div id={id} className={clsx('px-2 pb-1 pt-2', text)}>
                {name}
            </div>
        );
    }
    const Icon = expanded ? ChevronDown : ChevronRight;
    return (
        <button
            id={id}
            type="button"
            aria-expanded={expanded}
            onClick={onToggle}
            className={clsx(
                'flex min-h-8 w-full items-center gap-1 rounded-sm px-1 text-left hover:bg-bgBase',
                text
            )}
        >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {name}
        </button>
    );
}

function ChoiceGroupView({
    group,
    idBase,
    searching,
    folded,
    onToggle,
    renderOption,
}: {
    group: ChoiceGroup;
    idBase: string;
    searching: boolean;
    folded: ReadonlySet<string>;
    onToggle: (key: string) => void;
    renderOption: (choice: CreateChoice) => ReactNode;
}) {
    const headingId = `${idBase}-${group.key}`;
    const expanded = searching || !folded.has(group.key);
    return (
        <div role="group" aria-labelledby={headingId}>
            <FoldHeading
                id={headingId}
                name={group.name}
                expanded={expanded}
                searching={searching}
                onToggle={() => onToggle(group.key)}
            />
            {expanded &&
                group.sections.map((section) => {
                    if (!section.name) return section.choices.map(renderOption);
                    const sectionId = `${idBase}-${section.key}`;
                    const open = searching || !folded.has(section.key);
                    return (
                        <div
                            key={section.key}
                            role="group"
                            aria-labelledby={sectionId}
                            className="pl-3"
                        >
                            <FoldHeading
                                id={sectionId}
                                name={section.name}
                                expanded={open}
                                searching={searching}
                                nested
                                onToggle={() => onToggle(section.key)}
                            />
                            {open && section.choices.map(renderOption)}
                        </div>
                    );
                })}
        </div>
    );
}
