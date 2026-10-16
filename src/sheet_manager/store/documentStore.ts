import { generateId } from '@site/src/shared/utils/random';
import type { StateCreator } from 'zustand';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { describeError, reportSheetIssue } from '../diagnostics';
import {
    applyOperations,
    type TreeOperation,
    type TreeResult,
} from '../features/documents/operations';
import {
    applyTemplateValueWrites,
    collectTableBlocks,
} from '../features/sheet/data/templateValueWrites';
import { deletePortrait } from '../persistence/portraitStorage';
import { systemRegistry } from '../systems';
import {
    convertLegacyExport,
    isLegacyExportSupported,
    looksLikeLegacyExport,
} from '../systems/star-wars-wod/legacyExport';
import { isPresetId } from '../systems/star-wars-wod/presets';
import { isUserKind } from '../systems/userTypes';
import type { DocumentMetadata, DocumentViewId, UnknownDocumentEnvelope } from '../types/document';
import { DocumentMetadataSchema, SystemIdSchema } from '../types/document';
import { collectTemplateFields, type CustomTemplate, fieldValueKey } from '../types/template';
import type { TemplatePageValues } from '../types/templateValues';
import { bootDocuments } from './documentBoot';
import {
    deviceImageIdsOf,
    isCleanEnvelope,
    purgedIds,
    readEnvelope,
    recordWriter,
    saveBackup,
    startBackupCountdown,
    writeRecord,
} from './documentContent';
import {
    type DocumentIndexEntry,
    entryOf,
    type Folder,
    mergeById,
    mergeStoredValue,
    nextRank,
    parseEntries,
    parseFolders,
    sameEntry,
} from './documentIndex';
import { asRecoveryRecord, newRecoveryRecord } from './recoveryRecord';
import { useTemplateStore } from './templateStore';

/**
 * Version 5 (spec 032): the state holds a light entry per document and each document is its own
 * stored record. Version 4 held every envelope in one value (and re-parsed renamed system ids).
 */
const STORE_VERSION = 5;

/**
 * v2 → v3: per-template nested value bags flatten into one document-global bag keyed by
 * valueKey (clarification D1). When a persisted page belongs to a known template and all
 * its keys match that template's field ids, keys map through `valueKey ?? field.id`;
 * anything else keeps its keys verbatim so no value is ever dropped.
 */
function flattenLegacyTemplateValues(
    templateValues: unknown
): UnknownDocumentEnvelope['templateValues'] {
    if (!isRecord(templateValues)) return {};
    const flat: Record<string, unknown> = {};
    for (const [templateId, page] of Object.entries(templateValues)) {
        if (!isRecord(page)) {
            flat[templateId] = page;
            continue;
        }
        const template = useTemplateStore.getState().getTemplate(templateId);
        const fieldDefs = template ? collectTemplateFields(template) : undefined;
        const declared = fieldDefs
            ? new Set([...fieldDefs.keys(), ...collectTableBlocks(template!).keys()])
            : undefined;
        const isNestedPage =
            template !== undefined &&
            declared !== undefined &&
            Object.keys(page).length > 0 &&
            Object.keys(page).every((key) => declared.has(key));

        if (isNestedPage) {
            for (const [key, value] of Object.entries(page)) {
                const field = fieldDefs!.get(key);
                flat[field ? fieldValueKey(field) : key] = value;
            }
        } else {
            for (const [key, value] of Object.entries(page)) flat[key] = value;
        }
    }
    return flat as UnknownDocumentEnvelope['templateValues'];
}
const MAX_RECOVERY_ENTRIES = 100;

/**
 * One document's part of a library move (spec 013): `null` clears the metadata field. Only
 * documents of user types change system (their data is one empty shape).
 */
export interface DocumentRelocation {
    id: string;
    systemId?: string;
    settingId?: string | null;
    templateId?: string | null;
}

