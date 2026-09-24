import { debug } from '@site/src/shared/utils/logging';
import { Body } from 'cannon-es';
import {
    BufferGeometry,
    type Material,
    type Mesh,
    Quaternion as ThreeQuaternion,
    Vector3,
} from 'three';

import type { DiceGeometryData } from './geometries';

function cannonQuaternionToThree(cannonQuat: {
    x: number;
    y: number;
    z: number;
    w: number;
}): ThreeQuaternion {
    return new ThreeQuaternion(cannonQuat.x, cannonQuat.y, cannonQuat.z, cannonQuat.w);
}

interface DiceVector {
    pos: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    angular: { x: number; y: number; z: number };
    /** Start orientation as a unit quaternion. */
    axis: { x: number; y: number; z: number; w: number };
}

/**
 * A rotation drawn uniformly over all orientations (Shoemake). A random axis and angle is not
 * uniform, and when dice barely tumble the start orientation decides the face.
 */
function randomOrientation(): DiceVector['axis'] {
    const [u1, u2, u3] = [Math.random(), Math.random(), Math.random()];
    const a = Math.sqrt(1 - u1);
    const b = Math.sqrt(u1);
    return {
        x: a * Math.sin(2 * Math.PI * u2),
        y: a * Math.cos(2 * Math.PI * u2),
        z: b * Math.sin(2 * Math.PI * u3),
        w: b * Math.cos(2 * Math.PI * u3),
    };
}

function createDefaultVector(): DiceVector {
    return {
        pos: {
            x: 100 * Math.random(),
            y: 100 * Math.random(),
            z: 250,
        },
        velocity: {
            x: 600 * (Math.random() * 2 + 1),
            y: 750 * (Math.random() * 2 + 1),
            z: 0,
        },
        angular: {
            x: 200 * Math.random(),
            y: 200 * Math.random(),
            z: 100 * Math.random(),
        },
        axis: randomOrientation(),
    };
}

export abstract class DiceShape {
    sides: number;
    inertia: number;
    body: Body;
    geometry: Mesh<BufferGeometry, Material | Material[]>;
    values: number[] = [];
    w: number;
    h: number;

    stopped: boolean = false;
    /** Simulated time the die became still; null while it moves. */
    restingSince: number | null = null;

    vector!: DiceVector;

    constructor(
        sides: number,
        inertia: number,
        w: number,
        h: number,
        data: DiceGeometryData,
        vector?: { x: number; y: number }
    ) {
        this.sides = sides;
        this.inertia = inertia;
        this.w = w;
        this.h = h;
        this.geometry = data.geometry;
        this.body = data.body;
        this.values = data.values;
        this.vector = createDefaultVector();
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }

    generateVector(v: { x: number; y: number }): DiceVector {
        const dist = Math.sqrt(v.x * v.x + v.y * v.y);
        const boost = (Math.random() * 5 + 1) * dist;
        const vector = { x: v.x / dist, y: v.y / dist };
        const pos = {
            x: -1 * v.x,
            y: -1 * v.y,
            z: Math.random() * 200 + 200,
        };

        const velvec = this.makeRandomVector(vector);
        const velocity = {
            x: velvec.x * boost,
            y: velvec.y * boost,
            z: -10,
        };

        const ang = this.makeRandomVector(vector);
        const angular = {
            x: -(Math.random() * 5 + this.inertia) * ang.y,
            y: (Math.random() * 5 + this.inertia) * ang.x,
            z: 0,
        };
        const axis = randomOrientation();
        return {
            pos,
            velocity,
            angular,
            axis,
        };
    }

    makeRandomVector(vector: { x: number; y: number }): { x: number; y: number } {
        const random_angle = (Math.random() * Math.PI) / 5 - Math.PI / 5 / 2;
        const vec = {
            x: vector.x * Math.cos(random_angle) - vector.y * Math.sin(random_angle),
            y: vector.x * Math.sin(random_angle) + vector.y * Math.cos(random_angle),
        };
        if (vec.x === 0) vec.x = 0.01;
        if (vec.y === 0) vec.y = 0.01;
        return vec;
    }

    get buffer(): BufferGeometry {
        return this.geometry.geometry as BufferGeometry;
    }

