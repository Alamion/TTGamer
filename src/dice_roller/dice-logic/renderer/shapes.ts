import { Body, Vec3 } from 'cannon-es';
import {
    BufferGeometry,
    Vector3,
    type Mesh,
    type Material,
    Quaternion as ThreeQuaternion,
} from 'three';
import type { DiceGeometryData } from './geometries';
import { debug } from '@site/src/shared/utils/logging';

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
    axis: { x: number; y: number; z: number; w: number };
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
        axis: {
            x: Math.random(),
            y: Math.random(),
            z: Math.random(),
            w: Math.random(),
        },
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
    staleIterations = 0;
    lastMovingTime = 0;

    vector!: DiceVector;

    constructor(
        sides: number,
        inertia: number,
        w: number,
        h: number,
        data: DiceGeometryData,
        vector?: { x: number; y: number }
    ) {
        debug(`DiceShape: Creating dice with ${data.values?.length || 0} sides`);
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
        const axis = {
            x: Math.random(),
            y: Math.random(),
            z: Math.random(),
            w: Math.random(),
        };
        debug('Vector generated', {
            v,
            dist,
            boost,
            vector,
            pos,
            velvec,
            velocity,
            angular,
            axis,
        });
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

    get result(): number {
        return this.getUpsideValue();
    }

    getUpsideValue(): number {
        const upVector = new Vector3(0, 0, this.sides === 4 ? -1 : 1);
        const normals = this.buffer.attributes.normal.array as Float32Array;
        const groups = this.buffer.groups;

        debug(
            `DiceShape: Calculating result for ${this.sides}-sided die, groups: ${groups.length}, normals count: ${normals.length}`
        );

        for (let i = 0; i < Math.min(5, groups.length); i++) {
            const g = groups[i];
            debug(
                `  Group ${i}: start=${g.start}, count=${g.count}, materialIndex=${g.materialIndex}`
            );
        }

        const materialNormals: Map<number, { angle: number; groupIndex: number }> = new Map();

        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const matIdx = group.materialIndex ?? 0;

            // Skip material index 0 (blank label for triangular connecting faces).
            // Material 1 is the '0'/'00' face on d10/d100 and must be included.
            if (matIdx < 1) {
                // debug(`  Skipping group ${i}: materialIndex ${matIdx} is a border/blank face`)
                continue;
            }

            const startVertex = group.start * 3;
            if (startVertex + 2 >= normals.length) {
                debug(
                    `  Skipping group ${i}: startVertex ${startVertex} >= normals.length ${normals.length}`
                );
                continue;
            }

            const nx = normals[startVertex];
            const ny = normals[startVertex + 1];
            const nz = normals[startVertex + 2];

            if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) {
                debug(
                    `  Skipping group ${i}: normal has non-finite components (${nx}, ${ny}, ${nz})`
                );
                continue;
            }

            const normal = new Vector3(nx, ny, nz);

            if (normal.lengthSq() === 0) {
                debug(`  Skipping group ${i}: zero-length normal`);
                continue;
            }

            const worldNormal = normal
                .clone()
                .applyQuaternion(cannonQuaternionToThree(this.body.quaternion));

            if (worldNormal.lengthSq() === 0) {
                debug(`  Skipping group ${i}: zero-length worldNormal`);
                continue;
            }

            const n1 = worldNormal.clone().normalize();
            const n2 = upVector.clone().normalize();
            const dot = n1.dot(n2);

            if (!Number.isFinite(dot)) {
                debug(`  Skipping group ${i}: dot product is non-finite (${dot})`);
                continue;
            }

            const clampedDot = Math.max(-1, Math.min(1, dot));
            const angle = Math.acos(clampedDot);

            const existing = materialNormals.get(matIdx);
            if (!existing || angle < existing.angle) {
                materialNormals.set(matIdx, { angle, groupIndex: i });
            }
        }

        debug(`DiceShape: Found ${materialNormals.size} unique materials:`, materialNormals);

        if (materialNormals.size === 0) {
            const randomIndex = Math.floor(Math.random() * this.values.length);
            const fallbackValue = (this.values?.[randomIndex] ?? randomIndex + 1) || 1;
            debug(
                `DiceShape: No valid face normals found, using fallback random value: ${fallbackValue}`
            );
            return fallbackValue;
        }

        let closestMatIndex = 1;
        let closestAngle = Math.PI * 2;

        for (const [matIndex, data] of materialNormals) {
            if (data.angle < closestAngle) {
                closestAngle = data.angle;
                closestMatIndex = matIndex;
            }
        }

        // Map material index back to a value index.
        // For d10/d100: mat 1 (label '0'/'00') wraps to the last value (10).
        // For other dice: mat 2+ maps linearly with modulo wrapping.
        const faceIndex = (closestMatIndex - 2 + this.values.length) % this.values.length;
        let result: number;

        if (faceIndex >= 0 && faceIndex < this.values.length) {
            result = this.values[faceIndex];
        } else {
            // Fallback: map as best we can to a valid index
            const approxIndex = Math.max(
                0,
                Math.min(this.values.length - 1, Math.abs(faceIndex) % this.values.length)
            );
            result = this.values?.[approxIndex] ?? approxIndex + 1;
        }

        debug(
            `DiceShape: Result calculated - closestMatIndex: ${closestMatIndex}, faceIndex: ${faceIndex}, value: ${result}, closestAngle: ${closestAngle}`
        );
        return result;
    }

    set(): void {
        // Validate position values before updating geometry
        const pos = this.body.position;
        const quat = this.body.quaternion;

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
        this.geometry.quaternion.set(quat.x, quat.y, quat.z, quat.w);
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
        this.staleIterations = 0;
        this.lastMovingTime = 0;
        this.create();
    }

    create(): void {
        this.body.position.set(this.vector.pos.x, this.vector.pos.y, this.vector.pos.z);
        this.body.quaternion.setFromAxisAngle(
            new Vec3(this.vector.axis.x, this.vector.axis.y, this.vector.axis.z),
            this.vector.axis.w * Math.PI * 2
        );
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
        // this.body.ccdSpeedThreshold = 5;
        // this.body.ccdRadius = 0.5;
        this.body.linearDamping = 0.1;
        this.body.angularDamping = 0.1;
        this.body.wakeUp();

        debug('DiceShape created:', this.body);
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