export interface DocumentStoreState {
    /** The documents held in memory: the open one and the last few opened; not every document. */
    documents: UnknownDocumentEnvelope[];
    /** One light entry per document (spec 032); this list, not `documents`, is the collection. */
    entries: DocumentIndexEntry[];
    folders: Folder[];
    /** Ids of deleted documents whose records are removed at the next start (undo needs them). */
    pendingPurge: string[];
    /** The id being read from storage for the sheet, until it arrives. */
    opening: string | null;
    currentDocumentId: string | null;
    /** Ids the loaded cache must keep besides the current one: the panes' documents (spec 034). */
    pinnedIds: string[];
    recoveryEntries: unknown[];
    /** Keeps these documents (at most `MAX_PINNED_DOCUMENTS`) loaded; not saved. */
    pinDocuments: (ids: readonly string[]) => void;
    /** Reads the ids that are only entries into the loaded cache; the current document stays. */
    loadIntoCache: (ids: readonly string[]) => Promise<void>;
    /** Opens a loaded document at once; one that is only an entry is read from storage first. */
    setCurrentDocument: (id: string | null) => void;
    /** Reads the document if needed, then shows it; false when it cannot be opened. */
    openDocument: (id: string) => Promise<boolean>;
    /** `settingId` / `templateId`: a document created in a user setting, on its page (spec 012). */
    createDocument: (
        systemId: string,
        definitionId: string,
        options?: {
            settingId?: string;
            templateId?: string;
            preferredViewId?: DocumentViewId;
            /** Show it on the sheet (the default); false only adds it. */
            activate?: boolean;
            /** The folder it goes into (last there); the top level when absent. */
            parentId?: string | null;
        }
    ) => UnknownDocumentEnvelope;
    updateDocumentData: (id: string, updater: (data: unknown) => unknown) => void;
    updateDocumentMetadata: (id: string, updates: Partial<DocumentMetadata>) => void;
    /** Applies the document side of a library move in one write. */
    relocateDocuments: (changes: readonly DocumentRelocation[]) => void;
    /** Writes the document-global value bag, validated against the rendered template. */
    updateTemplateValues: (
        id: string,
        template: CustomTemplate,
        updater: (values: TemplatePageValues) => TemplatePageValues
    ) => void;
    /** Puts the system data back to its defaults, clears page values and the name. */
    resetDocument: (id: string) => void;
    deleteDocument: (id: string) => void;
    /**
     * Runs tree operations (folders, moves, deletes) on the index in one write; nothing is
     * written when they change nothing. Deleted ids wait in `pendingPurge`, restored ones leave it.
     */
    applyTreeOperations: (operations: readonly TreeOperation[]) => TreeResult;
    importDocument: (document: UnknownDocumentEnvelope) => void;
    /**
     * Keeps an imported file that failed validation in the bounded recovery collection; a known
     * `id` updates that record instead. Returns false when the collection is full.
     */
    retainImportForRecovery: (entry: unknown, error: unknown, id?: string) => boolean;
    /** Drops one record, by id, once its file has been imported. */
    forgetRecoveryEntry: (id: string) => void;
    clearRecoveryEntries: () => void;
}

/** What version 4 saved (every envelope in the value) and the legacy migration produces. */
interface PersistedDocumentState {
    documents: UnknownDocumentEnvelope[];
    currentDocumentId: string | null;
    recoveryEntries: unknown[];
}

/** What is saved now: the light state; documents are separate records (spec 032, D2). */
interface SlimDocumentState {
    entries: DocumentIndexEntry[];
    folders: Folder[];
    pendingPurge: string[];
    currentDocumentId: string | null;
    recoveryEntries: unknown[];
}

const MAX_LOADED_DOCUMENTS = 8;
/** Every open document of the layout (spec 036, `MAX_DOCUMENTS`). */
const MAX_PINNED_DOCUMENTS = 12;
/** A document's changed time moves at most this often while it is edited (spec 032, D3). */
const TOUCH_INTERVAL_MS = 5000;
const lastTouch = new Map<string, number>();
let openRequest = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deletes the device images `before` names and `after` no longer does (F-009). A deleted document
 * keeps its images until the purge, so an undo brings them back.
 */
function releaseImages(before: UnknownDocumentEnvelope, after: UnknownDocumentEnvelope) {
    const kept = deviceImageIdsOf(after);
    for (const id of deviceImageIdsOf(before)) {
        if (!kept.has(id)) void deletePortrait(id);
    }
}

