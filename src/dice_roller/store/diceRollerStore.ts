import { warn } from '@site/src/shared/utils/logging';
import type { StateCreator } from 'zustand';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { onRollResult } from '../dice-logic/dice-roller';
import { DEFAULT_SETTINGS } from '../utils/constants';
import type { RollOptions } from '../utils/events';
import { handleRollEvent } from '../utils/events';
import type {
    DicePanelTab,
    PanelRollControl,
    PreparedRoll,
    RollOrigin,
    V5Line,
    WodMode,
} from '../utils/rollReader';
import { buildPanelOrigin, getRollReader, rollVerdict } from '../utils/rollReader';
import {
    clearRollSource,
    clearStatLabels,
    getCharacterName,
    getRollSource,
    takeStatLabels,
} from '../utils/sessionStorage';
import type { FavoriteNotation, HistoryEntry, MixedRollConfig } from '../utils/types-ext';

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
    enable3dDicePanel: boolean;
    primaryDiceColor: string;
    secondaryDiceColor: string;
    enableSound: boolean;
    soundVolume: number;
    timeToReact: boolean;
    timeToReactSeconds: number;
    enableDiscordWebhook: boolean;
    includeCharacterName: boolean;
    includeCharacterStats: boolean;
    includeRollContext: boolean;
    specialDiceColor: string;
    wodMode: WodMode;
    wodThreshold: number | null;
    wodSuccesses: number | null;
    v5Line: V5Line;
    v5CriticalPairs: boolean;
    v5SpecialOutcomes: boolean;
    v5Difficulty: number | null;
}

interface DiceRollerState {
    settings: DiceRollerSettings;
    history: HistoryEntry[];
    favorites: FavoriteNotation[];
    recentNotations: string[];
    panelOpen: boolean;
    notationInput: string;
    /** Selected dice-panel tab; `''` means none. Persisted, read even while the panel is closed. */
    panelTab: DicePanelTab;

    roll: (notation: string, rollOptions?: RollOptions) => Promise<void>;
    clearHistory: () => void;
    clearFavorites: () => void;
    clearRecentNotations: () => void;
    toggleFavorite: (notation: string) => void;
    togglePanel: () => void;
    updateSettings: (partial: Partial<DiceRollerSettings>) => void;
    setNotationInput: (val: string) => void;
    setPanelTab: (tab: DicePanelTab) => void;
}

type PersistedDiceRollerState = Pick<
    DiceRollerState,
    'settings' | 'history' | 'favorites' | 'recentNotations' | 'panelTab'
>;

/** Stored settings over current defaults: new keys get defaults, unknown keys are dropped. */
export function mergeStoredSettings(stored: unknown): DiceRollerSettings {
    const merged: DiceRollerSettings = { ...DEFAULT_SETTINGS };
    if (!stored || typeof stored !== 'object') return merged;
    const source = stored as Record<string, unknown>;
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof DiceRollerSettings)[]) {
        if (key in source && source[key] !== undefined) {
            (merged as unknown as Record<string, unknown>)[key] = source[key];
        }
    }
    return merged;
}

const PANEL_TABS: readonly DicePanelTab[] = ['standard', 'dnd', 'wod', ''];

const stateCreator: StateCreator<DiceRollerState, [], []> = (set, get) => {
    onRollResult((result) => {
        const { settings, history, recentNotations } = get();

        if (settings.includeCharacterName) {
            const name = getCharacterName();
            if (name && !result.characterName) {
                result.characterName = name;
            }
        }

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
        panelTab: '',

        roll: async (notation: string, rollOptions?: RollOptions) => {
            if (!notation.trim()) return;
            const s = get().settings;

            let origin = rollOptions?.origin;
            if (origin?.kind === 'panel' && !origin.source) {
                const source = getRollSource();
                if (source) origin = { ...origin, source };
            }

            const reader = origin ? getRollReader() : null;
            let prepared: PreparedRoll | null = null;
            if (reader && origin) {
                try {
                    prepared = reader.prepare(notation, origin, s);
                } catch (err) {
                    warn('Roll reader failed to prepare; rolling unread', 'Dice Roller', [err]);
                }
            }

            let statLabels = rollOptions?.statLabels;
            if (statLabels !== undefined) {
                clearStatLabels();
            } else if (s.includeCharacterStats) {
                statLabels = takeStatLabels();
            }

            let characterName = rollOptions?.characterName;
            if (!characterName && s.includeCharacterName) {
                characterName = getCharacterName();
            }

            const config: MixedRollConfig = {
                diceColor: s.primaryDiceColor,
                textColor: s.secondaryDiceColor,
                enable3dDice: s.enable3dDicePanel,
                enableSound: s.enableSound,
                soundVolume: s.soundVolume,
                timeToReact: s.timeToReact,
                timeToReactSeconds: s.timeToReactSeconds,
                specialDiceColor: s.specialDiceColor,
            };
            const rolledNotation = prepared?.notation ?? notation;
            await handleRollEvent(
                rolledNotation,
                config,
                statLabels || characterName || origin
                    ? { statLabels, characterName, origin }
                    : undefined,
                (result) => {
                    const verdict = rollVerdict(origin, rolledNotation, result.total);
                    if (verdict) result.verdict = verdict;
                    if (!reader || !prepared) return;
                    try {
                        const reading = reader.interpret(result, prepared.context);
                        if (reading) result.reading = reading;
                    } catch (err) {
                        warn('Roll reader failed to interpret; roll kept unread', 'Dice Roller', [
                            err,
                        ]);
                    }
                }
            );
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
            // An emptied input drops the queued sheet source, however it was emptied.
            if (!val.trim()) clearRollSource();
            set({ notationInput: val });
        },

        setPanelTab: (tab: DicePanelTab) => {
            set({ panelTab: tab });
        },
    };
};

const isBrowser = typeof window !== 'undefined';

export const useDiceRollerStore = isBrowser
    ? create<DiceRollerState>()(
          persist(stateCreator, {
              name: 'dice-roller-storage',
              version: 1,
              storage: createJSONStorage(() => localStorage),
              // v0 → v1 only adds keys; `merge` fills them from the defaults.
              migrate: (persisted) => persisted as PersistedDiceRollerState,
              merge: (persisted, current) => {
                  const stored = (persisted ?? {}) as Partial<PersistedDiceRollerState>;
                  return {
                      ...current,
                      ...stored,
                      settings: mergeStoredSettings(stored.settings),
                      panelTab: PANEL_TABS.includes(stored.panelTab as DicePanelTab)
                          ? (stored.panelTab as DicePanelTab)
                          : current.panelTab,
                  };
              },
              partialize: (state): PersistedDiceRollerState => ({
                  settings: state.settings,
                  history: state.history,
                  favorites: state.favorites,
                  recentNotations: state.recentNotations,
                  panelTab: state.panelTab,
              }),
          })
      )
    : create<DiceRollerState>()(stateCreator);

/** The origin of a roll made now through the panel's controls or the header button. */
export function currentPanelOrigin(control: PanelRollControl): RollOrigin {
    const { panelTab, settings } = useDiceRollerStore.getState();
    return buildPanelOrigin(control, panelTab, settings);
}
