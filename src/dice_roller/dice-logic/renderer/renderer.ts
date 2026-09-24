import { isDevelopment } from '@site/src/shared/utils/env';
import { debug } from '@site/src/shared/utils/logging';
import { BoxGeometry, type Material, Mesh, MeshBasicMaterial, Raycaster, Vector2 } from 'three';

import {
    ACCEPTED_SHOW_SECONDS,
    ANGULAR_VELOCITY_THRESHOLD,
    FADE_SECONDS,
    FRAME_RATE,
    MAX_ROLL_SECONDS,
    REST_SECONDS,
    SHOW_SECONDS,
    VELOCITY_THRESHOLD,
} from '../../utils/constants';
import { RollCancelledError } from '../errors';
import type { DiceGeometryData } from './geometries';
import { PhysicsWorld } from './physics';
import { ResourceTracker } from './resource';
import { SceneManager } from './scene';
import { createDiceShape, DiceShape } from './shapes';
import { SoundManager } from './sound-manager';
import { separateSpawns } from './spawn';

export interface DiceRendererConfig {
    diceColor: string;
    textColor: string;
    scaler: number;
    enableSound?: boolean;
    soundVolume?: number;
    timeToReact?: boolean;
    timeToReactSeconds?: number;
}

type SessionPhase =
    | 'physics'
    | 'exploding'
    | 'waiting_reroll'
    | 'arranging'
    | 'showing'
    | 'fading'
    | 'complete';

interface RollSession {
    id: number;
    dice: DiceShape[];
    phase: SessionPhase;
    groupSizes: number[];
    settleResolve: ((values: number[]) => void) | null;
    settleReject: ((err: Error) => void) | null;
    lockedIndices: Set<number>;
    iterations: number;
    currentIterations: number;
    /** Simulated seconds left in the showing and fading phases. */
    showLeft: number;
    fadeLeft: number;
    allStopped: boolean;
    isAnimating: boolean;
    tracker: ResourceTracker;
    /** Simulated time the current throw started at. */
    startedAt: number;
    cancelled: boolean;
    accepted: boolean;
    manuallyRerolled: boolean;
}

export interface StartedRollSession {
    sessionId: number;
    settle: Promise<number[]>;
}

export class DiceRenderer {
    private sceneManager: SceneManager;
    private physicsWorld: PhysicsWorld;
    private sessions: RollSession[] = [];
    private nextSessionId = 0;
    soundManager: SoundManager;

    private readonly frameRate = FRAME_RATE;
    /** Simulated seconds; advances only with physics steps, so it ignores the refresh rate. */
    private clock = 0;

    private container: HTMLDivElement;
    private animationId: number | null = null;
    private isRunning = false;

    private width: number;
    private height: number;

    private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    private boundResizeHandler: () => void;
    private config: DiceRendererConfig;

    private timeToReactEnabled: boolean;
    private timeToReactSeconds: number;

    private acceptBtn: HTMLButtonElement | null = null;
    private cancelBtn: HTMLButtonElement | null = null;

    private wallMeshes: Mesh[] = [];
    private raycaster = new Raycaster();
    private mouse = new Vector2();
    private hoveredMesh: Mesh | null = null;
    private hitDieAtPointerDown = false;
    private boundPointerDown: (e: PointerEvent) => void;
    private boundPointerMove: (e: PointerEvent) => void;
    private boundClickCapture: (e: MouseEvent) => void;

    setTimeToReact(enabled: boolean, seconds: number): void {
        this.timeToReactEnabled = enabled;
        this.timeToReactSeconds = seconds;
    }

