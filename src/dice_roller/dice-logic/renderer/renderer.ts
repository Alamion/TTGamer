import { ResourceTracker } from './resource';
import { SceneManager } from './scene';
import { PhysicsWorld } from './physics';
import { DiceShape, createDiceShape } from './shapes';
import type { DiceGeometryData } from './geometries';
import { SoundManager } from './sound-manager';
import { debug } from '../../utils/logging';
import { MAX_ROLL_SECONDS, VELOCITY_THRESHOLD, FRAME_RATE } from '../../utils/constants';
import { RollCancelledError } from '../errors';
import { Raycaster, Vector2, type Mesh } from 'three';

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
    showFrames: number;
    fadeFrames: number;
    allStopped: boolean;
    isAnimating: boolean;
    tracker: ResourceTracker;
    startTime: number;
    cancelled: boolean;
    accepted: boolean;
}

export class DiceRenderer {
    private sceneManager: SceneManager;
    private physicsWorld: PhysicsWorld;
    private sessions: RollSession[] = [];
    private nextSessionId = 0;
    soundManager: SoundManager;

    private readonly frameRate = FRAME_RATE;
    private readonly velocityThreshold = VELOCITY_THRESHOLD;
    private maxRollSecs = MAX_ROLL_SECONDS;

    private container: HTMLDivElement;
    private animationId: number | null = null;
    private isRunning = false;

    private width: number;
    private height: number;

    private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    private boundResizeHandler: () => void;
    private config: DiceRendererConfig;

    private timeToReactEnabled: boolean;
    private timeToReactMs: number;

    private acceptBtn: HTMLButtonElement | null = null;
    private cancelBtn: HTMLButtonElement | null = null;

    private raycaster = new Raycaster();
    private mouse = new Vector2();
    private hoveredMesh: Mesh | null = null;
    private boundPointerDown: (e: PointerEvent) => void;
    private boundPointerMove: (e: PointerEvent) => void;

    setTimeToReact(enabled: boolean, seconds: number): void {
        this.timeToReactEnabled = enabled;
        this.timeToReactMs = seconds * 1000;
    }

    constructor(width: number, height: number, config: DiceRendererConfig) {
        this.config = config;
        this.timeToReactEnabled = config.timeToReact ?? false;
        this.timeToReactMs = (config.timeToReactSeconds ?? 5) * 1000;
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
        }

        this.width = width;
        this.height = height;