    /**
     * Rotation of the mesh relative to the body: one of the die's symmetries, so the mesh
     * fills exactly the body's shape. A predetermined roll picks it so the forced face ends up
     * where physics lands (identity otherwise).
     */
    faceOffset = new ThreeQuaternion();

    get result(): number {
        return this.getUpsideValue();
    }

    /** Local normal of each numbered face (material index ≥ 1); shared by dice of one shape. */
    faceNormals(): Map<number, Vector3> {
        const cached = this.buffer.userData.faceNormals as Map<number, Vector3> | undefined;
        if (cached) return cached;
        const normals = this.buffer.attributes.normal.array as Float32Array;
        const faces = new Map<number, Vector3>();
        for (const group of this.buffer.groups) {
            // Material 0 is the blank chamfer; material 1 is the '0'/'00' face on d10/d100.
            const material = group.materialIndex ?? 0;
            if (material < 1 || faces.has(material)) continue;
            const start = group.start * 3;
            const normal = new Vector3(normals[start], normals[start + 1], normals[start + 2]);
            if (normal.lengthSq() > 0 && Number.isFinite(normal.lengthSq())) {
                faces.set(material, normal.normalize());
            }
        }
        this.buffer.userData.faceNormals = faces;
        return faces;
    }

    /** Distinct normals of the whole surface, blank chamfers included. */
    surfaceNormals(): Vector3[] {
        const cached = this.buffer.userData.surfaceNormals as Vector3[] | undefined;
        if (cached) return cached;
        const array = this.buffer.attributes.normal.array as Float32Array;
        const distinct: Vector3[] = [];
        for (let index = 0; index + 2 < array.length; index += 3) {
            const normal = new Vector3(array[index], array[index + 1], array[index + 2]);
            if (!(normal.lengthSq() > 0)) continue;
            normal.normalize();
            if (!distinct.some((seen) => seen.distanceToSquared(normal) < 1e-6)) {
                distinct.push(normal);
            }
        }
        this.buffer.userData.surfaceNormals = distinct;
        return distinct;
    }

    /** The face read for a mesh orientation: the one facing up (down for a d4); -1 if none. */
    upFace(orientation: ThreeQuaternion): number {
        const up = new Vector3(0, 0, this.sides === 4 ? -1 : 1);
        let best = -1;
        let bestDot = -Infinity;
        const world = new Vector3();
        for (const [material, normal] of this.faceNormals()) {
            const dot = world.copy(normal).applyQuaternion(orientation).dot(up);
            if (dot > bestDot) {
                bestDot = dot;
                best = material;
            }
        }
        return best;
    }

    /** Die value of a face. d10/d100 material 1 (label '0'/'00') wraps to the last value. */
    valueOfFace(material: number): number {
        const faceIndex = (material - 2 + this.values.length) % this.values.length;
        return this.values[faceIndex] ?? faceIndex + 1;
    }

    /** Faces that show `value` (a fudge die has two of each). */
    facesShowing(value: number): number[] {
        return [...this.faceNormals().keys()].filter(
            (material) => this.valueOfFace(material) === value
        );
    }

    /** Orientation the mesh is drawn with: the body's, turned by the face offset. */
    meshOrientation(bodyQuaternion = this.body.quaternion): ThreeQuaternion {
        return cannonQuaternionToThree(bodyQuaternion).multiply(this.faceOffset);
    }

    getUpsideValue(): number {
        const material = this.upFace(this.meshOrientation());
        if (material < 0) {
            const randomIndex = Math.floor(Math.random() * this.values.length);
            const fallbackValue = (this.values?.[randomIndex] ?? randomIndex + 1) || 1;
            debug(
                `DiceShape: No valid face normals found, using fallback random value: ${fallbackValue}`
            );
            return fallbackValue;
        }
        return this.valueOfFace(material);
    }

