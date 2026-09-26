import { useSyncExternalStore } from 'react';
import type { StateCreator } from 'zustand';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { describeError, reportSheetIssue } from '../diagnostics';
import {
    type UserDocumentType,
    UserDocumentTypeSchema,
    type UserSetting,
    UserSettingSchema,
} from '../systems/userTypes';

/**
 * Version 1 (spec 012): user document types and user settings.
 * Version 2 (spec 013): a type's default page is optional, and `defaultPages` records the chosen
 * default page of shipped types (`systemId:definitionId` → view or user template id).
 */
const STORE_VERSION = 2;
const MAX_QUARANTINE_ENTRIES = 100;

export interface DocumentTypeStoreState {
    types: Record<string, UserDocumentType>;
    settings: Record<string, UserSetting>;
    defaultPages: Record<string, string>;
    quarantine: unknown[];
    saveType: (type: UserDocumentType) => void;
    removeType: (id: string) => void;
    saveSetting: (setting: UserSetting) => void;
    removeSetting: (id: string) => void;
    /** Records (or with `null` clears) the default page of a shipped type. */
    setDefaultPage: (key: string, pageId: string | null) => void;
    /** Forgets every default-page choice that names a deleted or moved page. */
    dropDefaultPagesFor: (pageId: string) => void;
}

/** The `defaultPages` key of a shipped type. */
export function defaultPageKey(systemId: string, definitionId: string): string {
    return `${systemId}:${definitionId}`;
}

interface PersistedDocumentTypeState {
    types: Record<string, UserDocumentType>;
    settings: Record<string, UserSetting>;
    defaultPages: Record<string, string>;
    quarantine: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Parses persisted entries; unparseable ones move to the bounded quarantine and are reported. */
export function migrateDocumentTypeStoreState(input: unknown): PersistedDocumentTypeState {
    const quarantine: unknown[] =
        isRecord(input) && Array.isArray(input.quarantine)
            ? input.quarantine.slice(0, MAX_QUARANTINE_ENTRIES)
            : [];
    const retire = (entry: unknown, error: unknown) => {
        const retained = quarantine.length < MAX_QUARANTINE_ENTRIES;
        if (retained) quarantine.push(entry);
        reportSheetIssue({
            code: 'template-quarantined',
            message: retained
                ? 'Persisted document type failed to parse and moved to quarantine'
                : 'Persisted document type failed to parse and was dropped (quarantine is full)',
            details: { id: isRecord(entry) ? entry.id : undefined, error: describeError(error) },
        });
    };
    const parseAll = <T extends { id: string }>(
        raw: unknown,
        parse: (entry: unknown) => T
    ): Record<string, T> => {
        const parsed: Record<string, T> = {};
        if (!isRecord(raw)) return parsed;
        for (const entry of Object.values(raw)) {
            try {
                const value = parse(entry);
                parsed[value.id] = value;
            } catch (error) {
                retire(entry, error);
            }
        }
        return parsed;
    };
    return {
        types: parseAll(isRecord(input) ? input.types : undefined, (entry) =>
            UserDocumentTypeSchema.parse(entry)
        ),
        settings: parseAll(isRecord(input) ? input.settings : undefined, (entry) =>
            UserSettingSchema.parse(entry)
        ),
        defaultPages: parseDefaultPages(isRecord(input) ? input.defaultPages : undefined),
        quarantine,
    };
}

function parseDefaultPages(raw: unknown): Record<string, string> {
    if (!isRecord(raw)) return {};
    return Object.fromEntries(
        Object.entries(raw).filter(
            (entry): entry is [string, string] =>
                typeof entry[1] === 'string' && entry[1].length > 0
        )
    );
}

const stateCreator: StateCreator<DocumentTypeStoreState, [], []> = (set) => ({
    types: {},
    settings: {},
    defaultPages: {},
    quarantine: [],

    saveType: (type) => {
        const parsed = UserDocumentTypeSchema.parse(type);
        set(({ types }) => ({ types: { ...types, [parsed.id]: parsed } }));
    },

    removeType: (id) => {
        set(({ types }) => {
            const next = { ...types };
            delete next[id];
            return { types: next };
        });
    },

    saveSetting: (setting) => {
        const parsed = UserSettingSchema.parse(setting);
        set(({ settings }) => ({ settings: { ...settings, [parsed.id]: parsed } }));
    },

    removeSetting: (id) => {
        set(({ settings }) => {
            const next = { ...settings };
            delete next[id];
            return { settings: next };
        });
    },

    setDefaultPage: (key, pageId) => {
        set(({ defaultPages }) => {
            const next = { ...defaultPages };
            if (pageId) next[key] = pageId;
            else delete next[key];
            return { defaultPages: next };
        });
    },

    dropDefaultPagesFor: (pageId) => {
        set(({ defaultPages }) => {
            if (!Object.values(defaultPages).includes(pageId)) return {};
            return {
                defaultPages: Object.fromEntries(
                    Object.entries(defaultPages).filter(([, id]) => id !== pageId)
                ),
            };
        });
    },
});

const isBrowser = typeof window !== 'undefined';

export const useDocumentTypeStore = isBrowser
    ? create<DocumentTypeStoreState>()(
          persist(stateCreator, {
              name: 'universal-document-type-storage',
              version: STORE_VERSION,
              migrate: migrateDocumentTypeStoreState,
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
              partialize: ({ types, settings, defaultPages, quarantine }) => ({
                  types,
                  settings,
                  defaultPages,
                  quarantine,
              }),
          })
      )
    : create<DocumentTypeStoreState>()(stateCreator);

type PersistApi = {
    hasHydrated: () => boolean;
    onFinishHydration: (listener: () => void) => () => void;
};

function persistApi(): PersistApi | undefined {
    return (useDocumentTypeStore as unknown as { persist?: PersistApi }).persist;
}

/**
 * True once the persisted types are loaded. Until then a document of a user type is loading,
 * not orphaned: its type may simply not be read yet.
 */
export function useDocumentTypesHydrated(): boolean {
    return useSyncExternalStore(
        (listener) => persistApi()?.onFinishHydration(listener) ?? (() => undefined),
        () => persistApi()?.hasHydrated() ?? true,
        () => true
    );
}
