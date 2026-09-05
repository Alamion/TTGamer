import type { StateCreator } from 'zustand';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CustomTemplate } from '../types/template';
import { CustomTemplateSchema } from '../types/template';

const STORE_VERSION = 1;
const MAX_QUARANTINE_ENTRIES = 100;

export interface TemplateStoreState {
    templates: CustomTemplate[];
    quarantine: unknown[];
    saveTemplate: (template: CustomTemplate) => void;
    duplicateTemplate: (id: string, newId: string) => CustomTemplate | undefined;
    removeTemplate: (id: string) => void;
    getTemplate: (id: string) => CustomTemplate | undefined;
}

interface PersistedTemplateState {
    templates: CustomTemplate[];
    quarantine: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function migrateTemplateStoreState(input: unknown): PersistedTemplateState {
    if (!isRecord(input) || !Array.isArray(input.templates)) {
        return { templates: [], quarantine: [] };
    }

    const templates: CustomTemplate[] = [];
    const quarantine: unknown[] = Array.isArray(input.quarantine)
        ? input.quarantine.slice(0, MAX_QUARANTINE_ENTRIES)
        : [];

    for (const entry of input.templates) {
        try {
            templates.push(CustomTemplateSchema.parse(entry));
        } catch {
            if (quarantine.length < MAX_QUARANTINE_ENTRIES) quarantine.push(entry);
        }
    }

    return { templates, quarantine };
}

const stateCreator: StateCreator<TemplateStoreState, [], []> = (set, get) => ({
    templates: [],
    quarantine: [],

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
        if (!source) return undefined;
        const copy = CustomTemplateSchema.parse({ ...source, id: newId });
        set(({ templates }) => ({ templates: [...templates, copy] }));
        return copy;
    },

    removeTemplate: (id) => {
        set(({ templates }) => ({
            templates: templates.filter((template) => template.id !== id),
        }));
    },

    getTemplate: (id) => get().templates.find((template) => template.id === id),
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
              partialize: ({ templates, quarantine }) => ({ templates, quarantine }),
          })
      )
    : create<TemplateStoreState>()(stateCreator);