        this.boundResizeHandler = this.handleResize.bind(this);
        this.boundPointerDown = this.handlePointerDown.bind(this);
        this.boundPointerMove = this.handlePointerMove.bind(this);
        window.addEventListener('resize', this.boundResizeHandler);
        document.addEventListener('pointerdown', this.boundPointerDown);
        document.addEventListener('pointermove', this.boundPointerMove);
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
                }
            } else {
                this.physicsWorld = new PhysicsWorld(newW, newH);
                this.sceneManager.initScene(newW, newH);

                const camInfo = this.sceneManager.getCameraInfo();
                if (camInfo) {
                    this.physicsWorld.updateBarriers(camInfo.z, camInfo.fov, camInfo.aspect);
                }
            }
        }, 200);
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

    startRoll(diceData: DiceGeometryData[], groupSizes: number[]): Promise<number[]> {
        debug('DiceRenderer: Starting new roll session with', diceData.length, 'dice');

        this.showLoading();

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
        }

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
            showFrames: 60,
            fadeFrames: 60,
            allStopped: false,
            isAnimating: true,
            tracker,
            startTime: performance.now(),
            cancelled: false,
            accepted: false,
        };

        this.sessions.push(session);

        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }

        return settlePromise;
    }

    lockDice(flatIndices: number[]): void {
        const activeSession = this.sessions[this.sessions.length - 1];
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

    rethrowDice(flatIndices: number[]): Promise<number[]> {
        const activeSession = this.sessions[this.sessions.length - 1];
        if (!activeSession) {
            return Promise.reject(new Error('No active session'));
        }

        const rethrowCount = flatIndices.length;
        const rethrowSpread = Math.min(
            Math.sqrt(rethrowCount) * 50,
            Math.min(this.width, this.height) * 0.3
        );

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
            }
        }

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

        return settlePromise;
    }

    addDice(extraDiceData: DiceGeometryData[]): Promise<number[]> {
        const activeSession = this.sessions[this.sessions.length - 1];
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

        return settlePromise;
    }

    readFlatValues(): number[] {
        const activeSession = this.sessions[this.sessions.length - 1];
        if (!activeSession) return [];
        return activeSession.dice.map((d) => d.result);
    }

    arrangeAndDismiss(): void {
        const activeSession = this.sessions[this.sessions.length - 1];
        if (!activeSession) return;

        activeSession.phase = 'arranging';
    }

    acceptRoll(): void {
        const sessions = this.sessions.filter((s) => s.phase === 'physics' && !s.cancelled);
        for (const session of sessions) {
            if (!session) continue;

            session.accepted = true;
            this.hideLoading();

            for (const die of session.dice) {
                die.body.velocity.set(0, 0, 0);
                die.body.angularVelocity.set(0, 0, 0);
                die.body.updateMassProperties();
                die.stopped = true;
                die.staleIterations = 999;
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
            session.showFrames = 30;
        }
    }

    cancelRoll(): void {
        const sessions = this.sessions.filter((s) => s.phase === 'physics' && !s.cancelled);
        for (const session of sessions) {
            if (!session) continue;

            session.cancelled = true;
            this.hideLoading();

            if (session.settleReject) {
                session.settleReject(new RollCancelledError());
                session.settleResolve = null;
                session.settleReject = null;
            }

            this.completeSession(session);
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

        this.hideLoading();

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
                        session.showFrames--;
                        if (session.showFrames <= 0) {
                            session.phase = 'fading';
                        }
                    } else if (this.checkRollFinished(session)) {
                        session.allStopped = true;
                        this.resolveSettle(session);
                    }
                    break;

                case 'fading':
                    if (session.fadeFrames > 0) {
                        const progress = session.fadeFrames / 60;
                        const easeOut = 1 - Math.pow(1 - progress, 3);
                        for (const die of session.dice) {
                            die.setOpacity(easeOut);
                        }
                        session.fadeFrames--;
                    } else {
                        this.completeSession(session);
                        continue;
                    }
                    break;

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
            this.physicsWorld.step(this.frameRate);
            this.sceneManager.render();
            this.animationId = requestAnimationFrame(() => this.animate());
        } else {
            this.stopAnimationLoop();
        }
    }

    private checkRollFinished(session: RollSession): boolean {
        let allStoppedNow = true;

        const elapsed = performance.now() - session.startTime;
        if (this.timeToReactEnabled && elapsed < this.timeToReactMs && !session.accepted) {
            return false;
        }

        for (let i = 0; i < session.dice.length; i++) {
            const die = session.dice[i];

            if (session.lockedIndices.has(i)) {
                die.body.velocity.set(0, 0, 0);
                die.body.angularVelocity.set(0, 0, 0);
                continue;
            }

            if (session.currentIterations > this.maxRollSecs / this.frameRate) {
                debug(`Session ${session.id}: Animation timeout for die ${i}`);
                die.stopped = true;
                continue;
            }

            const a = die.body.angularVelocity;
            const v = die.body.velocity;

            if (a.length() < this.velocityThreshold && v.length() < this.velocityThreshold) {
                die.staleIterations++;
                if (session.iterations - die.staleIterations > 5) {
                    die.stopped = true;
                }
            } else {
                die.stopped = false;
                die.staleIterations = 0;
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

    private handlePointerDown(e: PointerEvent): void {
        const sessions = this.getActiveSessions();
        if (sessions.length === 0) return;

        const target = e.target as HTMLElement;
        if (target.closest('.ddr-loading-bar')) return;

        this.updateMouse(e);

        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        const allMeshes = sessions.flatMap((s) => s.dice.map((d) => d.geometry));
        const intersects = this.raycaster.intersectObjects(allMeshes, false);
        debug('PointerDown: intersections found:', intersects.length);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object as Mesh;
            const { session, flatIndex } = this.resolveHit(sessions, hitMesh);
            if (session !== null) {
                this.rerollDieInSession(session, flatIndex);
                debug('PointerDown: reroll triggered for die', flatIndex, 'in session', session.id);
            }
        }
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

        session.lockedIndices.delete(flatIndex);
        const die = session.dice[flatIndex];
        if (die) {
            const vel = this.generateRerollVelocity();
            die.body.velocity.set(vel.x, vel.y, vel.z);
            const angVel = this.generateRerollAngularVelocity();
            die.body.angularVelocity.set(angVel.x, angVel.y, angVel.z);
            die.body.wakeUp();
            die.stopped = false;
            die.staleIterations = 0;
        }

        session.allStopped = false;
        session.currentIterations = 0;
        session.startTime = performance.now();
    }

    dispose(): void {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        window.removeEventListener('resize', this.boundResizeHandler);
        document.removeEventListener('pointerdown', this.boundPointerDown);
        document.removeEventListener('pointermove', this.boundPointerMove);
        for (const session of this.sessions) {
            this.removeDiceFromScene(session.dice, session.tracker);
        }
        this.sessions = [];
        this.stopAnimationLoop();
        this.sceneManager.dispose();
        this.soundManager.dispose();
        this.container.remove();
    }
}
