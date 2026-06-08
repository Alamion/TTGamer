import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { handleRollEvent } from '../utils/events';
import { DEFAULT_SETTINGS } from '../utils/constants';
import type { HistoryEntry, FavoriteNotation, MixedRollConfig } from '../utils/types-ext';
import type { StateCreator } from 'zustand';
import { onRollResult } from '../dice-logic';

function newId(): string {
    try {
        return crypto.randomUUID();
    } catch {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
}

const MAX_HISTORY = 50;
const MAX_RECENT_NOTATIONS = 10;

export interface DiceRollerSettings {
    enable3dDice: boolean;
    primaryDiceColor: string;
    secondaryDiceColor: string;
    enableSound: boolean;
    soundVolume: number;
    timeToReact: boolean;
    timeToReactSeconds: number;
}

interface DiceRollerState {
    settings: DiceRollerSettings;
    history: HistoryEntry[];
    favorites: FavoriteNotation[];
    recentNotations: string[];
    panelOpen: boolean;
    notationInput: string;

    roll: (notation: string) => Promise<void>;
    clearHistory: () => void;
    clearFavorites: () => void;
    clearRecentNotations: () => void;
    toggleFavorite: (notation: string) => void;
    togglePanel: () => void;
    updateSettings: (partial: Partial<DiceRollerSettings>) => void;
    setNotationInput: (val: string) => void;
}

const stateCreator: StateCreator<DiceRollerState, [], []> = (set, get) => {
    onRollResult((result) => {
        const { history, recentNotations } = get();
        const entry: HistoryEntry = {
            id: newId(),
            timestamp: Date.now(),
            result,
        };
        set({
            history: [entry, ...history].slice(0, MAX_HISTORY),
            recentNotations: [
                result.notation,
                ...recentNotations.filter((n) => n !== result.notation),
            ].slice(0, MAX_RECENT_NOTATIONS),
        });
    });

    return {
        settings: { ...DEFAULT_SETTINGS },
        history: [],
        favorites: [],
        recentNotations: [],
        panelOpen: false,
        notationInput: '',

        roll: async (notation: string) => {
            if (!notation.trim()) return;
            const s = get().settings;
            const config: MixedRollConfig = {
                diceColor: s.primaryDiceColor,
                textColor: s.secondaryDiceColor,
                enable3dDice: s.enable3dDice,
                enableSound: s.enableSound,
                soundVolume: s.soundVolume,
                timeToReact: s.timeToReact,
                timeToReactSeconds: s.timeToReactSeconds,
            };
            await handleRollEvent(notation, config);
        },

        clearHistory: () => {
            set({ history: [] });
        },

        clearFavorites: () => {
            set({ favorites: [] });
        },

        clearRecentNotations: () => {
            set({ recentNotations: [] });
        },

        toggleFavorite: (notation: string) => {
            const { favorites } = get();
            const existing = favorites.find((f) => f.notation === notation);
            if (existing) {
                set({ favorites: favorites.filter((f) => f.id !== existing.id) });
            } else {
                set({
                    favorites: [
                        {
                            id: newId(),
                            notation,
                            label: notation,
                            lastUsed: Date.now(),
                        },
                        ...favorites,
                    ],
                });
            }
        },

        togglePanel: () => {
            set((state) => ({ panelOpen: !state.panelOpen }));
        },

        updateSettings: (partial: Partial<DiceRollerSettings>) => {
            set((state) => ({ settings: { ...state.settings, ...partial } }));
        },

        setNotationInput: (val: string) => {
            set({ notationInput: val });
        },
    };
};

const isBrowser = typeof window !== 'undefined';

export const useDiceRollerStore = isBrowser
    ? create<DiceRollerState>()(
          persist(stateCreator, {
              name: 'dice-roller-storage',
              storage: createJSONStorage(() => localStorage),
              partialize: (state) => ({
                  settings: state.settings,
                  history: state.history,
                  favorites: state.favorites,
                  recentNotations: state.recentNotations,
              }),
          })
      )
    : create<DiceRollerState>()(stateCreator);