/**
 * Prepares a persisted entry for schema parsing: v2 entries carry a nested
 * `{ templateId: { fieldKey: value } }` bag, which the v3 flat schema rejects before any
 * migration would run. Here we flatten the raw bag before `parseDocument` sees it.
 */
function preparePersistedEntry(entry: unknown): unknown {
    if (!isRecord(entry) || !isRecord(entry.templateValues)) return entry;
    return { ...entry, templateValues: flattenLegacyTemplateValues(entry.templateValues) };
}

function reportRecovery(
    entry: unknown,
    error: unknown,
    retained: boolean,
    origin: 'Persisted' | 'Imported'
) {
    reportSheetIssue({
        code: 'document-recovered',
        message: retained
            ? `${origin} document failed to parse and moved to recovery`
            : `${origin} document failed to parse and was dropped (recovery is full)`,
        details: {
            documentId: isRecord(entry) ? entry.id : undefined,
            error: describeError(error),
        },
    });
}

/** Keeps an unparseable persisted entry in the bounded recovery collection and reports why. */
function retainForRecovery(recoveryEntries: unknown[], entry: unknown, error: unknown) {
    const retained = recoveryEntries.length < MAX_RECOVERY_ENTRIES;
    if (retained) recoveryEntries.push(entry);
    reportRecovery(entry, error, retained, 'Persisted');
}

/** A change an import made so an old file passes today's rules (shown in the batch summary). */
export interface ImportRepair {
    kind: string;
    path: string;
}

export type LegacyRead =
    | { status: 'not-legacy' }
    | { status: 'ended' }
    | { status: 'converted'; document: UnknownDocumentEnvelope; repairs: ImportRepair[] };

/**
 * The untagged flat character of the first versions as a document. Throws what validation throws;
 * `ended` once its temporary support is over (spec 031).
 */
export function readLegacyExport(raw: unknown, now: Date): LegacyRead {
    if (!looksLikeLegacyExport(raw)) return { status: 'not-legacy' };
    if (!isLegacyExportSupported(now)) return { status: 'ended' };
    return { status: 'converted', ...convertLegacyExport(raw) };
}

export function migrateDocumentStoreState(input: unknown): PersistedDocumentState {
    if (!isRecord(input)) {
        return { documents: [], currentDocumentId: null, recoveryEntries: [] };
    }

    if (Array.isArray(input.documents)) {
        const documents: UnknownDocumentEnvelope[] = [];
        const recoveryEntries = Array.isArray(input.recoveryEntries)
            ? input.recoveryEntries.slice(0, MAX_RECOVERY_ENTRIES)
            : [];
        for (const entry of input.documents) {
            try {
                documents.push(systemRegistry.parseDocument(preparePersistedEntry(entry)).envelope);
            } catch (error) {
                retainForRecovery(recoveryEntries, entry, error);
            }
        }
        const requestedId =
            typeof input.currentDocumentId === 'string' ? input.currentDocumentId : null;
        return {
            documents,
            currentDocumentId: documents.some(({ id }) => id === requestedId) ? requestedId : null,
            recoveryEntries,
        };
    }

    const legacyCharacters = Array.isArray(input.characters) ? input.characters : [];
    const documents: UnknownDocumentEnvelope[] = [];
    const recoveryEntries: unknown[] = [];
    for (const entry of legacyCharacters) {
        try {
            documents.push(convertLegacyExport(entry).document);
        } catch (error) {
            retainForRecovery(recoveryEntries, entry, error);
        }
    }
    const legacyCurrentId = isRecord(input.currentCharacter) ? input.currentCharacter.id : null;
    const currentDocumentId =
        typeof legacyCurrentId === 'string' && documents.some(({ id }) => id === legacyCurrentId)
            ? legacyCurrentId
            : null;

    return { documents, currentDocumentId, recoveryEntries };
}

const WRITE_BATCH = 25;

/**
 * Version 4 → 5 (and older shapes through it): the raw value is kept as a backup first, then every
 * envelope becomes its own record and a light entry. Safe to run twice; nothing is deleted here.
 */