    /**
     * Draws the die between the last two physics steps (cannon-es interpolates by the time
     * left over), so motion is smooth at refresh rates other than the 60 Hz physics step.
     */
    set(): void {
        // Validate position values before updating geometry
        const pos = this.body.interpolatedPosition;
        const quat = this.body.interpolatedQuaternion;

        if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z)) {
            debug('DiceShape: Invalid position detected, skipping update');
            return;
        }

        if (
            !Number.isFinite(quat.x) ||
            !Number.isFinite(quat.y) ||
            !Number.isFinite(quat.z) ||
            !Number.isFinite(quat.w)
        ) {
            debug('DiceShape: Invalid quaternion detected, skipping update');
            return;
        }

        this.geometry.position.set(pos.x, pos.y, pos.z);
        this.geometry.quaternion.set(quat.x, quat.y, quat.z, quat.w).multiply(this.faceOffset);
    }

    setOpacity(opacity: number): void {
        const materials = Array.isArray(this.geometry.material)
            ? this.geometry.material
            : [this.geometry.material];

        for (const material of materials) {
            if (material) {
                material.opacity = opacity;
                material.transparent = true;
            }
        }
    }

    recreate(vector: { x: number; y: number }, width: number, height: number): void {
        this.w = width;
        this.h = height;
        this.vector = this.generateVector(vector);
        this.stopped = false;
        this.restingSince = null;
        this.create();
    }

    create(): void {
        this.body.position.set(this.vector.pos.x, this.vector.pos.y, this.vector.pos.z);
        const { x, y, z, w } = this.vector.axis;
        this.body.quaternion.set(x, y, z, w);
        this.body.angularVelocity.set(
            this.vector.angular.x,
            this.vector.angular.y,
            this.vector.angular.z
        );
        this.body.velocity.set(
            this.vector.velocity.x,
            this.vector.velocity.y,
            this.vector.velocity.z
        );
        // A teleport, not motion: nothing to interpolate from.
        this.body.previousPosition.copy(this.body.position);
        this.body.interpolatedPosition.copy(this.body.position);
        this.body.previousQuaternion.copy(this.body.quaternion);
        this.body.interpolatedQuaternion.copy(this.body.quaternion);
        // this.body.ccdSpeedThreshold = 5;
        // this.body.ccdRadius = 0.5;
        this.body.linearDamping = 0.1;
        this.body.angularDamping = 0.1;
        this.body.wakeUp();
    }
}

export class D20Dice extends DiceShape {
    constructor(w: number, h: number, data: DiceGeometryData, vector?: { x: number; y: number }) {
        super(20, 6, w, h, data, vector);
    }
}
export class D12Dice extends DiceShape {
    constructor(w: number, h: number, data: DiceGeometryData, vector?: { x: number; y: number }) {
        super(12, 8, w, h, data, vector);
    }
}
export class D10Dice extends DiceShape {
    constructor(w: number, h: number, data: DiceGeometryData, vector?: { x: number; y: number }) {
        super(10, 9, w, h, data, vector);
    }
}
export class D100Dice extends DiceShape {
    constructor(w: number, h: number, data: DiceGeometryData, vector?: { x: number; y: number }) {
        super(10, 9, w, h, data, vector);
    }
}
export class D8Dice extends DiceShape {
    constructor(w: number, h: number, data: DiceGeometryData, vector?: { x: number; y: number }) {
        super(8, 10, w, h, data, vector);
    }
}
export class D6Dice extends DiceShape {
    constructor(w: number, h: number, data: DiceGeometryData, vector?: { x: number; y: number }) {
        super(6, 13, w, h, data, vector);
    }
}
export class D4Dice extends DiceShape {
    constructor(w: number, h: number, data: DiceGeometryData, vector?: { x: number; y: number }) {
        super(4, 5, w, h, data, vector);
    }
}
export class D2Dice extends DiceShape {
    constructor(w: number, h: number, data: DiceGeometryData, vector?: { x: number; y: number }) {
        super(2, 3, w, h, data, vector);
    }
}

const DICE_CLASSES: Record<
    number,
    new (
        w: number,
        h: number,
        data: DiceGeometryData,
        vector?: { x: number; y: number }
    ) => DiceShape
> = {
    2: D2Dice,
    4: D4Dice,
    6: D6Dice,
    8: D8Dice,
    10: D10Dice,
    12: D12Dice,
    20: D20Dice,
    100: D100Dice,
};

export function createDiceShape(
    sides: number,
    w: number,
    h: number,
    data: DiceGeometryData,
    vector?: { x: number; y: number }
): DiceShape {
    const DiceClass = DICE_CLASSES[sides];
    if (!DiceClass) {
        throw new Error(`Unsupported dice sides: ${sides}`);
    }
    return new DiceClass(w, h, data, vector);
}
