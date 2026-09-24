/** Physical parameters that decide how thrown dice move and come to rest. */
export interface PhysicsProfile {
    /** Downward acceleration, scene units/s². */
    gravity: number;
    desk: { friction: number; restitution: number };
    barrier: { friction: number; restitution: number };
    dice: { friction: number; restitution: number };
    linearDamping: number;
    angularDamping: number;
    /** Multiplies a throw's launch speed and spin. */
    launch: number;
    /** A die slower than this (scene units/s) for `sleepTime` seconds freezes until hit. */
    sleepSpeed: number;
    sleepTime: number;
}

/** Dice stop almost where they land; the result comes mostly from how they were thrown. */
const HEAVY: PhysicsProfile = {
    gravity: 2_000,
    desk: { friction: 0.8, restitution: 0.02 },
    barrier: { friction: 0.2, restitution: 0.3 },
    dice: { friction: 0.05, restitution: 0.2 },
    linearDamping: 0.2,
    angularDamping: 0.3,
    launch: 0.3,
    sleepSpeed: 15,
    sleepTime: 0.3,
};

/** The original feel: dice hop, slide, and tumble for seconds. */
const LIVELY: PhysicsProfile = {
    gravity: 1_000,
    desk: { friction: 0.01, restitution: 0.2 },
    barrier: { friction: 0.01, restitution: 0.6 },
    dice: { friction: 0.1, restitution: 0.5 },
    linearDamping: 0.1,
    angularDamping: 0.1,
    launch: 1,
    // cannon-es defaults.
    sleepSpeed: 0.1,
    sleepTime: 1,
};

export const MIN_LIVELINESS = 0;
export const MAX_LIVELINESS = 100;

// Exact at both ends, so 100 reproduces the original physics bit for bit.
const mix = (a: number, b: number, t: number) => a * (1 - t) + b * t;

function mixSurface(
    a: PhysicsProfile['desk'],
    b: PhysicsProfile['desk'],
    t: number
): PhysicsProfile['desk'] {
    return {
        friction: mix(a.friction, b.friction, t),
        restitution: mix(a.restitution, b.restitution, t),
    };
}

/**
 * The profile for a liveliness from 0 (heavy) to 100 (lively, the original behavior).
 * Out-of-range and non-numeric values are clamped, so a stale stored setting still works.
 */
export function physicsProfile(liveliness: number): PhysicsProfile {
    const value = Number.isFinite(liveliness) ? liveliness : MAX_LIVELINESS;
    const t = Math.max(MIN_LIVELINESS, Math.min(MAX_LIVELINESS, value)) / MAX_LIVELINESS;
    return {
        gravity: mix(HEAVY.gravity, LIVELY.gravity, t),
        desk: mixSurface(HEAVY.desk, LIVELY.desk, t),
        barrier: mixSurface(HEAVY.barrier, LIVELY.barrier, t),
        dice: mixSurface(HEAVY.dice, LIVELY.dice, t),
        linearDamping: mix(HEAVY.linearDamping, LIVELY.linearDamping, t),
        angularDamping: mix(HEAVY.angularDamping, LIVELY.angularDamping, t),
        launch: mix(HEAVY.launch, LIVELY.launch, t),
        sleepSpeed: mix(HEAVY.sleepSpeed, LIVELY.sleepSpeed, t),
        sleepTime: mix(HEAVY.sleepTime, LIVELY.sleepTime, t),
    };
}
