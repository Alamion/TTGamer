import {
    DEFAULT_SETTINGS,
    FRAME_RATE,
    MAX_EXPLOSIONS,
    MAX_NUMERIC_LITERAL,
    MAX_ROLL_SECONDS,
    MODULE_NAME,
    SETTINGS_METADATA,
    VELOCITY_THRESHOLD,
} from '@site/src/dice_roller/utils/constants';
import { describe, expect, it } from 'vitest';

describe('constants', () => {
    it('MODULE_NAME is 3DDiceRolls', () => {
        expect(MODULE_NAME).toBe('3DDiceRolls');
    });

    it('caps recursive modifier work', () => {
        expect(MAX_EXPLOSIONS).toBe(100);
    });

    it('caps numeric literal magnitude', () => {
        expect(MAX_NUMERIC_LITERAL).toBe(1_000_000_000);
    });

    it('MAX_ROLL_SECONDS is 10', () => {
        expect(MAX_ROLL_SECONDS).toBe(10);
    });

    it('VELOCITY_THRESHOLD is 5', () => {
        expect(VELOCITY_THRESHOLD).toBe(5);
    });

    it('FRAME_RATE is 1/60', () => {
        expect(FRAME_RATE).toBe(1 / 60);
    });
});

describe('DEFAULT_SETTINGS', () => {
    it('has all required keys', () => {
        const keys = Object.keys(DEFAULT_SETTINGS);
        expect(keys).toEqual([
            'enable3dDicePanel',
            'primaryDiceColor',
            'secondaryDiceColor',
            'enableSound',
            'soundVolume',
            'timeToReact',
            'timeToReactSeconds',
            'enableDiscordWebhook',
            'includeCharacterName',
            'includeCharacterStats',
            'includeRollContext',
            'specialDiceColor',
            'wodMode',
            'wodThreshold',
            'wodSuccesses',
            'v5Line',
            'v5CriticalPairs',
            'v5SpecialOutcomes',
            'v5Difficulty',
        ]);
    });

    it('enable3dDicePanel is true', () => {
        expect(DEFAULT_SETTINGS.enable3dDicePanel).toBe(true);
    });

    it('primaryDiceColor is #ff8040', () => {
        expect(DEFAULT_SETTINGS.primaryDiceColor).toBe('#ff8040');
    });

    it('secondaryDiceColor is #ffffff', () => {
        expect(DEFAULT_SETTINGS.secondaryDiceColor).toBe('#ffffff');
    });

    it('enableSound is true', () => {
        expect(DEFAULT_SETTINGS.enableSound).toBe(true);
    });

    it('soundVolume is 80', () => {
        expect(DEFAULT_SETTINGS.soundVolume).toBe(80);
    });

    it('timeToReact is false', () => {
        expect(DEFAULT_SETTINGS.timeToReact).toBe(false);
    });

    it('timeToReactSeconds is 5', () => {
        expect(DEFAULT_SETTINGS.timeToReactSeconds).toBe(5);
    });

    it('enableDiscordWebhook is true', () => {
        expect(DEFAULT_SETTINGS.enableDiscordWebhook).toBe(true);
    });

    it('includeCharacterName is true', () => {
        expect(DEFAULT_SETTINGS.includeCharacterName).toBe(true);
    });

    it('includeCharacterStats is true', () => {
        expect(DEFAULT_SETTINGS.includeCharacterStats).toBe(true);
    });

    it('includeRollContext is true', () => {
        expect(DEFAULT_SETTINGS.includeRollContext).toBe(true);
    });
});