export async function migrateToIndexedState(input: unknown): Promise<SlimDocumentState> {
    const { documents, currentDocumentId, recoveryEntries } = migrateDocumentStoreState(input);
    if (isRecord(input)) {
        await saveBackup(input);
        await startBackupCountdown();
    }
    for (let start = 0; start < documents.length; start += WRITE_BATCH) {
        await Promise.all(
            documents
                .slice(start, start + WRITE_BATCH)
                .map((document) => writeRecord(document.id, document))
        );
    }
    const now = Date.now();
    return {
        entries: documents.map((document, index) => ({
            ...entryOf(document, undefined, {}, now),
            rank: index + 1,
        })),
        folders: [],
        pendingPurge: [],
        currentDocumentId,
        recoveryEntries,
    };
}

/** The entries with this document's entry brought in line with its envelope. */
function syncEntry(
    entries: DocumentIndexEntry[],
    document: UnknownDocumentEnvelope,
    { touch }: { touch: boolean }
): DocumentIndexEntry[] {
    const position = entries.findIndex(({ id }) => id === document.id);
    const previous = entries[position];
    const now = Date.now();
    let changedAt: string | undefined;
    if (touch && now - (lastTouch.get(document.id) ?? 0) >= TOUCH_INTERVAL_MS) {
        lastTouch.set(document.id, now);
        changedAt = new Date(now).toISOString();
    }
    const next = entryOf(document, previous, { changedAt }, now);
    if (previous && sameEntry(previous, next)) return entries;
    if (!previous) return [...entries, { ...next, rank: nextRank(entries) }];
    return entries.map((entry, index) => (index === position ? next : entry));
}

/**
 * Writes a name given in the documents window into the document itself (its name value, when the
 * kind has one, and its title). The document is read first when it is only an entry.
 */
async function renameDocumentContent(id: string, name: string): Promise<void> {
    const store = useDocumentStore;
    let document = store.getState().documents.find((candidate) => candidate.id === id);
    if (!document) {
        const entry = store.getState().entries.find((candidate) => candidate.id === id);
        document = (await readEnvelope(id, entry)) ?? undefined;
        if (!document) return;
        const loaded = document;
        store.setState((state) => ({
            documents: state.documents.some((candidate) => candidate.id === id)
                ? state.documents
                : loadInto(state.documents, loaded, keepIds(state, id)),
        }));
    }
    const capability = systemRegistry.getDocumentDefinition(
        document.systemId,
        document.definitionId
    )?.capabilities?.character;
    const { updateDocumentData, updateDocumentMetadata } = store.getState();
    if (capability) {
        updateDocumentData(id, (data) => {
            const { metadata } = capability.read(id, data);
            return capability.applyUpdates(data, { metadata: { ...metadata, name } });
        });
    }
    updateDocumentMetadata(id, { title: name });
}

/** The ids a read must not evict: the one being shown, the current one, and the panes' documents. */
function keepIds(
    state: Pick<DocumentStoreState, 'currentDocumentId' | 'pinnedIds'>,
    ...ids: string[]
): string[] {
    return [
        ...ids,
        ...(state.currentDocumentId ? [state.currentDocumentId] : []),
        ...state.pinnedIds,
    ];
}

/** Adds a read document to the loaded ones, dropping the oldest that is neither kept nor unsaved. */
function loadInto(
    documents: UnknownDocumentEnvelope[],
    document: UnknownDocumentEnvelope,
    keep: readonly string[]
): UnknownDocumentEnvelope[] {
    const next = [...documents.filter(({ id }) => id !== document.id), document];
    for (let index = 0; next.length > MAX_LOADED_DOCUMENTS && index < next.length;) {
        const candidate = next[index]!;
        if (keep.includes(candidate.id) || recordWriter.isPending(candidate.id)) index += 1;
        else next.splice(index, 1);
    }
    return next;
}

