export const MODULE_NAME = '3DDiceRolls';

// Kept below MAX_NOTATION_LENGTH so this independent structural guard is reachable.
export const MAX_AST_NODES = 200;
export const MAX_CUSTOM_FACE_COUNT = 1_000;
export const MAX_DICE_COUNT = 200;
export const MAX_DICE_SIDES = 100_000;
export const MAX_EXPLOSIONS = 100;
export const MAX_NOTATION_LENGTH = 500;
export const MAX_NUMERIC_LITERAL = 1_000_000_000;
export const MAX_PHYSICAL_3D_DICE = 100;
export const MAX_ROLL_SECONDS = 10;
export const VELOCITY_THRESHOLD = 5;
export const FRAME_RATE = 1 / 60;

export const DEFAULT_SETTINGS = {
    enable3dDicePanel: true,
    primaryDiceColor: '#ff8040',
    secondaryDiceColor: '#ffffff',
    enableSound: true,
    soundVolume: 80,
    timeToReact: false,
    timeToReactSeconds: 5,
    enableDiscordWebhook: true,
    includeCharacterName: true,
    includeCharacterStats: true,
    includeRollContext: true,
};

export type SettingType = 'boolean' | 'string' | 'number' | 'color';

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
    enableDiscordWebhook: { type: 'boolean', name: 'Enable Discord webhook' },
    includeCharacterName: { type: 'boolean', name: 'Include character name' },
    includeCharacterStats: { type: 'boolean', name: 'Include character stats' },
    includeRollContext: { type: 'boolean', name: 'Include roll context' },
};
