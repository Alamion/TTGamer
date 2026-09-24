import { prepareDiceGeometries } from '@site/src/dice_roller/dice-logic/renderer/factory';
import type { DiceGeometryData } from '@site/src/dice_roller/dice-logic/renderer/geometries';
import { DiceRenderer } from '@site/src/dice_roller/dice-logic/renderer/renderer';
import { type Body, Vec3 } from 'cannon-es';
import { vi } from 'vitest';

/**
 * Headless 3D roll harness: real cannon-es, real dice geometry, real camera and barriers;
 * WebGL drawing, textures, and sound are stubbed (see the vi.mock calls in the test files).
 * Time only moves when a frame is delivered, so a test chooses the display's frame timing.
 */

export const VIEWPORT = { width: 1920, height: 1080 };

/** Frame intervals in ms; called once per frame with the frame index. */
export type FrameTiming = (frame: number) => number;

export const steadyRate =
    (hz: number): FrameTiming =>
    () =>
        1000 / hz;

/** Mostly 60 Hz with a long frame every `every` frames (GC pauses, busy main thread). */
export const stutter =
    (every: number, longMs: number): FrameTiming =>
    (frame) =>
        frame > 0 && frame % every === 0 ? longMs : 1000 / 60;

/** A background tab: frames stop for `pauseMs` after `afterFrames`, then resume at 60 Hz. */
export const backgroundPause =
    (afterFrames: number, pauseMs: number): FrameTiming =>
    (frame) =>
        frame === afterFrames ? pauseMs : 1000 / 60;

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const fakeContext = new Proxy(
    { measureText: () => ({ width: 10 }) },
    {
        get: (target, key) =>
            key in target ? target[key as keyof typeof target] : key === 'canvas' ? null : () => {},
        set: () => true,
    }
);

let now = 0;
let frameQueue: FrameRequestCallback[] = [];
let seed = 1;

function seedRandom(): void {
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(seed));
}

/** Installs the fake clock, frame scheduler, canvas context, and seeded randomness. */
export function installDisplay(rollSeed: number): void {
    now = 1_000;
    frameQueue = [];
    seed = rollSeed;
    seedRandom();
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        frameQueue.push(callback);
        return frameQueue.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {
        frameQueue = [];
    });
    HTMLCanvasElement.prototype.getContext = (() =>
        fakeContext) as unknown as HTMLCanvasElement['getContext'];
}

export interface RollTrace {
    /** Pairs of dice whose bounding spheres intersect where they are spawned. */
    spawnOverlaps: number;
    /** Fastest launch speed given to any die. */
    launchSpeed: number;
    /** Fastest speed any die reached after it was launched. */
    peakSpeed: number;
    /**
     * Largest per-die energy (v² + 2gz) seen during the roll over the largest at launch.
     * Collisions only lose energy, so a ratio well above 1 means the solver pushed
     * interpenetrating dice apart.
     */
    energyGain: number;
    /** ms from the throw until the renderer reported values; null if it never did. */
    settledAt: number | null;
    /** Fastest die (linear, tipping spin) at the moment the values were read. */
    speedAtSettle: { linear: number; angular: number } | null;
    /** Largest tilt, in degrees, between a die's read face and straight up at settle. */
    tiltAtSettle: number | null;
    /** Values the renderer reported, in throw order. */
    values: number[];
    /** ms from the reported values until the dice left the scene. */
    showAndFadeMs: number | null;
    frames: number;
}

/** Linear speed and tipping spin (about horizontal axes; vertical spin keeps the face up). */
function speedOf(body: Body): { linear: number; angular: number } {
    const { x, y } = body.angularVelocity;
    return { linear: body.velocity.length(), angular: Math.hypot(x, y) };
}

const GRAVITY = 1000;

function energyOf(body: Body): number {
    return body.velocity.lengthSquared() + 2 * GRAVITY * Math.max(0, body.position.z);
}

