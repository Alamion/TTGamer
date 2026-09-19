import type { GameTermsMode } from '@site/src/shared/store/readerPrefsStore';
import { createContext, useContext } from 'react';

export interface TermHintSettings {
    locale: string;
    mode: GameTermsMode;
}

/** Provided by TermHintProvider; `null` outside a sheet (labels then render as plain text). */
export const TermHintContext = createContext<TermHintSettings | null>(null);

export const useTermHintSettings = () => useContext(TermHintContext);
