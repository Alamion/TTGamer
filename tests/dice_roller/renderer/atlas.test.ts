// @vitest-environment jsdom

import { prepareDiceGeometries } from '@site/src/dice_roller/dice-logic/renderer/factory';
import type { MeshPhongMaterial } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { installDisplay } from './harness';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('face atlas (dice #12)', () => {
    it.each([2, 4, 6, 8, 10, 12, 20, 100])(
        'draws a d%i with one material while keeping its face groups',
        (sides) => {
            installDisplay(1);
            const [die] = prepareDiceGeometries([{ sides, count: 1 } as never], {}).geometries;
            const material = die.geometry.material;
            expect(Array.isArray(material)).toBe(false);

            const geometry = die.geometry.geometry;
            const faces = new Set(geometry.groups.map((group) => group.materialIndex));
            expect(faces.size).toBeGreaterThan(sides === 100 ? 10 : sides);

            // Each face samples only its own region of the atlas: face UV boxes never overlap.
            const uv = geometry.attributes.uv;
            const boxes = new Map<number, [number, number, number, number]>();
            for (const group of geometry.groups) {
                const face = group.materialIndex ?? 0;
                const box = boxes.get(face) ?? [1, 1, 0, 0];
                for (let vertex = group.start; vertex < group.start + group.count; vertex++) {
                    const [u, v] = [uv.getX(vertex), uv.getY(vertex)];
                    expect(Math.min(u, v)).toBeGreaterThanOrEqual(0);
                    expect(Math.max(u, v)).toBeLessThanOrEqual(1);
                    box[0] = Math.min(box[0], u);
                    box[1] = Math.min(box[1], v);
                    box[2] = Math.max(box[2], u);
                    box[3] = Math.max(box[3], v);
                }
                boxes.set(face, box);
            }
            const list = [...boxes.values()];
            for (let i = 0; i < list.length; i++) {
                for (let j = i + 1; j < list.length; j++) {
                    const [a, b] = [list[i], list[j]];
                    const overlapU = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
                    const overlapV = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
                    expect(Math.min(overlapU, overlapV)).toBeLessThanOrEqual(1e-6);
                }
            }
        }
    );

    it('builds one atlas per die type and colour and shares it', () => {
        installDisplay(1);
        const { geometries } = prepareDiceGeometries([{ sides: 6, count: 3 } as never], {});
        const maps = geometries.map(
            (die) => (die.geometry.material as MeshPhongMaterial).map?.image
        );
        expect(new Set(maps).size).toBe(1);
    });
});
