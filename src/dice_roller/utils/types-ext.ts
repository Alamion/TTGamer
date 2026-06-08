import type { RollResult } from '../dice-logic';

export interface HistoryEntry {
    id: string;
    timestamp: number;
    result: RollResult;
}

export interface FavoriteNotation {
    id: string;
    notation: string;
    label: string;
    lastUsed: number;
}

export type HistoryTabType = 'chat' | 'favorites' | 'recent' | '';

export interface MixedRollConfig {
    diceColor: string;
    textColor: string;
    enable3dDice: boolean;
    enableSound: boolean;
    soundVolume: number;
    timeToReact: boolean;
    timeToReactSeconds: number;
}
