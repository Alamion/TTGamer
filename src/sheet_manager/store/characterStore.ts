import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BaseCharacter } from '../types/character.ts';
import { createDefaultCharacter } from '../types/character.ts';
import type { StateCreator } from 'zustand';

interface CharacterState {
    currentCharacter: BaseCharacter | null;
    characters: BaseCharacter[];
    setCurrentCharacter: (character: BaseCharacter) => void;
    updateCharacter: (id: string, updates: Partial<BaseCharacter>) => void;
    loadCharacter: (id: string) => void;
    createNewCharacter: () => void;
    deleteCharacter: (id: string) => void;
    importCharacter: (character: BaseCharacter) => void;
}

const stateCreator: StateCreator<CharacterState, [], []> = (set, get) => ({
    currentCharacter: null,
    characters: [],

    setCurrentCharacter: (character) => {
        set({ currentCharacter: character });
    },

    updateCharacter: (id, updates) => {
        const { characters, currentCharacter } = get();
        const updatedCharacters = characters.map((c) => (c.id === id ? { ...c, ...updates } : c));
        const updatedCurrent =
            currentCharacter?.id === id ? { ...currentCharacter, ...updates } : currentCharacter;
        set({ characters: updatedCharacters, currentCharacter: updatedCurrent });
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
        const { characters, currentCharacter } = get();
        const filtered = characters.filter((c) => c.id !== id);
        set({
            characters: filtered,
            currentCharacter: currentCharacter?.id === id ? null : currentCharacter,
        });
    },

    importCharacter: (character) => {
        const { characters } = get();
        const existing = characters.findIndex((c) => c.id === character.id);
        let updatedCharacters: BaseCharacter[];
        if (existing >= 0) {
            updatedCharacters = [...characters];
            updatedCharacters[existing] = character;
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
