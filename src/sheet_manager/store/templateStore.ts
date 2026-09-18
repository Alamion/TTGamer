import type { StateCreator } from 'zustand';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { describeError, reportSheetIssue } from '../diagnostics';
import type { SystemId } from '../types/document';
import type { CustomTemplate } from '../types/template';
import { CustomTemplateSchema } from '../types/template';

/**
 * Store version 3 (feature 006): templates are recursive node trees (`children`, schema v3).
 * Pre-feature shapes (fixed `sections` hierarchy) fail the v3 parse and retire into the
 * bounded quarantine — no migration while there is no permanent user base (spec FR-4/A5);
 * documents pointing at retired ids fall back to the built-in page via `resolveCustomTemplate`.
 * Version 4: a re-parse that rewrites renamed system ids (`v5` → `wod-v5`).
 */
const STORE_VERSION = 4;
const MAX_QUARANTINE_ENTRIES = 100;

export interface TemplateStoreState {
    templates: CustomTemplate[];
    quarantine: unknown[];
    /** Saved user edits of default templates, keyed by the default template's identity (view id). */
    defaultOverrides: Record<string, CustomTemplate>;
    saveTemplate: (template: CustomTemplate) => void;
    duplicateTemplate: (id: string, newId: string) => CustomTemplate | undefined;
    removeTemplate: (id: string) => void;
    getTemplate: (id: string) => CustomTemplate | undefined;
    /** Explicit save of a default template edit (FR-9); marks the default as modified (FR-12). */
    setDefaultOverride: (viewId: string, template: CustomTemplate) => void;
    /** Reset (FR-10): deletes the override; the pristine original re-derives from the registry. */
    clearDefaultOverride: (viewId: string) => void;
}

interface PersistedTemplateState {
    templates: CustomTemplate[];
    quarantine: unknown[];
    defaultOverrides: Record<string, CustomTemplate>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Retires an unparseable template into the bounded quarantine and reports why. */
function quarantineEntry(quarantine: unknown[], entry: unknown, error: unknown) {
    const retained = quarantine.length < MAX_QUARANTINE_ENTRIES;
    if (retained) quarantine.push(entry);
    reportSheetIssue({
        code: 'template-quarantined',
        message: retained
            ? 'Persisted template failed to parse and moved to quarantine'
            : 'Persisted template failed to parse and was dropped (quarantine is full)',
        details: {
            templateId: isRecord(entry) ? entry.id : undefined,
            error: describeError(error),
        },
    });
}

export function migrateTemplateStoreState(input: unknown): PersistedTemplateState {
    if (!isRecord(input) || !Array.isArray(input.templates)) {
        return { templates: [], quarantine: [], defaultOverrides: {} };
    }

    const templates: CustomTemplate[] = [];
    const quarantine: unknown[] = Array.isArray(input.quarantine)
        ? input.quarantine.slice(0, MAX_QUARANTINE_ENTRIES)
        : [];

    for (const entry of input.templates) {
        try {
            templates.push(CustomTemplateSchema.parse(entry));
        } catch (error) {
            quarantineEntry(quarantine, entry, error);
        }
    }

    // v3: recursive node trees — pre-feature shapes fail the v3 parse and retire into the
    // bounded quarantine (FR-4); failed entries are retained, never silently dropped.
    const defaultOverrides: Record<string, CustomTemplate> = {};
    const rawOverrides = input.defaultOverrides;
    if (isRecord(rawOverrides)) {
        for (const [viewId, entry] of Object.entries(rawOverrides)) {
            try {
                defaultOverrides[viewId] = CustomTemplateSchema.parse(entry);
            } catch (error) {
                quarantineEntry(quarantine, entry, error);
            }
        }
    }

    return { templates, quarantine, defaultOverrides };
}

const stateCreator: StateCreator<TemplateStoreState, [], []> = (set, get) => ({
    templates: [],
    quarantine: [],
    defaultOverrides: {},

    saveTemplate: (template) => {
        const parsed = CustomTemplateSchema.parse(template);
        set(({ templates }) => ({
            templates: templates.some(({ id }) => id === parsed.id)
                ? templates.map((existing) => (existing.id === parsed.id ? parsed : existing))
                : [...templates, parsed],
        }));
    },

    duplicateTemplate: (id, newId) => {
        const source = get().templates.find((template) => template.id === id);
        const override = source ? undefined : get().defaultOverrides[id];
        if (!source && !override) return undefined;
        const copy = CustomTemplateSchema.parse({
            ...(source ?? override),
            id: newId,
        });
        set(({ templates }) => ({ templates: [...templates, copy] }));
        return copy;
    },

    removeTemplate: (id) => {
        set(({ templates }) => ({
            templates: templates.filter((template) => template.id !== id),
        }));
    },

    getTemplate: (id) => get().templates.find((template) => template.id === id),

    setDefaultOverride: (viewId, template) => {
        const parsed = CustomTemplateSchema.parse(template);
        set(({ defaultOverrides }) => ({
            defaultOverrides: { ...defaultOverrides, [viewId]: parsed },
        }));
    },

    clearDefaultOverride: (viewId) => {
        set(({ defaultOverrides }) => {
            const next = { ...defaultOverrides };
            delete next[viewId];
            return { defaultOverrides: next };
        });
    },
});

const isBrowser = typeof window !== 'undefined';

export const useTemplateStore = isBrowser
    ? create<TemplateStoreState>()(
          persist(stateCreator, {
              name: 'universal-template-storage',
              version: STORE_VERSION,
              migrate: migrateTemplateStoreState,
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
              partialize: ({ templates, quarantine, defaultOverrides }) => ({
                  templates,
                  quarantine,
                  defaultOverrides,
              }),
          })
      )
    : create<TemplateStoreState>()(stateCreator);

export type { SystemId };