const stateCreator: StateCreator<DocumentStoreState, [], []> = (set, get) => ({
    documents: [],
    entries: [],
    folders: [],
    pendingPurge: [],
    opening: null,
    currentDocumentId: null,
    pinnedIds: [],
    recoveryEntries: [],

    pinDocuments: (ids) => set({ pinnedIds: ids.slice(0, MAX_PINNED_DOCUMENTS) }),

    loadIntoCache: async (ids) => {
        const { documents, entries } = get();
        const wanted = ids.filter(
            (id) =>
                entries.some((entry) => entry.id === id) &&
                !documents.some((document) => document.id === id)
        );
        const read = await Promise.all(
            wanted.map((id) =>
                readEnvelope(
                    id,
                    entries.find((entry) => entry.id === id)
                )
            )
        );
        set((state) => {
            let next = state.documents;
            for (const document of read) {
                if (
                    !document ||
                    !state.entries.some((entry) => entry.id === document.id) ||
                    next.some((candidate) => candidate.id === document.id)
                ) {
                    continue;
                }
                next = loadInto(next, document, keepIds(state, ...ids));
            }
            return next === state.documents ? state : { documents: next };
        });
    },

    setCurrentDocument: (id) => {
        if (id === null) {
            set({ currentDocumentId: null, opening: null });
            return;
        }
        const { documents, entries } = get();
        if (documents.some((document) => document.id === id)) {
            set({ currentDocumentId: id, opening: null });
        } else if (entries.some((entry) => entry.id === id)) {
            void get().openDocument(id);
        }
    },

    openDocument: async (id) => {
        const { documents, entries } = get();
        if (documents.some((document) => document.id === id)) {
            set({ currentDocumentId: id, opening: null });
            return true;
        }
        const entry = entries.find((candidate) => candidate.id === id);
        if (!entry) return false;
        const request = ++openRequest;
        set({ opening: id });
        const document = await readEnvelope(id, entry);
        if (request !== openRequest) return false;
        if (!document || !get().entries.some((candidate) => candidate.id === id)) {
            set({ opening: null });
            return false;
        }
        set((state) => ({
            documents: loadInto(state.documents, document, keepIds(state, id)),
            currentDocumentId: id,
            opening: null,
        }));
        return true;
    },

    createDocument: (systemId, definitionId, options = {}) => {
        const definition = systemRegistry.getDocumentDefinition(systemId, definitionId);
        const system = systemRegistry.getSystem(systemId);
        if (!definition || !system) {
            throw new Error(`Unsupported document definition: ${systemId}/${definitionId}`);
        }
        const document: UnknownDocumentEnvelope = {
            id: generateId(),
            kind: definition.kind,
            systemId: system.id,
            definitionId: definition.id,
            schemaVersion: definition.schemaVersion,
            metadata: {
                title: '',
                tags: [],
                preferredViewId: options.preferredViewId ?? definition.defaultViewId,
                ...(options.settingId ? { settingId: options.settingId } : {}),
                ...(options.templateId ? { templateId: options.templateId } : {}),
            },
            templateValues: {},
            data: definition.schema.parse(definition.createDefault()),
        };
        const now = Date.now();
        const stamp = new Date(now).toISOString();
        lastTouch.set(document.id, now);
        set(({ documents, entries, folders, currentDocumentId }) => ({
            documents: [...documents, document],
            entries: [
                ...entries,
                {
                    ...entryOf(document, undefined, { createdAt: stamp, changedAt: stamp }, now),
                    parentId:
                        options.parentId && folders.some(({ id }) => id === options.parentId)
                            ? options.parentId
                            : null,
                    rank: nextRank(entries),
                },
            ],
            currentDocumentId: options.activate === false ? currentDocumentId : document.id,
        }));
        return document;
    },

    updateDocumentData: (id, updater) => {
        const current = get().documents.find((document) => document.id === id);
        if (!current || isPresetId(id)) return;
        const definition = systemRegistry.getDocumentDefinition(
            current.systemId,
            current.definitionId
        );
        if (!definition) return;
        const nextData = definition.schema.parse(updater(current.data));
        const next = { ...current, data: nextData };
        set(({ documents, entries }) => ({
            documents: documents.map((document) => (document.id === id ? next : document)),
            entries: syncEntry(entries, next, { touch: true }),
        }));
        releaseImages(current, next);
    },

    updateDocumentMetadata: (id, updates) => {
        if (isPresetId(id)) return;
        set(({ documents, entries }) => {
            let nextEntries = entries;
            const nextDocuments = documents.map((document) => {
                if (document.id !== id) return document;
                const next = {
                    ...document,
                    metadata: DocumentMetadataSchema.parse({ ...document.metadata, ...updates }),
                };
                nextEntries = syncEntry(entries, next, { touch: true });
                return next;
            });
            return { documents: nextDocuments, entries: nextEntries };
        });
    },

    relocateDocuments: (changes) => {
        const byId = new Map(
            changes.filter(({ id }) => !isPresetId(id)).map((change) => [change.id, change])
        );
        if (byId.size === 0) return;
        const now = Date.now();
        set(({ documents, entries }) => ({
            // Entries carry the move for every document; a record that is not loaded gets it
            // when it is read (applyEntryFields).
            entries: entries.map((entry) => {
                const change = byId.get(entry.id);
                if (!change) return entry;
                const next = { ...entry, updatedAt: now };
                if (change.settingId === null) delete next.settingId;
                else if (change.settingId !== undefined) next.settingId = change.settingId;
                if (change.templateId === null) delete next.templateId;
                else if (change.templateId !== undefined) next.templateId = change.templateId;
                if (change.systemId && isUserKind(entry.definitionId)) {
                    next.systemId = SystemIdSchema.parse(change.systemId);
                }
                return next;
            }),
            documents: documents.map((document) => {
                const change = byId.get(document.id);
                if (!change) return document;
                const metadata = { ...document.metadata };
                if (change.settingId === null) delete metadata.settingId;
                else if (change.settingId !== undefined) metadata.settingId = change.settingId;
                if (change.templateId === null) delete metadata.templateId;
                else if (change.templateId !== undefined) metadata.templateId = change.templateId;
                const systemId =
                    change.systemId && isUserKind(document.definitionId)
                        ? SystemIdSchema.parse(change.systemId)
                        : document.systemId;
                return { ...document, systemId, metadata: DocumentMetadataSchema.parse(metadata) };
            }),
        }));
    },

    updateTemplateValues: (id, template, updater) => {
        if (isPresetId(id)) return;
        const current = get().documents.find((document) => document.id === id);
        if (!current) {
            reportSheetIssue({
                code: 'template-value-write-skipped',
                message: 'Template value write targets a document that is not in the store',
                details: { documentId: id, templateId: template.id },
            });
            return;
        }
        // Values are stored document-globally keyed by valueKey (clarification D1):
        // fields across templates sharing a valueKey write the same coordinate.
        const previousPage = (current.templateValues ?? {}) as TemplatePageValues;
        const result = applyTemplateValueWrites(template, previousPage, updater(previousPage));
        if (!result.ok) {
            reportSheetIssue({
                code: 'template-value-write-rejected',
                message: 'Template value failed validation; the write was discarded',
                details: {
                    documentId: id,
                    templateId: template.id,
                    key: result.key,
                    reason: result.reason,
                },
            });
            return;
        }
        const next = { ...current, templateValues: result.values };
        set(({ documents, entries }) => ({
            documents: documents.map((document) => (document.id === id ? next : document)),
            entries: syncEntry(entries, next, { touch: true }),
        }));
        releaseImages(current, next);
    },

    resetDocument: (id) => {
        const current = get().documents.find((document) => document.id === id);
        if (!current || isPresetId(id)) return;
        const definition = systemRegistry.getDocumentDefinition(
            current.systemId,
            current.definitionId
        );
        if (!definition) return;
        const { updateDocumentData, updateDocumentMetadata } = get();
        updateDocumentData(id, () => definition.createDefault());
        set(({ documents }) => ({
            documents: documents.map((document) =>
                document.id === id ? { ...document, templateValues: {} } : document
            ),
        }));
        updateDocumentMetadata(id, { title: '' });
        const reset = get().documents.find((document) => document.id === id);
        if (reset) releaseImages(current, reset);
    },

    deleteDocument: (id) => {
        if (isPresetId(id)) return;
        const { currentDocumentId, documents, entries, pendingPurge } = get();
        if (!entries.some((entry) => entry.id === id) && !documents.some((d) => d.id === id)) {
            return;
        }
        // The record and its portrait are removed at the next start, so an undo can bring the
        // document back (spec 032, D5).
        set({
            documents: documents.filter((document) => document.id !== id),
            entries: entries.filter((entry) => entry.id !== id),
            pendingPurge: pendingPurge.includes(id) ? pendingPurge : [...pendingPurge, id],
            currentDocumentId: currentDocumentId === id ? null : currentDocumentId,
        });
    },

    applyTreeOperations: (operations) => {
        const { entries, folders, documents, pendingPurge, currentDocumentId } = get();
        const result = applyOperations({ entries, folders }, operations);
        if (result.inverse.length === 0) return result;
        const removed = new Set(result.removed);
        const added = new Set(result.added);
        const before = new Map(entries.map((entry) => [entry.id, entry.name]));
        const renamed = result.state.entries.filter(
            (entry) => before.has(entry.id) && before.get(entry.id) !== entry.name
        );
        set({
            entries: result.state.entries,
            folders: result.state.folders,
            documents: documents.filter(({ id }) => !removed.has(id)),
            pendingPurge: [
                ...pendingPurge.filter((id) => !added.has(id)),
                ...result.removed.filter((id) => !pendingPurge.includes(id)),
            ],
            currentDocumentId:
                currentDocumentId !== null && removed.has(currentDocumentId)
                    ? null
                    : currentDocumentId,
        });
        // A document's name lives in the document too: the sheet's name field is the same fact.
        for (const { id, name } of renamed) void renameDocumentContent(id, name);
        return result;
    },

    retainImportForRecovery: (entry, error, id) => {
        const recoveryEntries = [...get().recoveryEntries];
        const record = newRecoveryRecord(entry, describeError(error), id);
        const known = recoveryEntries.findIndex((kept) => asRecoveryRecord(kept).id === id);
        if (id !== undefined && known >= 0) recoveryEntries[known] = record;
        else if (recoveryEntries.length < MAX_RECOVERY_ENTRIES) recoveryEntries.push(record);
        else {
            reportRecovery(entry, error, false, 'Imported');
            return false;
        }
        set({ recoveryEntries });
        reportRecovery(entry, error, true, 'Imported');
        return true;
    },
    forgetRecoveryEntry: (id) =>
        set((state) => ({
            recoveryEntries: state.recoveryEntries.filter(
                (kept) => asRecoveryRecord(kept).id !== id
            ),
        })),
    clearRecoveryEntries: () => set({ recoveryEntries: [] }),
    importDocument: (document) => {
        if (isPresetId(document.id)) return;
        const parsed = systemRegistry.parseDocument(document).envelope;
        const now = Date.now();
        const stamp = new Date(now).toISOString();
        set(({ documents, entries, pendingPurge }) => {
            const existing = entries.find(({ id }) => id === parsed.id);
            const nextEntry = {
                ...entryOf(
                    parsed,
                    existing,
                    existing ? { changedAt: stamp } : { createdAt: stamp, changedAt: stamp },
                    now
                ),
                rank: existing?.rank ?? nextRank(entries),
            };
            return {
                documents: documents.some(({ id }) => id === parsed.id)
                    ? documents.map((existingDocument) =>
                          existingDocument.id === parsed.id ? parsed : existingDocument
                      )
                    : [...documents, parsed],
                entries: existing
                    ? entries.map((entry) => (entry.id === parsed.id ? nextEntry : entry))
                    : [...entries, nextEntry],
                pendingPurge: pendingPurge.filter((id) => id !== parsed.id),
                currentDocumentId: parsed.id,
            };
        });
    },
});

