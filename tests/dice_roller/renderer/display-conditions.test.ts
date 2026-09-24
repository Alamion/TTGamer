// @vitest-environment jsdom

import {
    ANGULAR_VELOCITY_THRESHOLD,
    FADE_SECONDS,
    SHOW_SECONDS,
    VELOCITY_THRESHOLD,
} from '@site/src/dice_roller/utils/constants';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    backgroundPause,
    type FrameTiming,
    installDisplay,
    steadyRate,
    stutter,
    traceRoll,
} from './harness';

vi.mock('three', async (importOriginal) => ({
    ...(await importOriginal<typeof import('three')>()),
    WebGLRenderer: class {
        domElement = document.createElement('canvas');
        shadowMap = {};
        setSize() {}
        render() {}
        dispose() {}
    },
}));

vi.mock('@site/src/dice_roller/dice-logic/renderer/sound-manager', () => ({
    SoundManager: class {
        init = async () => {};
        onCollide() {}
        dispose() {}
        setEnabled() {}
        setVolume() {}
    },
}));

const RATES = [30, 60, 144, 165, 240];

const DISPLAYS: [string, FrameTiming][] = [
    ...RATES.map((hz): [string, FrameTiming] => [`${hz} Hz`, steadyRate(hz)]),
    ['60 Hz with a 120 ms frame every 7 frames', stutter(7, 120)],
    ['a tab hidden for 3 s mid-roll', backgroundPause(30, 3_000)],
    ['a tab hidden for 12 s right after the throw', backgroundPause(5, 12_000)],
];

/** Two-d10 throws the pre-T-066 renderer read while a die was still sliding. */
const RESTLESS_SEEDS = [7, 39];

/** Throws where the pre-T-066 renderer spawned dice inside each other and they flew apart. */
const FLUNG: [dice: number, seed: number][] = [
    [2, 6],
    [2, 27],
    [6, 20],
    [6, 31],
];

// Each case simulates whole rolls in real cannon-es; under a loaded parallel run a case can
// take several seconds.
describe('3D dice under display conditions (T-066)', { timeout: 60_000 }, () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    describe('spawn (F-004)', () => {
        it.each([2, 6, 12, 20])('throws %i dice with no two of them overlapping', async (n) => {
            for (let seed = 1; seed <= 6; seed++) {
                installDisplay(seed);
                const trace = await traceRoll(Array(n).fill(10), steadyRate(60));
                expect(trace.spawnOverlaps, `seed ${seed}`).toBe(0);
            }
        });

        it('never lets the solver add energy by pushing dice apart', async () => {
            for (const [n, seed] of FLUNG) {
                installDisplay(seed);
                const trace = await traceRoll(Array(n).fill(10), steadyRate(60));
                expect(trace.energyGain, `${n} dice, seed ${seed}`).toBeLessThan(1.15);
            }
        });
    });

    describe('settle (F-005)', () => {
        it.each(DISPLAYS)('reads the dice only once they are at rest at %s', async (_, timing) => {
            for (const seed of RESTLESS_SEEDS) {
                installDisplay(seed);
                const trace = await traceRoll([10, 10], timing);
                expect(trace.settledAt, `seed ${seed}`).not.toBeNull();
                expect(trace.speedAtSettle!.linear, `seed ${seed}`).toBeLessThan(
                    VELOCITY_THRESHOLD
                );
                expect(trace.speedAtSettle!.angular, `seed ${seed}`).toBeLessThan(
                    ANGULAR_VELOCITY_THRESHOLD
                );
            }
        });
    });

    describe('show and fade (F-005)', () => {
        it.each(RATES)('keeps the result on screen for the same time at %i Hz', async (hz) => {
            installDisplay(1);
            const trace = await traceRoll([6, 10], steadyRate(hz));
            const expected = (SHOW_SECONDS + FADE_SECONDS) * 1000;
            // One physics step (1/60 s) plus one frame of slack either way.
            expect(Math.abs(trace.showAndFadeMs! - expected)).toBeLessThanOrEqual(
                1000 / 60 + 1000 / hz
            );
        });
    });

    describe('dice feel (dice #13)', () => {
        const median = (values: number[]) =>
            [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

        it('lets heavy dice settle sooner than lively ones', async () => {
            const settle = async (liveliness: number) => {
                const times: number[] = [];
                for (let seed = 1; seed <= 12; seed++) {
                    installDisplay(seed);
                    const trace = await traceRoll(Array(6).fill(6), steadyRate(60), {
                        liveliness,
                    });
                    times.push(trace.settledAt!);
                }
                return times;
            };
            const heavy = await settle(0);
            const lively = await settle(100);
            expect(median(heavy)).toBeLessThan(median(lively) * 0.8);
            // Sleeping dice end pile-ups instead of letting them creep to the time limit.
            expect(Math.max(...heavy)).toBeLessThan(5_000);
        });

        it.each([0, 50])('reads fair d6 faces at liveliness %i', async (liveliness) => {
            const faces = new Map<number, number>();
            for (let seed = 1; seed <= 30; seed++) {
                installDisplay(seed);
                const trace = await traceRoll(Array(10).fill(6), steadyRate(60), { liveliness });
                expect(trace.speedAtSettle!.linear).toBeLessThan(VELOCITY_THRESHOLD);
                for (const value of trace.values) faces.set(value, (faces.get(value) ?? 0) + 1);
            }
            const expected = 300 / 6;
            const chiSquare = [1, 2, 3, 4, 5, 6].reduce(
                (sum, face) => sum + ((faces.get(face) ?? 0) - expected) ** 2 / expected,
                0
            );
            // 15.09 is the 1% critical value for five degrees of freedom.
            expect(chiSquare).toBeLessThan(15.09);
        });
    });
});
