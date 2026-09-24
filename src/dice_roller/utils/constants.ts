import type { V5Line, WodMode } from './rollReader';

export const MODULE_NAME = '3DDiceRolls';

// Kept below MAX_NOTATION_LENGTH so this independent structural guard is reachable.
export const MAX_AST_NODES = 200;
export const MAX_CUSTOM_FACE_COUNT = 1_000;
export const MAX_DICE_COUNT = 200;
export const MAX_DICE_SIDES = 100_000;
export const MAX_EXPLOSIONS = 100;
export const MAX_NOTATION_LENGTH = 500;
export const MAX_NUMERIC_LITERAL = 1_000_000_000;
export const MAX_PHYSICAL_3D_DICE = 200;
// 3D timings are simulated seconds, so every refresh rate shows the same roll (F-005).
export const MAX_ROLL_SECONDS = 10;
/** Linear speed (scene units/s) and spin (rad/s) under which a die counts as still. */
export const VELOCITY_THRESHOLD = 5;
export const ANGULAR_VELOCITY_THRESHOLD = 1;
/** How long a die must stay still before its face is read. */
export const REST_SECONDS = 0.2;
export const SHOW_SECONDS = 1;
export const ACCEPTED_SHOW_SECONDS = 0.5;
export const FADE_SECONDS = 1;
export const FRAME_RATE = 1 / 60;
/** Pools up to this many physical dice keep full-size dice; larger pools shrink (dice #12). */
export const FULL_SIZE_DICE_POOL = 12;
export const MIN_DICE_SCALE = 0.2;

export const DEFAULT_SETTINGS = {
    enable3dDicePanel: true,
    primaryDiceColor: '#ff8040',
    secondaryDiceColor: '#ffffff',
    enableSound: true,
    soundVolume: 80,
    timeToReact: false,
    timeToReactSeconds: 5,
    diceLiveliness: 100,
    enableDiscordWebhook: true,
    includeCharacterName: true,
    includeCharacterStats: true,
    includeRollContext: true,
    specialDiceColor: '#8B0000',
    wodMode: 'classic' as WodMode,
    wodThreshold: 6 as number | null,
    wodSuccesses: null as number | null,
    v5Line: 'desperation' as V5Line,
    v5CriticalPairs: true,
    v5SpecialOutcomes: true,
    v5Difficulty: null as number | null,
};

export type SettingType = 'boolean' | 'string' | 'number' | 'color' | 'choice';

export interface RangeChildConfig {
    key: keyof typeof DEFAULT_SETTINGS;
    min: number;
    max: number;
    step: number;
    label: string;
}

export interface SettingMetadata {
    type: SettingType;
    name: string;
    rangeChild?: RangeChildConfig;
}

export const SETTINGS_METADATA: Record<keyof typeof DEFAULT_SETTINGS, SettingMetadata> = {
    enable3dDicePanel: { type: 'boolean', name: 'Enable 3D Dice Rolls in Panel' },
    primaryDiceColor: { type: 'color', name: 'Primary dice color (faces)' },
    secondaryDiceColor: { type: 'color', name: 'Secondary dice color (text)' },
    enableSound: {
        type: 'boolean',
        name: 'Roll sound effects',
        rangeChild: {
            key: 'soundVolume',
            min: 0,
            max: 100,
            step: 1,
            label: 'Volume',
        },
    },
    soundVolume: { type: 'number', name: 'Sound volume' },
    timeToReact: {
        type: 'boolean',
        name: 'Time to react',
        rangeChild: {
            key: 'timeToReactSeconds',
            min: 1,
            max: 60,
            step: 1,
            label: 'React window (seconds)',
        },
    },
    timeToReactSeconds: { type: 'number', name: 'Time to react seconds' },
    diceLiveliness: { type: 'number', name: 'Dice feel (0 heavy to 100 lively)' },
    enableDiscordWebhook: { type: 'boolean', name: 'Enable Discord webhook' },
    includeCharacterName: { type: 'boolean', name: 'Include character name' },
    includeCharacterStats: { type: 'boolean', name: 'Include character stats' },
    includeRollContext: { type: 'boolean', name: 'Include roll context' },
    specialDiceColor: { type: 'color', name: 'Special dice color (faces)' },
    wodMode: { type: 'choice', name: 'WoD tab mode' },
    wodThreshold: { type: 'number', name: 'Classic WoD Difficulty (success threshold)' },
    wodSuccesses: { type: 'number', name: 'Classic WoD successes needed' },
    v5Line: { type: 'choice', name: 'V5 special dice line' },
    v5CriticalPairs: { type: 'boolean', name: 'Count V5 critical pairs' },
    v5SpecialOutcomes: { type: 'boolean', name: 'Report V5 special dice outcomes' },
    v5Difficulty: { type: 'number', name: 'V5 Difficulty (successes needed)' },
};
