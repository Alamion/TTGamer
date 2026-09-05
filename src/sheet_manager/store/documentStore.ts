import { generateId } from '@site/src/shared/utils/random';
import type { StateCreator } from 'zustand';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isPresetId } from '../data/presets';
import { deletePortrait } from '../persistence/portraitStorage';
import { starWarsCharacterDefinition, starWarsDroidDefinition, systemRegistry } from '../systems';
import { DroidDataSchema, StarWarsCharacterDataSchema } from '../systems/star-wars-wod';
import { BaseCharacterSchema } from '../types/character';
import type { DocumentMetadata, UnknownDocumentEnvelope } from '../types/document';
import { DocumentMetadataSchema } from '../types/document';
import { collectTemplateFields, type CustomTemplate, fieldValueKey } from '../types/template';
import {
    TEMPLATE_VALUES_LIMITS,
    type TemplateFieldValue,
    type TemplatePageValues,
    type TemplateTableRows,
    TemplateTableRowSchema,
    validateTemplateValue,
} from '../types/templateValues';
import { useTemplateStore } from './templateStore';

const STORE_VERSION = 3;

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
            ? new Set([...fieldDefs.keys(), ...getTableBlocks(template!).keys()])
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
    createDocument: (systemId: string, definitionId: string) => UnknownDocumentEnvelope;
    updateDocumentData: (id: string, updater: (data: unknown) => unknown) => void;
    updateDocumentMetadata: (id: string, updates: Partial<DocumentMetadata>) => void;
    updateTemplateValues: (
        id: string,
        templateId: string,
        updater: (values: TemplatePageValues) => TemplatePageValues
    ) => void;
    deleteDocument: (id: string) => void;
    importDocument: (document: UnknownDocumentEnvelope) => void;
}

interface PersistedDocumentState {
    documents: UnknownDocumentEnvelope[];
    currentDocumentId: string | null;
    recoveryEntries: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getTableBlocks(template: CustomTemplate) {
    const blocks = new Map<
        string,
        Extract<CustomTemplate['sections'][number]['blocks'][number], { type: 'table' }>
    >();
    for (const section of template.sections) {
        for (const block of section.blocks) {
            if (block.type === 'table') blocks.set(block.id, block);
        }
    }
    return blocks;
}

/**
 * Strict write path: entries matching template fields/blocks are validated against the
 * template's own definitions; orphaned entries (fields the template no longer declares)
 * pass through untouched so template edits never destroy character data (spec FR-12).
 */
function validateTemplatePageValues(
    template: CustomTemplate,
    page: TemplatePageValues
): TemplatePageValues | null {
    const fieldDefs = collectTemplateFields(template);
    const tableBlocks = getTableBlocks(template);
    const validated: TemplatePageValues = {};

    for (const [key, value] of Object.entries(page)) {
        // `undefined` means "clear this entry" — the key is dropped from the sparse bag.
        if (value === undefined) continue;

        const field = fieldDefs.get(key);
        if (field) {
            const result = validateTemplateValue(field, value);
            if (!result.ok) return null;
            validated[key] = result.value;
            continue;
        }

        const block = tableBlocks.get(key);
        if (block) {
            if (!isRecord(value)) return null;
            if (Object.keys(value).length > block.maxRows) return null;
            const columns = new Map(block.columns.map((column) => [column.id, column]));
            const rows: TemplateTableRows = {};
            for (const [rowIndex, row] of Object.entries(value)) {
                if (!isRecord(row)) return null;
                const cells: Record<string, TemplateFieldValue> = {};
                for (const [columnId, cell] of Object.entries(row)) {
                    if (cell === undefined) continue;
                    const column = columns.get(columnId);
                    if (!column) return null;
                    const result = validateTemplateValue(column, cell);
                    if (!result.ok) return null;
                    cells[columnId] = result.value;
                }
                if (Object.keys(cells).length === 0 && Object.keys(row).length === 0) {
                    rows[rowIndex] = {};
                    continue;
                }
                const parsedRow = TemplateTableRowSchema.safeParse(cells);
                if (!parsedRow.success) return null;
                rows[rowIndex] = parsedRow.data;
            }
            validated[key] = rows;
            continue;
        }

        validated[key] = value;
    }

    if (Object.keys(validated).length > TEMPLATE_VALUES_LIMITS.entriesPerTemplate) return null;
    return validated;
}

/**
 * Projects the document-global value bag into the template's coordinate view: entries under
 * the template's own legacy namespace (migration remnants) merged with shared valueKey
 * entries. The renderer only ever sees keys the template can address.
 */
function flattenDocumentTemplateValues(document: UnknownDocumentEnvelope): TemplatePageValues {
    // After the v3 migration the bag is already flat; a cast documents the coordinate change.
    return (document.templateValues ?? {}) as TemplatePageValues;
}

function getPortraitId(document: UnknownDocumentEnvelope | undefined) {
    if (!document || !isRecord(document.data) || !isRecord(document.data.metadata)) {
        return undefined;
    }
    const portraitId = document.data.metadata.portraitId;
    return typeof portraitId === 'string' ? portraitId : undefined;
}

function wrapLegacyCharacter(input: unknown): UnknownDocumentEnvelope {
    const character = BaseCharacterSchema.parse(input);
    const { id, ...characterData } = character;
    const definition =
        character.metadata.type === 'droid' ? starWarsDroidDefinition : starWarsCharacterDefinition;
    const data =
        definition === starWarsDroidDefinition
            ? DroidDataSchema.parse({
                  ...characterData,
                  builtInEquipment: character.inventory,
                  damage: character.health,
              })
            : StarWarsCharacterDataSchema.parse(characterData);

    return {
        id,
        kind: definition.kind,
        systemId: systemRegistry.getSystem('star-wars-wod')!.id,
        definitionId: definition.id,
        schemaVersion: definition.schemaVersion,
        metadata: {
            title: character.metadata.name,
            tags: [],
            preferredViewId: definition.defaultViewId,
        },
        templateValues: {},
        data,
    };
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
            } catch {
                if (recoveryEntries.length < MAX_RECOVERY_ENTRIES) recoveryEntries.push(entry);
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
            documents.push(wrapLegacyCharacter(entry));
        } catch {
            if (recoveryEntries.length < MAX_RECOVERY_ENTRIES) recoveryEntries.push(entry);
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

    createDocument: (systemId, definitionId) => {
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

    updateTemplateValues: (id, templateId, updater) => {
        if (isPresetId(id) || !templateId) return;
        const current = get().documents.find((document) => document.id === id);
        if (!current) return;
        const template = useTemplateStore.getState().getTemplate(templateId);
        if (!template) return;
        // Values are stored document-globally keyed by valueKey (clarification D1):
        // fields across templates sharing a valueKey write the same coordinate.
        const updaterPage = updater(flattenDocumentTemplateValues(current));
        // Keys dropped by the updater (undefined) must also vanish from the stored bag,
        // so merging only the validated page would resurrect cleared values.
        const nextPage = validateTemplatePageValues(template, updaterPage);
        if (!nextPage) return;
        // Keys the updater dropped (undefined) must also vanish from the stored bag,
        // so a plain spread would resurrect cleared values.
        const clearedKeys = new Set(
            Object.keys(flattenDocumentTemplateValues(current)).filter(
                (key) => updaterPage[key] === undefined
            )
        );
        const merged: TemplatePageValues = { ...(current.templateValues ?? {}) };
        for (const key of clearedKeys) delete merged[key];
        for (const [key, value] of Object.entries(nextPage)) {
            merged[key] = value as TemplatePageValues[string];
        }
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
