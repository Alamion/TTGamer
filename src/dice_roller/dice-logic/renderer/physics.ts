import {
    Body,
    ContactMaterial,
    ConvexPolyhedron,
    Material,
    NaiveBroadphase,
    Plane,
    type Shape,
    Sphere,
    Vec3,
    World,
} from 'cannon-es';

import { MAX_LIVELINESS, type PhysicsProfile, physicsProfile } from './liveliness';
import type { DiceShape } from './shapes';

export class PhysicsWorld {
    world: World;
    diceMaterial: Material;
    deskMaterial: Material;
    barrierMaterial: Material;
    lastCallTime = 0;
    /** Wall time not yet simulated, below one step. */
    private accumulator = 0;
    private profile: PhysicsProfile;
    private barriers: Body[] = [];
    private deskContact!: ContactMaterial;
    private barrierContact!: ContactMaterial;
    private diceContact!: ContactMaterial;
    /** Half-extents of the area inside the barriers, at the table. */
    limits = { x: Infinity, y: Infinity };
    WIDTH!: number;
    HEIGHT!: number;

    constructor(WIDTH: number, HEIGHT: number, profile = physicsProfile(MAX_LIVELINESS)) {
        this.profile = profile;
        this.WIDTH = WIDTH;
        this.HEIGHT = HEIGHT;
        this.world = new World({ gravity: new Vec3(0, 0, -1000) });
        this.world.broadphase = new NaiveBroadphase();
        this.world.allowSleep = true;

        this.diceMaterial = new Material('dice');
        this.deskMaterial = new Material('desk');
        this.barrierMaterial = new Material('barrier');

        this.buildWalls();
        this.applyProfile(profile);
    }

    /** Gravity and surface response; dice damping and launch are applied per throw. */
    applyProfile(profile: PhysicsProfile): void {
        this.profile = profile;
        this.world.gravity.set(0, 0, -profile.gravity);
        for (const [contact, surface] of [
            [this.deskContact, profile.desk],
            [this.barrierContact, profile.barrier],
            [this.diceContact, profile.dice],
        ] as const) {
            contact.friction = surface.friction;
            contact.restitution = surface.restitution;
        }
    }

