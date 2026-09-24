import { Body, ContactMaterial, Material, NaiveBroadphase, Plane, Vec3, World } from 'cannon-es';

import type { DiceShape } from './shapes';

export class PhysicsWorld {
    world: World;
    diceMaterial: Material;
    deskMaterial: Material;
    barrierMaterial: Material;
    lastCallTime = 0;
    private barriers: Body[] = [];
    /** Half-extents of the area inside the barriers, at the table. */
    limits = { x: Infinity, y: Infinity };
    WIDTH!: number;
    HEIGHT!: number;

    constructor(WIDTH: number, HEIGHT: number) {
        this.WIDTH = WIDTH;
        this.HEIGHT = HEIGHT;
        // Use stronger gravity so dice hit the table quickly but stay in view
        this.world = new World({ gravity: new Vec3(0, 0, -1000) });
        this.world.broadphase = new NaiveBroadphase();
        this.world.allowSleep = true;

        this.diceMaterial = new Material('dice');
        this.deskMaterial = new Material('desk');
        this.barrierMaterial = new Material('barrier');

        this.buildWalls();
    }

    buildWalls(): void {
        this.world.addContactMaterial(
            new ContactMaterial(this.deskMaterial, this.diceMaterial, {
                friction: 0.01,
                restitution: 0.2,
                contactEquationRelaxation: 3,
                contactEquationStiffness: 1e8,
            })
        );
        this.world.addContactMaterial(
            new ContactMaterial(this.barrierMaterial, this.diceMaterial, {
                friction: 0.01,
                restitution: 0.6,
                contactEquationRelaxation: 3,
                contactEquationStiffness: 1e8,
            })
        );
        this.world.addContactMaterial(
            new ContactMaterial(this.diceMaterial, this.diceMaterial, {
                friction: 0.1,
                restitution: 0.5,
                contactEquationRelaxation: 3,
                contactEquationStiffness: 1e8,
            })
        );

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
    }

    /**
     * Advances the simulation by the wall time since the last call in fixed steps (at most
     * ten per call, so a long pause only moves the dice a sixth of a second) and returns the
     * simulated seconds, which drive every roll timing.
     */
    step(step = 1 / 60): number {
        const time = performance.now() / 1000;
        // world.time follows the wall clock; the step count is what was simulated.
        const before = this.world.stepnumber;
        if (!this.lastCallTime) {
            this.world.step(step);
        } else {
            this.world.step(step, time - this.lastCallTime);
        }
        this.lastCallTime = time;
        return (this.world.stepnumber - before) * step;
    }
}
