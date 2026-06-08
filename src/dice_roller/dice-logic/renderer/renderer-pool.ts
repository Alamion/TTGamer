import { DiceRenderer, type DiceRendererConfig } from './renderer';
import type { DiceGeometryData } from './geometries';
import { debug } from '../../utils/logging';

let sharedRenderer: DiceRenderer | null = null;
let disposeTimeoutId: ReturnType<typeof setTimeout> | null = null;
const DISPOSE_DEBOUNCE_MS = 5 * 60 * 1000;

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
): {
    renderer: DiceRenderer;
    settle: Promise<number[]>;
    rethrow: (indices: number[]) => Promise<number[]>;
    addDice: (extraDiceData: DiceGeometryData[]) => Promise<number[]>;
    arrangeAndDismiss: () => void;
} {
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

    const settle = sharedRenderer.startRoll(diceData, groupSizes);

    return {
        renderer: sharedRenderer,
        settle,
        rethrow: (indices: number[]) => sharedRenderer!.rethrowDice(indices),
        addDice: (extraDiceData: DiceGeometryData[]) => sharedRenderer!.addDice(extraDiceData),
        arrangeAndDismiss: () => sharedRenderer!.arrangeAndDismiss(),
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