    buildWalls(): void {
        const contact = (a: Material) =>
            new ContactMaterial(a, this.diceMaterial, {
                contactEquationRelaxation: 3,
                contactEquationStiffness: 1e8,
            });
        this.deskContact = contact(this.deskMaterial);
        this.barrierContact = contact(this.barrierMaterial);
        this.diceContact = contact(this.diceMaterial);
        this.world.addContactMaterial(this.deskContact);
        this.world.addContactMaterial(this.barrierContact);
        this.world.addContactMaterial(this.diceContact);

        // Ground plane - rotated to face upward (positive Z)
        const ground = new Body({
            allowSleep: false,
            mass: 0,
            shape: new Plane(),
            material: this.deskMaterial,
        });

        ground.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), 0);
        this.world.addBody(ground);
    }

    updateBarriers(cameraZ: number, fovDeg: number, aspect: number): void {
        this.barriers.forEach((b) => this.world.removeBody(b));
        this.barriers = [];

        const fovRad = (fovDeg * Math.PI) / 180;
        const visibleHeight = 2 * cameraZ * Math.tan(fovRad / 2);
        const visibleWidth = visibleHeight * aspect;

        // Barriers at 90% of visible area so dice stay on-screen with some margin
        const limitX = (visibleWidth / 2) * 0.9;
        const limitY = (visibleHeight / 2) * 0.9;
        this.limits = { x: limitX, y: limitY };

        const wallConfig = {
            allowSleep: false,
            mass: 0,
            shape: new Plane(),
            material: this.barrierMaterial,
        };

        const walls = [
            { quat: [1, 0, 0], angle: Math.PI / 2, pos: [0, limitY, 0] },
            { quat: [1, 0, 0], angle: -Math.PI / 2, pos: [0, -limitY, 0] },
            { quat: [0, 1, 0], angle: -Math.PI / 2, pos: [limitX, 0, 0] },
            { quat: [0, 1, 0], angle: Math.PI / 2, pos: [-limitX, 0, 0] },
        ];

        for (const wall of walls) {
            const body = new Body(wallConfig);
            body.quaternion.setFromAxisAngle(
                new Vec3(wall.quat[0], wall.quat[1], wall.quat[2]),
                wall.angle
            );
            body.position.set(wall.pos[0], wall.pos[1], wall.pos[2]);
            this.world.addBody(body);
            this.barriers.push(body);
        }
    }

    add(...dice: DiceShape[]): void {
        dice.forEach((die) => {
            // Assign dice material for proper collision detection
            die.body.material = this.diceMaterial;
            this.world.addBody(die.body);
        });
    }

    remove(...dice: DiceShape[]): void {
        dice.forEach((die) => {
            this.world.removeBody(die.body);
        });
    }

    /** Forgets the last frame time, so a loop restarted after idling does not catch up. */
    resetClock(): void {
        this.lastCallTime = 0;
        this.accumulator = 0;
    }

    /**
     * Advances the simulation by the wall time since the last call in fixed steps (at most
     * ten per call, so a long pause only moves the dice a sixth of a second) and returns the
     * simulated seconds, which drive every roll timing. The steps are counted here rather than
     * by cannon-es's own accumulator, which advances `world.time` — and so sleep timing — by
     * wall time: every step is exactly `step` seconds, so a replay of the same throw lands the
     * same way (predetermined rolls depend on it).
     */
    step(step = 1 / 60): number {
        const time = performance.now() / 1000;
        this.accumulator += this.lastCallTime ? time - this.lastCallTime : step;
        this.lastCallTime = time;

        let steps = 0;
        while (this.accumulator >= step && steps < MAX_SUBSTEPS) {
            this.world.step(step);
            this.accumulator -= step;
            steps++;
        }
        // A backlog beyond ten steps is dropped rather than caught up.
        this.accumulator %= step;

        const t = this.accumulator / step;
        for (const body of this.world.bodies) {
            body.previousPosition.lerp(body.position, t, body.interpolatedPosition);
            body.previousQuaternion.slerp(body.quaternion, t, body.interpolatedQuaternion);
            body.interpolatedQuaternion.normalize();
        }
        return steps * step;
    }

    /**
     * An independent copy of this world — surfaces, walls, and every body in the same order
     * and state — for replaying a throw ahead of time. Advance it with `world.step(dt)`.
     */
    cloneForPrediction(): { world: PhysicsWorld; bodies: Map<Body, Body> } {
        const copy = new PhysicsWorld(this.WIDTH, this.HEIGHT, this.profile);
        for (const body of [...copy.world.bodies]) copy.world.removeBody(body);
        copy.limits = { ...this.limits };

        const materials = new Map<Material | null, Material | null>([
            [this.diceMaterial, copy.diceMaterial],
            [this.deskMaterial, copy.deskMaterial],
            [this.barrierMaterial, copy.barrierMaterial],
        ]);
        const bodies = new Map<Body, Body>();
        for (const body of this.world.bodies) {
            const clone = new Body({
                mass: body.mass,
                material: materials.get(body.material) ?? undefined,
                allowSleep: body.allowSleep,
                linearDamping: body.linearDamping,
                angularDamping: body.angularDamping,
                sleepSpeedLimit: body.sleepSpeedLimit,
                sleepTimeLimit: body.sleepTimeLimit,
            });
            body.shapes.forEach((shape, index) =>
                clone.addShape(
                    cloneShape(shape),
                    body.shapeOffsets[index].clone(),
                    body.shapeOrientations[index].clone()
                )
            );
            clone.position.copy(body.position);
            clone.previousPosition.copy(body.previousPosition);
            clone.quaternion.copy(body.quaternion);
            clone.previousQuaternion.copy(body.previousQuaternion);
            // cannon-es derives inertia from the world-space box of the shapes, so it depends on
            // the orientation the shapes were added at; copy it rather than recompute it.
            clone.inertia.copy(body.inertia);
            clone.invInertia.copy(body.invInertia);
            clone.invInertiaSolve.copy(body.invInertiaSolve);
            clone.updateInertiaWorld(true);
            clone.velocity.copy(body.velocity);
            clone.angularVelocity.copy(body.angularVelocity);
            clone.sleepState = body.sleepState;
            clone.timeLastSleepy = body.timeLastSleepy;
            copy.world.addBody(clone);
            bodies.set(body, clone);
        }
        copy.world.time = this.world.time;
        copy.world.stepnumber = this.world.stepnumber;
        return { world: copy, bodies };
    }
}

const MAX_SUBSTEPS = 10;

function cloneShape(shape: Shape): Shape {
    let copy: Shape;
    if (shape instanceof ConvexPolyhedron) {
        copy = new ConvexPolyhedron({
            vertices: shape.vertices.map((vertex) => vertex.clone()),
            faces: shape.faces.map((face) => [...face]),
        });
    } else if (shape instanceof Sphere) {
        copy = new Sphere(shape.radius);
    } else {
        copy = new Plane();
    }
    copy.collisionFilterGroup = shape.collisionFilterGroup;
    copy.collisionFilterMask = shape.collisionFilterMask;
    return copy;
}
