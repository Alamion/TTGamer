import { debug, error, warn } from '@site/src/shared/utils/logging';

import { notifyRollResult } from '../dice-logic/dice-roller';
import { RollCancelledError } from '../dice-logic/errors';
import { execute2DRoll, executeUnifiedRoll } from '../dice-logic/roll-orchestrator';
import type { RollResult } from '../dice-logic/types';

export interface DiceRollEventPayload {
    notation: string;
    quiet?: boolean;
}

export interface RollOptions {
    statLabels?: string[];
    characterName?: string;
}

export async function handleRollEvent(
    notation: string,
    config?: {
        enable3dDice?: boolean;
        diceColor?: string;
        textColor?: string;
        enableSound?: boolean;
        soundVolume?: number;
        timeToReact?: boolean;
        timeToReactSeconds?: number;
    },
    rollOptions?: RollOptions
): Promise<RollResult | null> {
    if (!notation) {
        warn('Roll event received without notation', 'Event Handler');
        return null;
    }

    debug('Processing roll event for notation:', notation);

    try {
        const result =
            config?.enable3dDice !== false
                ? await executeUnifiedRoll(notation, config)
                : execute2DRoll(notation);

        if (result) {
            if (rollOptions?.statLabels && rollOptions.statLabels.length > 0) {
                result.statLabels = rollOptions.statLabels;
            }
            if (rollOptions?.characterName) {
                result.characterName = rollOptions.characterName;
            }
            notifyRollResult(result);
        }
        return result;
    } catch (err) {
        if (err instanceof RollCancelledError) {
            throw err;
        }
        error(err as string, 'Event Handler', [err]);
        return null;
    }
}

export async function triggerRoll(notation: string): Promise<RollResult | null> {
    return handleRollEvent(notation);
}
