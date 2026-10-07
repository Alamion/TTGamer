// @vitest-environment happy-dom

import {
    prepareDiceGeometries,
    releaseDiceGeometry,
} from '@site/src/dice_roller/dice-logic/renderer/factory';
import { DiceRenderer } from '@site/src/dice_roller/dice-logic/renderer/renderer';
import { SceneManager } from '@site/src/dice_roller/dice-logic/renderer/scene';
import {
    BufferGeometry,
    DirectionalLight,
    Material,
    type Mesh,
    type MeshPhongMaterial,
    Texture,
} from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { installDisplay } from './harness';

/** GPU resources of the 3D dice are freed exactly when nothing uses them any more. */

vi.mock('three', async (importOriginal) => ({
    ...(await importOriginal<typeof import('three')>()),
    WebGLRenderer: class {
        domElement = document.createElement('canvas');
        shadowMap = {};
        setSize() {}
        render() {}
        dispose() {}
    },
}));

vi.mock('@site/src/dice_roller/dice-logic/renderer/sound-manager', () => ({
    SoundManager: class {
        init = async () => {};
        onCollide() {}
        dispose() {}
        setEnabled() {}
        setVolume() {}
    },
}));

afterEach(() => {
    restores.splice(0).forEach((restore) => restore());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

const restores: (() => void)[] = [];

/** Records which instances of `type` had `dispose` called. */
function watchDisposals<T extends { dispose(): void }>(type: { prototype: T }): Set<T> {
    const proto = type.prototype;
    const original = proto.dispose;
    const disposed = new Set<T>();
    proto.dispose = function (this: T) {
        disposed.add(this);
        original.call(this);
    };
    restores.push(() => {
        proto.dispose = original;
    });
    return disposed;
}

const RENDERER_CONFIG = {
    diceColor: '#202020',
    textColor: '#ffffff',
    scaler: 1,
    enableSound: false,
};

let colorSeed = 0;
/** A die of a look no other test used, so each test starts with a fresh template. */
function newDie(sides = 6, diceColor = `#${(++colorSeed).toString(16).padStart(6, '0')}`) {
    const [die] = prepareDiceGeometries([{ sides, count: 1 } as never], { diceColor }).geometries;
    return die!.geometry as Mesh<BufferGeometry, MeshPhongMaterial>;
}

describe('dice templates', () => {
    it('frees a die’s own material but keeps the shared geometry and atlas while in use', () => {
        installDisplay(1);
        const geometries = watchDisposals(BufferGeometry);
        const textures = watchDisposals(Texture);
        const materials = watchDisposals(Material);
        const first = newDie(6, '#abcdef');
        const second = newDie(6, '#abcdef');
        expect(second.geometry).toBe(first.geometry);

        releaseDiceGeometry(first);
        releaseDiceGeometry(second);

        expect(materials.has(first.material)).toBe(true);
        expect(materials.has(second.material)).toBe(true);
        expect(geometries.has(first.geometry)).toBe(false);
        expect(textures.has(first.material.map!)).toBe(false);
    });

    it('frees an evicted template once its last die is released', () => {
        installDisplay(1);
        const geometries = watchDisposals(BufferGeometry);
        const textures = watchDisposals(Texture);
        const live = newDie();
        const atlas = live.material.map!;

        // 48 newer looks push the live die's template out of the cache.
        const evictedIdle = newDie();
        for (let i = 0; i < 48; i++) releaseDiceGeometry(newDie());
        expect(geometries.has(evictedIdle.geometry)).toBe(false);
        expect(geometries.has(live.geometry)).toBe(false);
        expect(textures.has(atlas)).toBe(false);

        releaseDiceGeometry(live);
        expect(geometries.has(live.geometry)).toBe(true);
        expect(textures.has(atlas)).toBe(true);
    });

    it('frees an evicted template right away when no die uses it', () => {
        installDisplay(1);
        const geometries = watchDisposals(BufferGeometry);
        const idle = newDie();
        releaseDiceGeometry(idle);
        for (let i = 0; i < 48; i++) releaseDiceGeometry(newDie());
        expect(geometries.has(idle.geometry)).toBe(true);
    });

    it('releases the dice of a roll when the renderer goes away', () => {
        installDisplay(1);
        const materials = watchDisposals(Material);
        const { geometries, groupSizes } = prepareDiceGeometries(
            [
                { sides: 6, count: 2 },
                { sides: 20, count: 1 },
            ] as never,
            { diceColor: '#123456' }
        );
        const renderer = new DiceRenderer(1920, 1080, RENDERER_CONFIG);
        renderer.startRoll(geometries, groupSizes);
        renderer.dispose();
        for (const { geometry } of geometries) {
            expect(materials.has(geometry.material as Material)).toBe(true);
            expect(geometry.parent).toBeNull();
        }
    });
});

describe('scene', () => {
    function scene() {
        const manager = new SceneManager();
        manager.initScene(1920, 1080);
        return manager;
    }

    it('frees the old light and its shadow map and the old desk on every resize', () => {
        const lights = watchDisposals(DirectionalLight);
        const geometries = watchDisposals(BufferGeometry);
        const manager = scene();
        const children = manager.scene.children.length;

        for (let i = 0; i < 5; i++) {
            const light = manager.directionalLight;
            const desk = manager.desk;
            manager.initScene(1280 + i, 720);
            expect(lights.has(light)).toBe(true);
            expect(geometries.has(desk.geometry)).toBe(true);
        }
        expect(manager.scene.children.length).toBe(children);
    });

    it('frees its light and desk when disposed', () => {
        const lights = watchDisposals(DirectionalLight);
        const geometries = watchDisposals(BufferGeometry);
        const manager = scene();
        const { directionalLight, desk } = manager;
        manager.dispose();
        expect(lights.has(directionalLight)).toBe(true);
        expect(geometries.has(desk.geometry)).toBe(true);
    });

    it('frees the scene of a disposed renderer', () => {
        installDisplay(1);
        const lights = watchDisposals(DirectionalLight);
        const renderer = new DiceRenderer(1920, 1080, RENDERER_CONFIG);
        const light = renderer['sceneManager'].directionalLight;
        renderer.dispose();
        expect(lights.has(light)).toBe(true);
    });
});