    constructor(width: number, height: number, config: DiceRendererConfig) {
        this.config = config;
        this.timeToReactEnabled = config.timeToReact ?? false;
        this.timeToReactSeconds = config.timeToReactSeconds ?? 5;
        this.soundManager = new SoundManager({
            enabled: config.enableSound ?? true,
            volume: config.soundVolume ?? 80,
        });
        this.soundManager.init().catch(() => {});
        debug('DiceRenderer: Creating renderer with dimensions', width, height);
        this.container = document.createElement('div');
        this.container.className = 'ddr-dice-renderer-container';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: ${width}px;
            height: ${height}px;
            pointer-events: none;
            z-index: 9999;
        `;
        // Don't delete! Used for cam debugging
        // const isDevelopment = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== undefined;
        // if (isDevelopment) {
        //     this.container.style.cssText += `
        //         background-color: #333333CC;
        //     `;
        // }
        document.body.appendChild(this.container);

        this.sceneManager = new SceneManager();
        this.container.appendChild(this.sceneManager.renderer.domElement);

        this.physicsWorld = new PhysicsWorld(width, height);

        this.sceneManager.initScene(width, height);

        const camInfo = this.sceneManager.getCameraInfo();
        if (camInfo) {
            this.physicsWorld.updateBarriers(camInfo.z, camInfo.fov, camInfo.aspect);
            this.updateWallVisuals();
        }

        this.width = width;
        this.height = height;

        this.boundResizeHandler = this.handleResize.bind(this);
        this.boundPointerDown = this.handlePointerDown.bind(this);
        this.boundPointerMove = this.handlePointerMove.bind(this);
        this.boundClickCapture = this.handleClickCapture.bind(this);
        window.addEventListener('resize', this.boundResizeHandler);
        document.addEventListener('pointerdown', this.boundPointerDown, { capture: true });
        document.addEventListener('click', this.boundClickCapture, { capture: true });
        document.addEventListener('pointermove', this.boundPointerMove);
    }