/**
 * The envelopes of these ids, from memory or read from their records, without opening them or
 * keeping them loaded; ids with no readable record are left out. For checks that must see stored
 * values of documents that are not open (the template save checks).
 */
export async function loadDocuments(ids: readonly string[]): Promise<UnknownDocumentEnvelope[]> {
    const { documents, entries } = useDocumentStore.getState();
    const found: UnknownDocumentEnvelope[] = [];
    const missing: string[] = [];
    for (const id of ids) {
        const loaded = documents.find((document) => document.id === id);
        if (loaded) found.push(loaded);
        else missing.push(id);
    }
    for (let start = 0; start < missing.length; start += WRITE_BATCH) {
        const read = await Promise.all(
            missing.slice(start, start + WRITE_BATCH).map((id) =>
                readEnvelope(
                    id,
                    entries.find((entry) => entry.id === id)
                )
            )
        );
        for (const document of read) if (document) found.push(document);
    }
    return found;
}

const isBrowser = typeof window !== 'undefined';

/** The stored value, with what another tab saved since merged in (spec 032, D13). */
async function saveMerged(name: string, value: string) {
    const localforage = (await import('localforage')).default;
    const stored = await localforage.getItem<string>(name);
    await localforage.setItem(name, mergeStoredValue(stored, value, purgedIds));
}

