import type { Body } from 'cannon-es';

const MAX_ATTEMPTS = 60;
/** Headroom the spawn height may grow into when the throw area is crowded. */
const EXTRA_HEIGHT_PER_ATTEMPT = 10;

function reach(body: Body): number {
    return body.shapes[0]?.boundingSphereRadius ?? 0;
}

function overlapsAny(body: Body, others: readonly Body[]): boolean {
    return others.some(
        (other) => body.position.distanceTo(other.position) < reach(body) + reach(other)
    );
}

function clamp(value: number, limit: number): number {
    return Math.max(-limit, Math.min(limit, value));
}

/**
 * Moves freshly thrown dice apart so no two bounding spheres intersect, neither with each
 * other nor with dice already in the air (F-004). Interpenetrating spawns make the solver
 * push dice apart violently. Each die searches outward from where it was thrown, stays
 * inside the barriers, and keeps its velocity and spin.
 */
export function separateSpawns(
    fresh: readonly Body[],
    obstacles: readonly Body[],
    limits: { x: number; y: number }
): void {
    const placed = [...obstacles];
    for (const body of fresh) {
        const radius = reach(body);
        const origin = { x: body.position.x, y: body.position.y, z: body.position.z };
        for (let attempt = 1; attempt <= MAX_ATTEMPTS && overlapsAny(body, placed); attempt++) {
            const spread = radius * attempt * 0.5;
            body.position.set(
                clamp(origin.x + (Math.random() * 2 - 1) * spread, limits.x - radius),
                clamp(origin.y + (Math.random() * 2 - 1) * spread, limits.y - radius),
                origin.z + Math.random() * attempt * EXTRA_HEIGHT_PER_ATTEMPT
            );
        }
        body.previousPosition.copy(body.position);
        body.interpolatedPosition.copy(body.position);
        placed.push(body);
    }
}
