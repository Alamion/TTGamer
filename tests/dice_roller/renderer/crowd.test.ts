import { applyCrowdCollisions } from '@site/src/dice_roller/dice-logic/renderer/crowd';
import { Body, ConvexPolyhedron, Plane, Sphere, Vec3 } from 'cannon-es';
import { describe, expect, it } from 'vitest';

function cube(): Body {
    const vertices = [-1, 1].flatMap((x) =>
        [-1, 1].flatMap((y) => [-1, 1].map((z) => new Vec3(x, y, z)))
    );
    const faces = [
        [0, 1, 3, 2],
        [4, 6, 7, 5],
        [0, 4, 5, 1],
        [2, 3, 7, 6],
        [0, 2, 6, 4],
        [1, 5, 7, 3],
    ];
    return new Body({ mass: 1, shape: new ConvexPolyhedron({ vertices, faces }) });
}

const collides = (a: { collisionFilterGroup: number; collisionFilterMask: number }, b: typeof a) =>
    (a.collisionFilterMask & b.collisionFilterGroup) !== 0 &&
    (b.collisionFilterMask & a.collisionFilterGroup) !== 0;

describe('large-pool collisions (dice #12)', () => {
    it('meets the table with the hull and other dice with a sphere', () => {
        const a = cube();
        const b = cube();
        applyCrowdCollisions(a);
        applyCrowdCollisions(b);
        const table = new Plane();
        const [hullA, proxyA] = a.shapes;
        const [hullB, proxyB] = b.shapes;

        expect(proxyA).toBeInstanceOf(Sphere);
        expect(collides(hullA, table)).toBe(true);
        expect(collides(proxyA, table)).toBe(false);
        expect(collides(hullA, hullB)).toBe(false);
        expect(collides(proxyA, proxyB)).toBe(true);
        expect(collides(proxyA, hullB)).toBe(false);
    });

    it('sizes the sphere between the inscribed and circumscribed spheres', () => {
        const body = cube();
        applyCrowdCollisions(body);
        const radius = (body.shapes[1] as Sphere).radius;
        expect(radius).toBeGreaterThan(1);
        expect(radius).toBeLessThan(Math.sqrt(3));
    });

    it('is applied once, and still meets dice outside the pool with the hull', () => {
        const crowded = cube();
        applyCrowdCollisions(crowded);
        applyCrowdCollisions(crowded);
        expect(crowded.shapes).toHaveLength(2);
        expect(collides(crowded.shapes[0], cube().shapes[0])).toBe(true);
    });
});
