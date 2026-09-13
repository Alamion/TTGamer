// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const rendererCalls = vi.hoisted(() => ({
    addDice: vi.fn(),
    arrange: vi.fn(),
    dispose: vi.fn(),
    lock: vi.fn(),
    manual: vi.fn((...args: [number]) => {
        void args;
        return false;
    }),
    rethrow: vi.fn(async (...args: [number, number[]]) => {
        void args;
        return [] as number[];
    }),
    sessionId: 0,
}));

vi.mock('@site/src/dice_roller/dice-logic/renderer/renderer', () => ({
    DiceRenderer: class {
        soundManager = { setEnabled: vi.fn(), setVolume: vi.fn() };

        setTimeToReact(...args: [boolean, number]) {
            void args;
        }

        startRoll() {
            const sessionId = rendererCalls.sessionId++;
            return { sessionId, settle: Promise.resolve([sessionId]) };
        }

        lockDice(sessionId: number, indices: number[]) {
            rendererCalls.lock(sessionId, indices);
        }

        rethrowDice(sessionId: number, indices: number[]) {
            rendererCalls.rethrow(sessionId, indices);
            return Promise.resolve([]);
        }

        addDice(sessionId: number, geometries: unknown[]) {
            rendererCalls.addDice(sessionId, geometries);
            return Promise.resolve([]);
        }

        arrangeAndDismiss(sessionId: number) {
            rendererCalls.arrange(sessionId);
        }

        wasSessionManuallyRerolled(sessionId: number) {
            rendererCalls.manual(sessionId);
            return false;
        }

        dispose() {
            rendererCalls.dispose();
        }
    },
}));

import {
    disposeSharedRenderer,
    startPhysicsRoll,
} from '@site/src/dice_roller/dice-logic/renderer/renderer-pool';

const config = { diceColor: '#000', textColor: '#fff', scaler: 1 };

describe('shared renderer session handles', () => {
    beforeEach(() => {
        disposeSharedRenderer();
        rendererCalls.sessionId = 0;
        vi.clearAllMocks();
    });

    it('keeps operations bound to the roll that created each handle', async () => {
        const first = startPhysicsRoll(config, [{} as never], [1]);
        const second = startPhysicsRoll(config, [{} as never], [1]);

        first.lockDice([0]);
        await first.rethrow([0]);
        await second.addDice([{} as never]);
        first.arrangeAndDismiss();
        second.wasManuallyRerolled();

        expect(first.sessionId).toBe(0);
        expect(second.sessionId).toBe(1);
        expect(rendererCalls.lock).toHaveBeenCalledWith(0, [0]);
        expect(rendererCalls.rethrow).toHaveBeenCalledWith(0, [0]);
        expect(rendererCalls.addDice).toHaveBeenCalledWith(1, [{}]);
        expect(rendererCalls.arrange).toHaveBeenCalledWith(0);
        expect(rendererCalls.manual).toHaveBeenCalledWith(1);
    });
});