function spawnOverlaps(bodies: Body[]): number {
    let overlaps = 0;
    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            const reach =
                bodies[i].shapes[0].boundingSphereRadius + bodies[j].shapes[0].boundingSphereRadius;
            if (bodies[i].position.distanceTo(bodies[j].position) < reach) overlaps++;
        }
    }
    return overlaps;
}

/** Tilt of the face closest to up, from the body's orientation (d4 reads the face down). */
function tiltDegrees(data: DiceGeometryData): number {
    const geometry = data.geometry.geometry;
    const normals = geometry.attributes.normal.array;
    const up = data.values.length === 4 ? -1 : 1;
    const q = data.body.quaternion;
    let best = 180;
    for (const group of geometry.groups) {
        if ((group.materialIndex ?? 0) < 1) continue;
        const start = group.start * 3;
        const world = q.vmult(new Vec3(normals[start], normals[start + 1], normals[start + 2]));
        const cos = (world.z * up) / Math.max(1e-9, world.length());
        best = Math.min(best, (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI);
    }
    return best;
}

/** Rolls `sides` (one entry per die) and delivers frames until the dice leave the scene. */
export async function traceRoll(
    sides: number[],
    timing: FrameTiming,
    {
        liveliness,
        scaler = 1,
        targets,
        limitMs = 40_000,
        onFrame,
    }: {
        liveliness?: number;
        scaler?: number;
        /** Per die, a value it must show (a forced `@` value). */
        targets?: (number | undefined)[];
        limitMs?: number;
        onFrame?: (ms: number, bodies: Body[]) => void;
    } = {}
): Promise<RollTrace> {
    const groups = sides.map((s) => ({ sides: s, count: 1 }));
    const { geometries, groupSizes } = prepareDiceGeometries(groups as never, {
        diceColor: '#202020',
        textColor: '#ffffff',
        scaler,
    });
    // three.js draws UUIDs from Math.random for every uncached texture; re-seed after them so
    // a seed means the same throw whatever ran before it.
    seedRandom();
    const renderer = new DiceRenderer(VIEWPORT.width, VIEWPORT.height, {
        diceColor: '#202020',
        textColor: '#ffffff',
        scaler: 1,
        enableSound: false,
        liveliness,
    });

    const bodies = geometries.map((g) => g.body);
    const start = now;
    const session = renderer.startRoll(geometries, groupSizes, targets);
    const trace: RollTrace = {
        spawnOverlaps: spawnOverlaps(bodies),
        launchSpeed: Math.max(...bodies.map((b) => b.velocity.length())),
        peakSpeed: 0,
        energyGain: 1,
        settledAt: null,
        speedAtSettle: null,
        tiltAtSettle: null,
        showAndFadeMs: null,
        values: [],
        frames: 0,
    };

    const launchEnergy = Math.max(...bodies.map(energyOf));
    let settled = false;
    void session.settle.then((values) => {
        settled = true;
        trace.values = values;
    });

    while (frameQueue.length > 0 && now - start < limitMs) {
        now += timing(trace.frames);
        const callbacks = frameQueue;
        frameQueue = [];
        for (const callback of callbacks) callback(now);
        trace.frames++;
        await Promise.resolve();
        await Promise.resolve();

        onFrame?.(now - start, bodies);
        const speeds = bodies.map(speedOf);
        trace.peakSpeed = Math.max(trace.peakSpeed, ...speeds.map((s) => s.linear));
        trace.energyGain = Math.max(
            trace.energyGain,
            Math.max(...bodies.map(energyOf)) / launchEnergy
        );
        if (settled && trace.settledAt === null) {
            trace.settledAt = now - start;
            trace.speedAtSettle = {
                linear: Math.max(...speeds.map((s) => s.linear)),
                angular: Math.max(...speeds.map((s) => s.angular)),
            };
            trace.tiltAtSettle = Math.max(...geometries.map(tiltDegrees));
        }
        if (geometries.every((g) => g.geometry.parent === null) && trace.settledAt !== null) {
            trace.showAndFadeMs = now - start - trace.settledAt;
            break;
        }
    }

    renderer.dispose();
    return trace;
}
