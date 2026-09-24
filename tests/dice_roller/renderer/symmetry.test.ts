// @vitest-environment jsdom

import { prepareDiceGeometries } from '@site/src/dice_roller/dice-logic/renderer/factory';
import { createDiceShape } from '@site/src/dice_roller/dice-logic/renderer/shapes';
import { faceTurn } from '@site/src/dice_roller/dice-logic/renderer/symmetry';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { installDisplay } from './harness';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function die(sides: number, fudge = false) {
    installDisplay(1);
    const [data] = prepareDiceGeometries([{ sides, count: 1, fudge } as never], {}).geometries;
    return createDiceShape(sides, 800, 600, data);
}

describe('die symmetries (dice #14)', () => {
    it.each([2, 4, 6, 8, 10, 12, 20, 100])(
        'turns any face of a d%i onto any other while keeping the die whole',
        (sides) => {
            const shape = die(sides);
            const normals = shape.faceNormals();
            const faces = [...normals.keys()];
            for (const from of faces) {
                for (const to of faces) {
                    const turn = faceTurn(normals, from, to, shape.surfaceNormals());
                    expect(turn, `${from} → ${to}`).not.toBeNull();
                    const moved = normals.get(from)!.clone().applyQuaternion(turn!);
                    expect(moved.distanceTo(normals.get(to)!)).toBeLessThan(1e-3);
                    for (const normal of normals.values()) {
                        const turned = normal.clone().applyQuaternion(turn!);
                        expect(
                            [...normals.values()].some((other) => other.distanceTo(turned) < 1e-2)
                        ).toBe(true);
                    }
                }
            }
        }
    );

    it('keeps opposite d6 faces adding up to 7', () => {
        const shape = die(6);
        const normals = shape.faceNormals();
        const opposite = (face: number) =>
            [...normals].find(([, n]) => n.dot(normals.get(face)!) < -0.99)![0];
        for (const from of normals.keys()) {
            for (const to of normals.keys()) {
                const turn = faceTurn(normals, from, to, shape.surfaceNormals())!;
                for (const [face, normal] of normals) {
                    const turned = normal.clone().applyQuaternion(turn);
                    const image = [...normals].find(([, n]) => n.distanceTo(turned) < 1e-2)![0];
                    expect(shape.valueOfFace(image) + shape.valueOfFace(opposite(image))).toBe(
                        shape.valueOfFace(face) + shape.valueOfFace(opposite(face))
                    );
                }
            }
        }
    });

    it('reads a fudge die by its value, two faces each', () => {
        const shape = die(6, true);
        expect(shape.facesShowing(1)).toHaveLength(2);
        expect(shape.facesShowing(0)).toHaveLength(2);
        expect(shape.facesShowing(-1)).toHaveLength(2);
    });

    it('reads the face turned up by the face offset', () => {
        const shape = die(20);
        const normals = shape.faceNormals();
        const up = shape.upFace(shape.meshOrientation());
        const [other] = [...normals.keys()].filter((face) => face !== up);
        shape.faceOffset.copy(faceTurn(normals, other, up, shape.surfaceNormals())!);
        expect(shape.result).toBe(shape.valueOfFace(other));
    });
});