/** Set when the migration failed: nothing is saved until a reload, so the old value survives. */
let migrationFailed = false;

function mergePersisted(persisted: unknown, current: DocumentStoreState): DocumentStoreState {
    if (!isRecord(persisted)) return current;
    const { entries } = parseEntries(persisted.entries);
    const { folders } = parseFolders(persisted.folders);
    const pendingPurge = [
        ...new Set([
            ...current.pendingPurge,
            ...(Array.isArray(persisted.pendingPurge)
                ? persisted.pendingPurge.filter((id): id is string => typeof id === 'string')
                : []),
        ]),
    ];
    const held = new Set(entries.map(({ id }) => id));
    const requested =
        typeof persisted.currentDocumentId === 'string' ? persisted.currentDocumentId : null;
    return {
        ...current,
        entries: mergeById(entries, current.entries, new Set(current.pendingPurge)),
        folders: mergeById(folders, current.folders, new Set(current.pendingPurge)),
        pendingPurge,
        recoveryEntries: Array.isArray(persisted.recoveryEntries)
            ? persisted.recoveryEntries.slice(0, MAX_RECOVERY_ENTRIES)
            : current.recoveryEntries,
        currentDocumentId:
            current.currentDocumentId ??
            (requested !== null && held.has(requested) ? requested : null),
    };
}

