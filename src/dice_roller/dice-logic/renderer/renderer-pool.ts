import { debug } from '@site/src/shared/utils/logging';

import type { DiceGeometryData } from './geometries';
import { DiceRenderer, type DiceRendererConfig } from './renderer';

let sharedRenderer: DiceRenderer | null = null;
let disposeTimeoutId: ReturnType<typeof setTimeout> | null = null;
const DISPOSE_DEBOUNCE_MS = 5 * 60 * 1000;

export interface PhysicsRollHandle {
    sessionId: number;
    settle: Promise<number[]>;
    lockDice: (indices: number[]) => void;
    rethrow: (indices: number[]) => Promise<number[]>;
    addDice: (extraDiceData: DiceGeometryData[]) => Promise<number[]>;
    arrangeAndDismiss: () => void;
    wasManuallyRerolled: () => boolean;
}

function createRenderer(config: DiceRendererConfig): DiceRenderer {
    debug('RendererPool: Creating shared renderer');
    return new DiceRenderer(window.innerWidth, window.innerHeight, config);
}

function scheduleDispose(): void {
    if (disposeTimeoutId) {
        clearTimeout(disposeTimeoutId);
    }
    disposeTimeoutId = setTimeout(() => {
        debug('RendererPool: No rolls started for 5 minutes, disposing renderer');
        disposeSharedRenderer();
    }, DISPOSE_DEBOUNCE_MS);
}

export function startPhysicsRoll(
    config: DiceRendererConfig,
    diceData: DiceGeometryData[],
    groupSizes: number[]
): PhysicsRollHandle {
    if (!sharedRenderer) {
        sharedRenderer = createRenderer(config);
    } else {
        sharedRenderer.setTimeToReact(config.timeToReact ?? false, config.timeToReactSeconds ?? 5);
        if (config.enableSound !== undefined) {
            sharedRenderer.soundManager.setEnabled(config.enableSound);
        }
        if (config.soundVolume !== undefined) {
            sharedRenderer.soundManager.setVolume(config.soundVolume);
        }
    }

    debug(`RendererPool: Starting physics roll with ${diceData.length} dice`);

    scheduleDispose();

    const { sessionId, settle } = sharedRenderer.startRoll(diceData, groupSizes);

    return {
        sessionId,
        settle,
        lockDice: (indices: number[]) => sharedRenderer!.lockDice(sessionId, indices),
        rethrow: (indices: number[]) => sharedRenderer!.rethrowDice(sessionId, indices),
        addDice: (extraDiceData: DiceGeometryData[]) =>
            sharedRenderer!.addDice(sessionId, extraDiceData),
        arrangeAndDismiss: () => sharedRenderer!.arrangeAndDismiss(sessionId),
        wasManuallyRerolled: () => sharedRenderer!.wasSessionManuallyRerolled(sessionId),
    };
}

export function updateSoundConfig(config: { enabled?: boolean; volume?: number }): void {
    if (!sharedRenderer) return;
    if (config.enabled !== undefined) {
        sharedRenderer.soundManager.setEnabled(config.enabled);
    }
    if (config.volume !== undefined) {
        sharedRenderer.soundManager.setVolume(config.volume);
    }
}

export function disposeSharedRenderer(): void {
    if (disposeTimeoutId) {
        clearTimeout(disposeTimeoutId);
        disposeTimeoutId = null;
    }
    if (sharedRenderer) {
        sharedRenderer.dispose();
        sharedRenderer = null;
    }
}