describe('SETTINGS_METADATA', () => {
    it('has metadata for every default setting key', () => {
        const settingKeys = Object.keys(DEFAULT_SETTINGS);
        const metaKeys = Object.keys(SETTINGS_METADATA);
        expect(metaKeys).toEqual(settingKeys);
    });

    it('each entry has type and name', () => {
        for (const meta of Object.values(SETTINGS_METADATA)) {
            expect(meta).toHaveProperty('type');
            expect(meta).toHaveProperty('name');
            expect(typeof meta.type).toBe('string');
            expect(typeof meta.name).toBe('string');
        }
    });

    it('enable3dDicePanel is boolean type', () => {
        expect(SETTINGS_METADATA.enable3dDicePanel.type).toBe('boolean');
    });

    it('primaryDiceColor is color type', () => {
        expect(SETTINGS_METADATA.primaryDiceColor.type).toBe('color');
    });

    it('secondaryDiceColor is color type', () => {
        expect(SETTINGS_METADATA.secondaryDiceColor.type).toBe('color');
    });

    it('enableSound has rangeChild pointing to soundVolume', () => {
        expect(SETTINGS_METADATA.enableSound.rangeChild).toBeDefined();
        expect(SETTINGS_METADATA.enableSound.rangeChild!.key).toBe('soundVolume');
        expect(SETTINGS_METADATA.enableSound.rangeChild!.min).toBe(0);
        expect(SETTINGS_METADATA.enableSound.rangeChild!.max).toBe(100);
        expect(SETTINGS_METADATA.enableSound.rangeChild!.step).toBe(1);
    });

    it('timeToReact has rangeChild pointing to timeToReactSeconds', () => {
        expect(SETTINGS_METADATA.timeToReact.rangeChild).toBeDefined();
        expect(SETTINGS_METADATA.timeToReact.rangeChild!.key).toBe('timeToReactSeconds');
        expect(SETTINGS_METADATA.timeToReact.rangeChild!.min).toBe(1);
        expect(SETTINGS_METADATA.timeToReact.rangeChild!.max).toBe(60);
        expect(SETTINGS_METADATA.timeToReact.rangeChild!.step).toBe(1);
    });

    it('soundVolume and timeToReactSeconds do not have rangeChild', () => {
        expect(SETTINGS_METADATA.soundVolume.rangeChild).toBeUndefined();
        expect(SETTINGS_METADATA.timeToReactSeconds.rangeChild).toBeUndefined();
    });
});

describe('feature 011 settings', () => {
    it('defaults keep classic users unchanged and V5 reading on', () => {
        expect(DEFAULT_SETTINGS.wodMode).toBe('classic');
        expect(DEFAULT_SETTINGS.v5Line).toBe('desperation');
        expect(DEFAULT_SETTINGS.v5CriticalPairs).toBe(true);
        expect(DEFAULT_SETTINGS.v5SpecialOutcomes).toBe(true);
        expect(DEFAULT_SETTINGS.v5Difficulty).toBeNull();
        expect(DEFAULT_SETTINGS.wodThreshold).toBe(6);
        expect(DEFAULT_SETTINGS.wodSuccesses).toBeNull();
    });

    it('declares metadata types for the new keys', () => {
        expect(SETTINGS_METADATA.specialDiceColor.type).toBe('color');
        expect(SETTINGS_METADATA.wodMode.type).toBe('choice');
        expect(SETTINGS_METADATA.v5Line.type).toBe('choice');
        expect(SETTINGS_METADATA.v5CriticalPairs.type).toBe('boolean');
        expect(SETTINGS_METADATA.v5SpecialOutcomes.type).toBe('boolean');
        expect(SETTINGS_METADATA.v5Difficulty.type).toBe('number');
        expect(SETTINGS_METADATA.wodThreshold.type).toBe('number');
        expect(SETTINGS_METADATA.wodSuccesses.type).toBe('number');
    });
});

describe('special dice colour contrast (FR-006)', () => {
    const luminance = (hex: string) => {
        const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
        const [r, g, b] = channels.map((v) =>
            v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
        );
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: string, b: string) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
    };

    it('keeps face numbers readable and stands apart from the primary colour', () => {
        const special = DEFAULT_SETTINGS.specialDiceColor;
        expect(contrast(special, DEFAULT_SETTINGS.secondaryDiceColor)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(special, DEFAULT_SETTINGS.primaryDiceColor)).toBeGreaterThanOrEqual(3);
    });
});