export const useDocumentStore = isBrowser
    ? create<DocumentStoreState>()(
          persist(stateCreator, {
              name: 'universal-character-storage',
              version: STORE_VERSION,
              migrate: async (persisted) => {
                  try {
                      return await migrateToIndexedState(persisted);
                  } catch (error) {
                      migrationFailed = true;
                      reportSheetIssue({
                          code: 'document-migration-failed',
                          message: 'Stored documents could not be moved to the new layout',
                          details: { error: describeError(error) },
                      });
                      throw error;
                  }
              },
              merge: (persisted, current) => mergePersisted(persisted, current),
              storage: createJSONStorage(() => ({
                  getItem: async (name: string) => {
                      const localforage = await import('localforage');
                      const value = await localforage.default.getItem<string>(name);
                      return value ?? null;
                  },
                  setItem: async (name: string, value: string) => {
                      if (migrationFailed) return;
                      await saveMerged(name, value);
                  },
                  removeItem: async (name: string) => {
                      const localforage = await import('localforage');
                      await localforage.default.removeItem(name);
                  },
              })),
              partialize: ({
                  currentDocumentId,
                  entries,
                  folders,
                  pendingPurge,
                  recoveryEntries,
              }): SlimDocumentState => ({
                  currentDocumentId,
                  entries,
                  folders,
                  pendingPurge,
                  recoveryEntries,
              }),
              onRehydrateStorage: () => (_state, error) => {
                  if (error) return;
                  queueMicrotask(() => void bootDocuments(documentBootApi()));
              },
          })
      )
    : create<DocumentStoreState>()(stateCreator);

function documentBootApi() {
    return {
        getState: () => useDocumentStore.getState(),
        setState: (partial: Partial<DocumentStoreState>) => useDocumentStore.setState(partial),
        openDocument: (id: string) => useDocumentStore.getState().openDocument(id),
    };
}

if (isBrowser) {
    // Changed documents are saved as their own records, after a short pause (spec 032, D3).
    useDocumentStore.subscribe((state, previous) => {
        if (state.documents === previous.documents) return;
        const before = new Map(previous.documents.map((document) => [document.id, document]));
        for (const document of state.documents) {
            if (before.get(document.id) === document || isCleanEnvelope(document)) continue;
            recordWriter.schedule(document);
        }
    });
    window.addEventListener('pagehide', () => void recordWriter.flush());
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') void recordWriter.flush();
    });
}
