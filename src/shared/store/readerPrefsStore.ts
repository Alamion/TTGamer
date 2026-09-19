import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/**
 * How game-term labels read in a non-English locale: localized with an English-name hint
 * (`ru`), the English book names with the localized name in the hint (`en`), or localized
 * without hints (`ru-plain`).
 */
export type GameTermsMode = 'ru' | 'en' | 'ru-plain';

export interface ReaderPrefsState {
    gameTerms: GameTermsMode;
    termHintNoticeDismissed: boolean;
    setGameTerms: (mode: GameTermsMode) => void;
    setTermHintNoticeDismissed: (dismissed: boolean) => void;
}

export const READER_PREFS_KEY = 'ttgamer-reader-prefs';

const MODES: readonly GameTermsMode[] = ['ru', 'en', 'ru-plain'];

/** localStorage that never throws (private mode, blocked storage, SSR). */
const safeStorage: StateStorage = {
    getItem: (name) => {
        try {
            return globalThis.localStorage?.getItem(name) ?? null;
        } catch {
            return null;
        }
    },
    setItem: (name, value) => {
        try {
            globalThis.localStorage?.setItem(name, value);
        } catch {
            // Preferences are a convenience; losing them is acceptable.
        }
    },
    removeItem: (name) => {
        try {
            globalThis.localStorage?.removeItem(name);
        } catch {
            // See setItem.
        }
    },
};

/**
 * Reader preferences (spec 009). Kept in localStorage rather than IndexedDB because the labels
 * must render in the chosen mode on the first paint.
 */
export const useReaderPrefsStore = create<ReaderPrefsState>()(
    persist(
        (set) => ({
            gameTerms: 'ru',
            termHintNoticeDismissed: false,
            setGameTerms: (gameTerms) => set({ gameTerms }),
            setTermHintNoticeDismissed: (termHintNoticeDismissed) =>
                set({ termHintNoticeDismissed }),
        }),
        {
            name: READER_PREFS_KEY,
            version: 1,
            storage: createJSONStorage(() => safeStorage),
            partialize: ({ gameTerms, termHintNoticeDismissed }) => ({
                gameTerms,
                termHintNoticeDismissed,
            }),
            // Corrupt or foreign values fall back to the defaults.
            merge: (persisted, current) => {
                const stored = (persisted ?? {}) as Partial<ReaderPrefsState>;
                return {
                    ...current,
                    gameTerms: MODES.includes(stored.gameTerms as GameTermsMode)
                        ? (stored.gameTerms as GameTermsMode)
                        : current.gameTerms,
                    termHintNoticeDismissed: stored.termHintNoticeDismissed === true,
                };
            },
        }
    )
);

export const useGameTerms = () => useReaderPrefsStore((state) => state.gameTerms);