    private updateWallVisuals(): void {
        for (const mesh of this.wallMeshes) {
            this.sceneManager.remove(mesh);
            mesh.geometry.dispose();
            (mesh.material as Material).dispose();
        }
        this.wallMeshes = [];

        if (!isDevelopment()) return;

        const camInfo = this.sceneManager.getCameraInfo();
        if (!camInfo) return;

        const fovRad = (camInfo.fov * Math.PI) / 180;
        const visibleHeight = 2 * camInfo.z * Math.tan(fovRad / 2);
        const visibleWidth = visibleHeight * camInfo.aspect;

        const limitX = (visibleWidth / 2) * 0.9;
        const limitY = (visibleHeight / 2) * 0.9;

        const wallMat = new MeshBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.15,
            depthWrite: false,
        });

        const wallZ = 250;
        const wallDepth = 600;

        const walls = [
            { size: [visibleWidth, 2, wallDepth] as const, pos: [0, limitY, wallZ] },
            { size: [visibleWidth, 2, wallDepth] as const, pos: [0, -limitY, wallZ] },
            { size: [2, visibleHeight, wallDepth] as const, pos: [limitX, 0, wallZ] },
            { size: [2, visibleHeight, wallDepth] as const, pos: [-limitX, 0, wallZ] },
        ];

        for (const { size, pos } of walls) {
            const geo = new BoxGeometry(...size);
            const mesh = new Mesh(geo, wallMat);
            mesh.position.set(pos[0], pos[1], pos[2]);
            this.sceneManager.add(mesh);
            this.wallMeshes.push(mesh);
        }
    }

    private handleResize(): void {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
            const newW = window.innerWidth;
            const newH = window.innerHeight;
            this.width = newW;
            this.height = newH;
            this.container.style.width = `${newW}px`;
            this.container.style.height = `${newH}px`;

            const hasActiveSessions = this.sessions.some((s) => s.isAnimating);

            if (hasActiveSessions) {
                // Don't destroy physics/scene while dice are active — just update dimensions
                this.sceneManager.setDimensions(newW, newH);
                this.sceneManager.initCamera();
                this.sceneManager.initLighting();
                const camInfo = this.sceneManager.getCameraInfo();
                if (camInfo) {
                    this.physicsWorld.updateBarriers(camInfo.z, camInfo.fov, camInfo.aspect);
                    this.updateWallVisuals();
                }
            } else {
                this.physicsWorld = new PhysicsWorld(newW, newH);
                this.sceneManager.initScene(newW, newH);

                const camInfo = this.sceneManager.getCameraInfo();
                if (camInfo) {
                    this.physicsWorld.updateBarriers(camInfo.z, camInfo.fov, camInfo.aspect);
                    this.updateWallVisuals();
                }
            }
        }, 200);
    }

    /** Every die of every session that is still being thrown or settling. */
    private airborneBodies(): DiceShape['body'][] {
        return this.sessions
            .filter((session) => session.isAnimating)
            .flatMap((session) => session.dice.map((die) => die.body));
    }

    private addDiceToScene(diceShapes: DiceShape[], tracker: ResourceTracker): void {
        for (const shape of diceShapes) {
            tracker.track(shape.geometry);
            this.sceneManager.add(shape.geometry);
            this.physicsWorld.add(shape);
            shape.body.addEventListener('collide', (event: unknown) => {
                this.soundManager.onCollide(event as Parameters<SoundManager['onCollide']>[0]);
            });
        }
    }

    private removeDiceFromScene(diceShapes: DiceShape[], tracker: ResourceTracker): void {
        for (const shape of diceShapes) {
            this.sceneManager.remove(shape.geometry);
            this.physicsWorld.remove(shape);
        }
        tracker.dispose();
    }

    private getRandomVector(): { x: number; y: number } {
        return {
            x: ((Math.random() * 2 - 1) * this.sceneManager.WIDTH) / 2,
            y: (-(Math.random() * 2 - 1) * this.sceneManager.HEIGHT) / 2,
        };
    }

    private showLoading(): void {
        if (this.container.querySelector('.ddr-loading-bar')) return;

        const bar = document.createElement('div');
        bar.className = 'ddr-loading-bar';
        bar.style.setProperty('--ddr-loader-color', this.config.diceColor);

        const spinner = document.createElement('div');
        spinner.className = 'ddr-loading';
        bar.appendChild(spinner);

        this.acceptBtn = document.createElement('button');
        this.acceptBtn.className = 'ddr-loading-btn ddr-accept-btn';
        this.acceptBtn.title = 'Accept roll';
        this.acceptBtn.textContent = '✓';
        bar.appendChild(this.acceptBtn);

        this.cancelBtn = document.createElement('button');
        this.cancelBtn.className = 'ddr-loading-btn ddr-cancel-btn';
        this.cancelBtn.title = 'Cancel roll';
        this.cancelBtn.textContent = '✗';
        bar.appendChild(this.cancelBtn);

        this.container.appendChild(bar);

        this.acceptBtn.addEventListener('click', () => this.acceptRoll());
        this.cancelBtn.addEventListener('click', () => this.cancelRoll());
    }

    private hideLoading(): void {
        const el = this.container.querySelector('.ddr-loading-bar');
        if (el) el.remove();
        this.acceptBtn = null;
        this.cancelBtn = null;
    }

    startRoll(diceData: DiceGeometryData[], groupSizes: number[]): StartedRollSession {
        debug('DiceRenderer: Starting new roll session with', diceData.length, 'dice');

        const sessionId = this.nextSessionId++;
        const vector = this.getRandomVector();
        const diceShapes: DiceShape[] = [];
        const totalDice = diceData.length;
        const spreadRadius = Math.min(
            Math.sqrt(totalDice) * 50,
            Math.min(this.width, this.height) * 0.3
        );

        for (let i = 0; i < totalDice; i++) {
            const data = diceData[i];
            const sides = data.values.length;
            const perDieVector = {
                x: vector.x + (Math.random() - 0.5) * spreadRadius,
                y: vector.y + (Math.random() - 0.5) * spreadRadius,
            };
            const dice = createDiceShape(sides, this.width, this.height, data, perDieVector);
            dice.geometry.userData.flatIndex = i;
            diceShapes.push(dice);
        }

        this.sceneManager.initCamera(diceData.length);

        const camInfo = this.sceneManager.getCameraInfo();
        if (camInfo) {
            this.physicsWorld.updateBarriers(camInfo.z, camInfo.fov, camInfo.aspect);
            this.updateWallVisuals();
        }

        separateSpawns(
            diceShapes.map((die) => die.body),
            this.airborneBodies(),
            this.physicsWorld.limits
        );
        const tracker = new ResourceTracker();
        this.addDiceToScene(diceShapes, tracker);

        let settleResolve: ((values: number[]) => void) | null = null;
        let settleReject: ((err: Error) => void) | null = null;
        const settlePromise = new Promise<number[]>((resolve, reject) => {
            settleResolve = resolve;
            settleReject = reject;
        });

        const session: RollSession = {
            id: sessionId,
            dice: diceShapes,
            phase: 'physics',
            groupSizes,
            settleResolve,
            settleReject,
            lockedIndices: new Set(),
            iterations: 0,
            currentIterations: 0,
            showLeft: SHOW_SECONDS,
            fadeLeft: FADE_SECONDS,
            allStopped: false,
            isAnimating: true,
            tracker,
            startedAt: this.clock,
            cancelled: false,
            accepted: false,
            manuallyRerolled: false,
        };

        this.sessions.push(session);
        this.showLoading();

        if (!this.isRunning) {
            this.isRunning = true;
            this.physicsWorld.resetClock();
            this.animationId = requestAnimationFrame(() => this.animate());
        }

        return { sessionId, settle: settlePromise };
    }

    private getSession(sessionId: number): RollSession | undefined {
        return this.sessions.find((session) => session.id === sessionId);
    }

    lockDice(sessionId: number, flatIndices: number[]): void {
        const activeSession = this.getSession(sessionId);
        if (!activeSession) return;
        for (const idx of flatIndices) {
            activeSession.lockedIndices.add(idx);
            const die = activeSession.dice[idx];
            if (die) {
                die.body.velocity.set(0, 0, 0);
                die.body.angularVelocity.set(0, 0, 0);
                die.body.updateMassProperties();
            }
        }
    }

    rethrowDice(sessionId: number, flatIndices: number[]): Promise<number[]> {
        const activeSession = this.getSession(sessionId);
        if (!activeSession) {
            return Promise.reject(new Error('No active session'));
        }

        const rethrowCount = flatIndices.length;
        const rethrowSpread = Math.min(
            Math.sqrt(rethrowCount) * 50,
            Math.min(this.width, this.height) * 0.3
        );

        const rethrown: DiceShape[] = [];
        for (const idx of flatIndices) {
            activeSession.lockedIndices.delete(idx);
            const die = activeSession.dice[idx];
            if (die) {
                const vector = this.getRandomVector();
                const perDieVector = {
                    x: vector.x + (Math.random() - 0.5) * rethrowSpread,
                    y: vector.y + (Math.random() - 0.5) * rethrowSpread,
                };
                die.recreate(perDieVector, this.width, this.height);
                rethrown.push(die);
            }
        }
        const rethrownBodies = new Set(rethrown.map((die) => die.body));
        separateSpawns(
            [...rethrownBodies],
            this.airborneBodies().filter((body) => !rethrownBodies.has(body)),
            this.physicsWorld.limits
        );

        let settleResolve: ((values: number[]) => void) | null = null;
        let settleReject: ((err: Error) => void) | null = null;
        const settlePromise = new Promise<number[]>((resolve, reject) => {
            settleResolve = resolve;
            settleReject = reject;
        });

        activeSession.settleResolve = settleResolve;
        activeSession.settleReject = settleReject;
        activeSession.phase = 'waiting_reroll';
        activeSession.allStopped = false;
        activeSession.currentIterations = 0;
        activeSession.startedAt = this.clock;

        return settlePromise;
    }

    addDice(sessionId: number, extraDiceData: DiceGeometryData[]): Promise<number[]> {
        const activeSession = this.getSession(sessionId);
        if (!activeSession) {
            return Promise.reject(new Error('No active session'));
        }

        const startIndex = activeSession.dice.length;
        const vector = this.getRandomVector();
        const newDice: DiceShape[] = [];
        const newCount = extraDiceData.length;
        const addSpread = Math.min(
            Math.sqrt(newCount) * 50,
            Math.min(this.width, this.height) * 0.3
        );

        for (let i = 0; i < newCount; i++) {
            const data = extraDiceData[i];
            const sides = data.values.length;
            const perDieVector = {
                x: vector.x + (Math.random() - 0.5) * addSpread,
                y: vector.y + (Math.random() - 0.5) * addSpread,
            };
            const dice = createDiceShape(sides, this.width, this.height, data, perDieVector);
            newDice.push(dice);
        }

        separateSpawns(
            newDice.map((die) => die.body),
            this.airborneBodies(),
            this.physicsWorld.limits
        );
        this.addDiceToScene(newDice, activeSession.tracker);
        activeSession.dice.push(...newDice);

        let settleResolve: ((values: number[]) => void) | null = null;
        let settleReject: ((err: Error) => void) | null = null;
        const settlePromise = new Promise<number[]>((resolve, reject) => {
            settleResolve = (values) => resolve(values.slice(startIndex));
            settleReject = reject;
        });

        activeSession.settleResolve = settleResolve;
        activeSession.settleReject = settleReject;
        activeSession.phase = 'exploding';
        activeSession.allStopped = false;
        activeSession.currentIterations = 0;
        activeSession.startedAt = this.clock;

        return settlePromise;
    }

    readFlatValues(sessionId: number): number[] {
        const activeSession = this.getSession(sessionId);
        if (!activeSession) return [];
        return activeSession.dice.map((d) => d.result);
    }

    arrangeAndDismiss(sessionId: number): void {
        const activeSession = this.getSession(sessionId);
        if (!activeSession) return;

        activeSession.phase = 'arranging';
    }

    wasSessionManuallyRerolled(sessionId: number): boolean {
        return this.getSession(sessionId)?.manuallyRerolled ?? false;
    }

    private getLatestPhysicsSession(): RollSession | undefined {
        for (let index = this.sessions.length - 1; index >= 0; index--) {
            const session = this.sessions[index];
            if (session.phase === 'physics' && !session.cancelled) return session;
        }
        return undefined;
    }

    acceptRoll(sessionId?: number): void {
        const session =
            sessionId === undefined ? this.getLatestPhysicsSession() : this.getSession(sessionId);
        if (!session || session.phase !== 'physics' || session.cancelled) return;

        session.accepted = true;

        for (const die of session.dice) {
            die.body.velocity.set(0, 0, 0);
            die.body.angularVelocity.set(0, 0, 0);
            die.body.updateMassProperties();
            die.stopped = true;
        }
        session.allStopped = true;
        session.currentIterations = 0;

        const values = session.dice.map((d) => d.result);
        if (session.settleResolve) {
            session.settleResolve(values);
            session.settleResolve = null;
            session.settleReject = null;
        }

        session.phase = 'showing';
        session.showLeft = ACCEPTED_SHOW_SECONDS;
        this.syncLoading();
    }

    cancelRoll(sessionId?: number): void {
        const session =
            sessionId === undefined ? this.getLatestPhysicsSession() : this.getSession(sessionId);
        if (!session || session.phase !== 'physics' || session.cancelled) return;

        session.cancelled = true;

        if (session.settleReject) {
            session.settleReject(new RollCancelledError());
            session.settleResolve = null;
            session.settleReject = null;
        }

        this.completeSession(session);
    }

    private syncLoading(): void {
        if (this.getLatestPhysicsSession()) {
            this.showLoading();
        } else {
            this.hideLoading();
        }
    }

    private resolveSettle(session: RollSession): void {
        const values = session.dice.map((d) => d.result);
        if (session.settleResolve) {
            session.settleResolve(values);
            session.settleResolve = null;
            session.settleReject = null;
        }
    }

    private completeSession(session: RollSession): void {
        debug(
            `DiceRenderer: Completing session ${session.id} after ${session.iterations} iterations`
        );

        session.isAnimating = false;

        const results = session.dice.map((d) => d.result);

        if (session.settleResolve) {
            session.settleResolve(results);
            session.settleResolve = null;
            session.settleReject = null;
        }

        this.removeDiceFromScene(session.dice, session.tracker);

        this.sceneManager.render();

        this.sessions = this.sessions.filter((s) => s.id !== session.id);
        this.syncLoading();

        if (this.sessions.length === 0) {
            this.stopAnimationLoop();
        }
    }

    private stopAnimationLoop(): void {
        this.isRunning = false;
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    private animate(): void {
        if (!this.isRunning) return;

        const dt = this.physicsWorld.step(this.frameRate);
        this.clock += dt;

        for (const session of this.sessions) {
            if (!session.isAnimating) continue;

            switch (session.phase) {
                case 'physics':
                case 'exploding':
                case 'waiting_reroll':
                    if (this.checkRollFinished(session)) {
                        session.allStopped = true;
                        this.resolveSettle(session);
                        session.phase = session.phase === 'physics' ? 'showing' : 'arranging';
                    }
                    break;

                case 'arranging':
                    this.resolveSettle(session);
                    session.phase = 'showing';
                    break;

                case 'showing':
                    if (session.allStopped) {
                        session.showLeft -= dt;
                        if (session.showLeft <= 0) {
                            session.fadeLeft += session.showLeft;
                            session.phase = 'fading';
                        }
                    } else if (this.checkRollFinished(session)) {
                        session.allStopped = true;
                        this.resolveSettle(session);
                    }
                    break;

                case 'fading': {
                    session.fadeLeft -= dt;
                    if (session.fadeLeft <= 0) {
                        this.completeSession(session);
                        continue;
                    }
                    const progress = session.fadeLeft / FADE_SECONDS;
                    const easeOut = 1 - Math.pow(1 - progress, 3);
                    for (const die of session.dice) {
                        die.setOpacity(easeOut);
                    }
                    break;
                }

                case 'complete':
                    this.completeSession(session);
                    continue;
            }

            session.iterations++;
            session.currentIterations++;

            for (const die of session.dice) {
                die.set();
            }
        }

        if (this.sessions.length > 0) {
            this.sceneManager.render();
            this.animationId = requestAnimationFrame(() => this.animate());
        } else {
            this.stopAnimationLoop();
        }
    }

    /**
     * A throw is finished when every die has stayed still — slower than the linear threshold
     * and tipping slower than the angular one — for REST_SECONDS of simulated time, or after
     * MAX_ROLL_SECONDS.
     * Simulated time does not run ahead of the dice when frames are late or a tab was hidden.
     */
    private checkRollFinished(session: RollSession): boolean {
        let allStoppedNow = true;

        const elapsed = this.clock - session.startedAt;
        if (this.timeToReactEnabled && elapsed < this.timeToReactSeconds && !session.accepted) {
            return false;
        }

        for (let i = 0; i < session.dice.length; i++) {
            const die = session.dice[i];

            if (session.lockedIndices.has(i)) {
                die.body.velocity.set(0, 0, 0);
                die.body.angularVelocity.set(0, 0, 0);
                continue;
            }

            if (elapsed > MAX_ROLL_SECONDS) {
                debug(`Session ${session.id}: Animation timeout for die ${i}`);
                die.stopped = true;
                continue;
            }

            // Spin about the vertical axis cannot change the face that is up.
            const { x: tipX, y: tipY } = die.body.angularVelocity;
            const still =
                die.body.velocity.length() < VELOCITY_THRESHOLD &&
                Math.hypot(tipX, tipY) < ANGULAR_VELOCITY_THRESHOLD;

            if (!still) {
                die.stopped = false;
                die.restingSince = null;
            } else if (die.restingSince === null) {
                die.restingSince = this.clock;
            } else if (this.clock - die.restingSince >= REST_SECONDS) {
                die.stopped = true;
            }

            if (!die.stopped) {
                allStoppedNow = false;
            }
        }

        return allStoppedNow;
    }

    private getActiveSessions(): RollSession[] {
        return this.sessions.filter((s) => s.phase === 'physics');
    }

    private resolveHit(
        sessions: RollSession[],
        mesh: Mesh
    ): { session: RollSession | null; flatIndex: number } {
        for (const session of sessions) {
            for (let i = 0; i < session.dice.length; i++) {
                if (session.dice[i].geometry === mesh) {
                    return { session, flatIndex: i };
                }
            }
        }
        return { session: null, flatIndex: -1 };
    }

    private getHitDieIntersection(
        sessions: RollSession[]
    ): { mesh: Mesh; session: RollSession; flatIndex: number } | null {
        const allMeshes = sessions.flatMap((s) => s.dice.map((d) => d.geometry));
        const intersects = this.raycaster.intersectObjects(allMeshes, false);
        if (intersects.length === 0) return null;
        const hitMesh = intersects[0].object as Mesh;
        const { session, flatIndex } = this.resolveHit(sessions, hitMesh);
        if (session === null) return null;
        return { mesh: hitMesh, session, flatIndex };
    }

    private handlePointerDown(e: PointerEvent): void {
        this.hitDieAtPointerDown = false;

        const sessions = this.getActiveSessions();
        if (sessions.length === 0) return;

        const target = e.target as HTMLElement;
        if (target.closest('.ddr-loading-bar')) return;

        this.updateMouse(e);
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        const hit = this.getHitDieIntersection(sessions);
        if (hit !== null) {
            this.hitDieAtPointerDown = true;
            this.rerollDieInSession(hit.session, hit.flatIndex);
            debug(
                'PointerDown: reroll triggered for die',
                hit.flatIndex,
                'in session',
                hit.session.id
            );
            e.stopPropagation();
            e.preventDefault();
        }
    }

    private handleClickCapture(e: MouseEvent): void {
        if (!this.hitDieAtPointerDown) return;
        this.hitDieAtPointerDown = false;
        e.stopPropagation();
        e.preventDefault();
    }

    private handlePointerMove(e: PointerEvent): void {
        const sessions = this.getActiveSessions();
        if (sessions.length === 0) {
            this.clearHover();
            return;
        }

        const target = e.target as HTMLElement;
        if (target.closest('.ddr-loading-bar')) {
            this.clearHover();
            return;
        }

        this.updateMouse(e);

        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        const allMeshes = sessions.flatMap((s) => s.dice.map((d) => d.geometry));
        const intersects = this.raycaster.intersectObjects(allMeshes, false);

        if (intersects.length > 0) {
            document.body.style.cursor = 'pointer';
            const hitMesh = intersects[0].object as Mesh;
            if (hitMesh !== this.hoveredMesh) {
                this.clearHover();
                const { session, flatIndex } = this.resolveHit(sessions, hitMesh);
                if (session !== null) {
                    this.setDieHighlight(session, flatIndex, true);
                    this.hoveredMesh = hitMesh;
                }
            }
        } else {
            this.clearHover();
        }
    }

    private updateMouse(e: PointerEvent): void {
        const canvas = this.sceneManager.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    private clearHover(): void {
        if (this.hoveredMesh) {
            const sessions = this.getActiveSessions();
            const { session, flatIndex } = this.resolveHit(sessions, this.hoveredMesh as Mesh);
            if (session !== null) {
                this.setDieHighlight(session, flatIndex, false);
            }
            this.hoveredMesh = null;
        }
        document.body.style.cursor = '';
    }

    private setDieHighlight(session: RollSession, index: number, highlight: boolean): void {
        const die = session.dice[index];
        if (!die) return;

        const materials = Array.isArray(die.geometry.material)
            ? die.geometry.material
            : [die.geometry.material];

        for (const mat of materials) {
            if (mat && 'emissive' in mat) {
                (mat as { emissive: { setHex: (hex: number) => void } }).emissive.setHex(
                    highlight ? 0x333333 : 0x000000
                );
            }
        }
    }

    private generateRerollVelocity(): { x: number; y: number; z: number } {
        const angle = Math.random() * Math.PI * 2;
        const deviation = (Math.random() - 0.5) * Math.PI * 0.5;
        const finalAngle = angle + deviation;
        const speed = 400 + Math.random() * 1000;
        return {
            x: Math.cos(finalAngle) * speed,
            y: Math.sin(finalAngle) * speed,
            z: 100 + Math.random() * 500,
        };
    }

    private generateRerollAngularVelocity(): { x: number; y: number; z: number } {
        return {
            x: (Math.random() - 0.5) * 20,
            y: (Math.random() - 0.5) * 20,
            z: (Math.random() - 0.5) * 12,
        };
    }

    private rerollDieInSession(session: RollSession, flatIndex: number): void {
        this.clearHover();
        session.manuallyRerolled = true;

        session.lockedIndices.delete(flatIndex);
        const die = session.dice[flatIndex];
        if (die) {
            const vel = this.generateRerollVelocity();
            die.body.velocity.set(vel.x, vel.y, vel.z);
            const angVel = this.generateRerollAngularVelocity();
            die.body.angularVelocity.set(angVel.x, angVel.y, angVel.z);
            die.body.wakeUp();
            die.stopped = false;
            die.restingSince = null;
        }

        session.allStopped = false;
        session.currentIterations = 0;
        session.startedAt = this.clock;
    }

    dispose(): void {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        window.removeEventListener('resize', this.boundResizeHandler);
        document.removeEventListener('pointerdown', this.boundPointerDown, { capture: true });
        document.removeEventListener('click', this.boundClickCapture, { capture: true });
        document.removeEventListener('pointermove', this.boundPointerMove);
        for (const session of this.sessions) {
            this.removeDiceFromScene(session.dice, session.tracker);
        }
        this.sessions = [];

        for (const mesh of this.wallMeshes) {
            this.sceneManager.remove(mesh);
            mesh.geometry.dispose();
            (mesh.material as Material).dispose();
        }
        this.wallMeshes = [];

        this.stopAnimationLoop();
        this.sceneManager.dispose();
        this.soundManager.dispose();
        this.container.remove();
    }
}
