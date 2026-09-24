// @vitest-environment jsdom

import { prepareDiceGeometries } from '@site/src/dice_roller/dice-logic/renderer/factory';
import { DiceRenderer } from '@site/src/dice_roller/dice-logic/renderer/renderer';
import { diceScaleFor } from '@site/src/dice_roller/dice-logic/roll-orchestrator';
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

const DISPLAYS: [string, FrameTiming][] = [
    ['60 Hz', steadyRate(60)],
    ['144 Hz', steadyRate(144)],
    ['60 Hz with stutter', stutter(7, 120)],
    ['a tab hidden for 3 s', backgroundPause(20, 3_000)],
];

describe('predetermined 3D rolls (dice #14)', { timeout: 60_000 }, () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it.each([
        [2, [1, 2]],
        [4, [1, 4]],
        [6, [1, 6]],
        [8, [1, 8]],
        [10, [1, 10]],
        [12, [1, 12]],
        [20, [1, 20]],
    ])('lands a d%i on each forced face', async (sides, values) => {
        for (const value of values) {
            for (const seed of [1, 2]) {
                installDisplay(seed);
                const trace = await traceRoll([sides], steadyRate(60), { targets: [value] });
                expect(trace.values, `seed ${seed}`).toEqual([value]);
            }
        }
    });

    it.each(DISPLAYS)('lands a mixed pool on its forced faces at %s', async (_, timing) => {
        const targets = [1, 2, undefined, 4, 5, 6];
        for (const seed of [1, 2, 3]) {
            installDisplay(seed);
            const trace = await traceRoll(Array(6).fill(6), timing, { targets });
            targets.forEach((target, index) => {
                if (target !== undefined) expect(trace.values[index], `seed ${seed}`).toBe(target);
            });
        }
    });

    it('lands heavy dice and a large pool on their forced faces', async () => {
        installDisplay(4);
        const heavy = await traceRoll(Array(6).fill(6), steadyRate(60), {
            targets: [6, 6, 6, 1, 1, 1],
            liveliness: 0,
        });
        expect(heavy.values).toEqual([6, 6, 6, 1, 1, 1]);

        const targets = Array.from({ length: 40 }, (_, index) => (index % 6) + 1);
        installDisplay(5);
        const crowd = await traceRoll(Array(40).fill(6), steadyRate(60), {
            targets,
            scaler: diceScaleFor(40),
        });
        expect(crowd.values).toEqual(targets);
    });

    it('replays a large pool exactly: the prediction copy steps like the live world', () => {
        installDisplay(1);
        const { geometries, groupSizes } = prepareDiceGeometries(
            [{ sides: 6, count: 40 } as never],
            { scaler: diceScaleFor(40) }
        );
        const renderer = new DiceRenderer(1920, 1080, {
            diceColor: '#000',
            textColor: '#fff',
            scaler: 1,
        });
        renderer.startRoll(geometries, groupSizes);
        const live = (
            renderer as unknown as {
                physicsWorld: import('@site/src/dice_roller/dice-logic/renderer/physics').PhysicsWorld;
            }
        ).physicsWorld;
        const { world: copy, bodies } = live.cloneForPrediction();
        for (let step = 0; step < 240; step++) {
            live.world.step(1 / 60);
            copy.world.step(1 / 60);
        }
        for (const body of live.world.bodies) {
            expect(bodies.get(body)!.position.distanceTo(body.position)).toBe(0);
        }
        renderer.dispose();
    });
});
