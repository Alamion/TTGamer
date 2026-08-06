import type { StateCreator } from 'zustand';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isPresetId } from '../data/presets';
import { deletePortrait } from '../persistence/portraitStorage';
import type { BaseCharacter } from '../types/character';
import { createDefaultCharacter } from '../types/character';

interface CharacterState {
    currentCharacter: BaseCharacter | null;
    characters: BaseCharacter[];
    setCurrentCharacter: (character: BaseCharacter) => void;
    updateCharacter: (id: string, updates: Partial<BaseCharacter>) => void;
    loadCharacter: (id: string) => void;
    createNewCharacter: () => void;
    deleteCharacter: (id: string) => void;
    importCharacter: (
        character: BaseCharacter,
        options?: { preserveReplacedPortrait?: boolean }
    ) => void;
}

const stateCreator: StateCreator<CharacterState, [], []> = (set, get) => ({
    currentCharacter: null,
    characters: [],

    setCurrentCharacter: (character) => {
        set({ currentCharacter: character });
    },

    updateCharacter: (id, updates) => {
        if (isPresetId(id)) return;
        const { characters, currentCharacter } = get();
        const updatedCharacters = characters.map((c) => (c.id === id ? { ...c, ...updates } : c));
        const updatedCurrent =
            currentCharacter?.id === id ? { ...currentCharacter, ...updates } : currentCharacter;
        set({ characters: updatedCharacters, currentCharacter: updatedCurrent });

        const previous = characters.find((character) => character.id === id);
        const nextPortraitId = updatedCharacters.find((character) => character.id === id)?.metadata
            .portraitId;
        if (previous?.metadata.portraitId && previous.metadata.portraitId !== nextPortraitId) {
            void deletePortrait(previous.metadata.portraitId);
        }
    },

    loadCharacter: (id) => {
        const { characters } = get();
        const character = characters.find((c) => c.id === id);
        if (character) {
            set({ currentCharacter: character });
        }
    },

    createNewCharacter: () => {
        const newCharacter = createDefaultCharacter();
        const { characters } = get();
        set({
            characters: [...characters, newCharacter],
            currentCharacter: newCharacter,
        });
    },

    deleteCharacter: (id) => {
        if (isPresetId(id)) return;
        const { characters, currentCharacter } = get();
        const filtered = characters.filter((c) => c.id !== id);
        const deletedPortraitId = characters.find((character) => character.id === id)?.metadata
            .portraitId;
        set({
            characters: filtered,
            currentCharacter: currentCharacter?.id === id ? null : currentCharacter,
        });
        void deletePortrait(deletedPortraitId);
    },

    importCharacter: (character, options) => {
        if (isPresetId(character.id)) return;
        const { characters } = get();
        const existing = characters.findIndex((c) => c.id === character.id);
        let updatedCharacters: BaseCharacter[];
        if (existing >= 0) {
            const previousPortraitId = characters[existing].metadata.portraitId;
            updatedCharacters = [...characters];
            updatedCharacters[existing] = character;
            if (
                !options?.preserveReplacedPortrait &&
                previousPortraitId &&
                previousPortraitId !== character.metadata.portraitId
            ) {
                void deletePortrait(previousPortraitId);
            }
        } else {
            updatedCharacters = [...characters, character];
        }
        set({ characters: updatedCharacters, currentCharacter: character });
    },
});

const isBrowser = typeof window !== 'undefined';

export const useCharacterStore = isBrowser
    ? create<CharacterState>()(
          persist(stateCreator, {
              name: 'universal-character-storage',
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
          })
      )
    : create<CharacterState>()(stateCreator);
