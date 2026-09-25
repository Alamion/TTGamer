import { generateId } from '@site/src/shared/utils/random';
import type { StateCreator } from 'zustand';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isPresetId } from '../data/presets';
import { describeError, reportSheetIssue } from '../diagnostics';
import {
    applyTemplateValueWrites,
    collectTableBlocks,
} from '../features/sheet/data/templateValueWrites';
import { deletePortrait } from '../persistence/portraitStorage';
import { systemRegistry } from '../systems';
import { characterDocumentFromBase } from '../systems/star-wars-wod/characterDocument';
import type { DocumentMetadata, UnknownDocumentEnvelope } from '../types/document';
import { DocumentMetadataSchema } from '../types/document';
import { collectTemplateFields, type CustomTemplate, fieldValueKey } from '../types/template';
import type { TemplatePageValues } from '../types/templateValues';
import { useTemplateStore } from './templateStore';

/** Version 4: a re-parse that rewrites renamed system ids (`v5` → `wod-v5`). */
const STORE_VERSION = 4;

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

export interface DocumentStoreState {
    documents: UnknownDocumentEnvelope[];
    currentDocumentId: string | null;
    recoveryEntries: unknown[];
    setCurrentDocument: (id: string | null) => void;
    /** `settingId` / `templateId`: a document created in a user setting, on its page (spec 012). */
    createDocument: (
        systemId: string,
        definitionId: string,
        options?: { settingId?: string; templateId?: string }
    ) => UnknownDocumentEnvelope;
    updateDocumentData: (id: string, updater: (data: unknown) => unknown) => void;
    updateDocumentMetadata: (id: string, updates: Partial<DocumentMetadata>) => void;
    /** Writes the document-global value bag, validated against the rendered template. */
    updateTemplateValues: (
        id: string,
        template: CustomTemplate,
        updater: (values: TemplatePageValues) => TemplatePageValues
    ) => void;
    deleteDocument: (id: string) => void;
    importDocument: (document: UnknownDocumentEnvelope) => void;
    /** Keeps an imported file that failed validation in the bounded recovery collection. */
    retainImportForRecovery: (entry: unknown, error: unknown) => void;
}

interface PersistedDocumentState {
    documents: UnknownDocumentEnvelope[];
    currentDocumentId: string | null;
    recoveryEntries: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getPortraitId(document: UnknownDocumentEnvelope | undefined) {
    if (!document || !isRecord(document.data) || !isRecord(document.data.metadata)) {
        return undefined;
    }
    const portraitId = document.data.metadata.portraitId;
    return typeof portraitId === 'string' ? portraitId : undefined;
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

/** Keeps an unparseable persisted entry in the bounded recovery collection and reports why. */
function retainForRecovery(
    recoveryEntries: unknown[],
    entry: unknown,
    error: unknown,
    origin: 'Persisted' | 'Imported' = 'Persisted'
) {
    const retained = recoveryEntries.length < MAX_RECOVERY_ENTRIES;
    if (retained) recoveryEntries.push(entry);
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
            documents.push(characterDocumentFromBase(entry));
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

const stateCreator: StateCreator<DocumentStoreState, [], []> = (set, get) => ({
    documents: [],
    currentDocumentId: null,
    recoveryEntries: [],

    setCurrentDocument: (id) => {
        if (id !== null && !get().documents.some((document) => document.id === id)) return;
        set({ currentDocumentId: id });
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
                preferredViewId: definition.defaultViewId,
                ...(options.settingId ? { settingId: options.settingId } : {}),
                ...(options.templateId ? { templateId: options.templateId } : {}),
            },
            templateValues: {},
            data: definition.schema.parse(definition.createDefault()),
        };
        set(({ documents }) => ({
            documents: [...documents, document],
            currentDocumentId: document.id,
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
        set(({ documents }) => ({
            documents: documents.map((document) =>
                document.id === id ? { ...document, data: nextData } : document
            ),
        }));

        const previousPortraitId = getPortraitId(current);
        const nextPortraitId = getPortraitId({ ...current, data: nextData });
        if (previousPortraitId && previousPortraitId !== nextPortraitId) {
            void deletePortrait(previousPortraitId);
        }
    },

    updateDocumentMetadata: (id, updates) => {
        if (isPresetId(id)) return;
        set(({ documents }) => ({
            documents: documents.map((document) =>
                document.id === id
                    ? {
                          ...document,
                          metadata: DocumentMetadataSchema.parse({
                              ...document.metadata,
                              ...updates,
                          }),
                      }
                    : document
            ),
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
        const merged = result.values;
        set(({ documents }) => ({
            documents: documents.map((document) =>
                document.id === id
                    ? {
                          ...document,
                          templateValues: merged,
                      }
                    : document
            ),
        }));
    },

    deleteDocument: (id) => {
        if (isPresetId(id)) return;
        const { currentDocumentId, documents } = get();
        const deleted = documents.find((document) => document.id === id);
        set({
            documents: documents.filter((document) => document.id !== id),
            currentDocumentId: currentDocumentId === id ? null : currentDocumentId,
        });
        void deletePortrait(getPortraitId(deleted));
    },

    retainImportForRecovery: (entry, error) =>
        set((state) => {
            const recoveryEntries = [...state.recoveryEntries];
            retainForRecovery(recoveryEntries, entry, error, 'Imported');
            return { recoveryEntries };
        }),
    importDocument: (document) => {
        if (isPresetId(document.id)) return;
        const parsed = systemRegistry.parseDocument(document).envelope;
        set(({ documents }) => ({
            documents: documents.some(({ id }) => id === parsed.id)
                ? documents.map((existing) => (existing.id === parsed.id ? parsed : existing))
                : [...documents, parsed],
            currentDocumentId: parsed.id,
        }));
    },
});

const isBrowser = typeof window !== 'undefined';

export const useDocumentStore = isBrowser
    ? create<DocumentStoreState>()(
          persist(stateCreator, {
              name: 'universal-character-storage',
              version: STORE_VERSION,
              migrate: migrateDocumentStoreState,
              storage: createJSONStorage(() => ({
                  getItem: async (name: string) => {
                      const localforage = await import('localforage');
                      const value = await localforage.default.getItem<string>(name);
                      return value ?? null;
                  },
                  setItem: async (name: string, value: string) => {
                      const localforage = await import('localforage');
                      await localforage.default.setItem(name, value);
                  },
                  removeItem: async (name: string) => {
                      const localforage = await import('localforage');
                      await localforage.default.removeItem(name);
                  },
              })),
              partialize: ({ currentDocumentId, documents, recoveryEntries }) => ({
                  currentDocumentId,
                  documents,
                  recoveryEntries,
              }),
          })
      )
    : create<DocumentStoreState>()(stateCreator);
