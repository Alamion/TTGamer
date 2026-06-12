import { describe, it, expect } from 'vitest';
import {
    MODULE_NAME,
    MAX_EXPLOSIONS,
    MAX_ROLL_SECONDS,
    VELOCITY_THRESHOLD,
    FRAME_RATE,
    DEFAULT_SETTINGS,
    SETTINGS_METADATA,
} from '@site/src/dice_roller/utils/constants';

describe('constants', () => {
    it('MODULE_NAME is 3DDiceRolls', () => {
        expect(MODULE_NAME).toBe('3DDiceRolls');
    });

    it('MAX_EXPLOSIONS is 1000', () => {
        expect(MAX_EXPLOSIONS).toBe(1000);
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
