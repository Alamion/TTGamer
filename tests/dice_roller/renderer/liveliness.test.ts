import {
    MAX_LIVELINESS,
    MIN_LIVELINESS,
    physicsProfile,
} from '@site/src/dice_roller/dice-logic/renderer/liveliness';
import { describe, expect, it } from 'vitest';

describe('dice feel profile (dice #13)', () => {
    it('keeps the original physics at the lively end', () => {
        expect(physicsProfile(MAX_LIVELINESS)).toEqual({
            gravity: 1_000,
            desk: { friction: 0.01, restitution: 0.2 },
            barrier: { friction: 0.01, restitution: 0.6 },
            dice: { friction: 0.1, restitution: 0.5 },
            linearDamping: 0.1,
            angularDamping: 0.1,
            launch: 1,
            sleepSpeed: 0.1,
            sleepTime: 1,
        });
    });

    it('grips, damps, and throws more gently toward the heavy end', () => {
        const heavy = physicsProfile(MIN_LIVELINESS);
        const middle = physicsProfile(50);
        const lively = physicsProfile(MAX_LIVELINESS);
        expect(heavy.desk.friction).toBeGreaterThan(middle.desk.friction);
        expect(middle.desk.friction).toBeGreaterThan(lively.desk.friction);
        expect(heavy.desk.restitution).toBeLessThan(lively.desk.restitution);
        expect(heavy.launch).toBeLessThan(middle.launch);
        expect(middle.launch).toBeLessThan(lively.launch);
    });

    it('clamps stale or invalid stored values', () => {
        expect(physicsProfile(-20)).toEqual(physicsProfile(MIN_LIVELINESS));
        expect(physicsProfile(250)).toEqual(physicsProfile(MAX_LIVELINESS));
        expect(physicsProfile(Number.NaN)).toEqual(physicsProfile(MAX_LIVELINESS));
    });
});
