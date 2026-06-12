import { debug, error, warn } from '@site/src/shared/utils/logging';
import { executeUnifiedRoll, execute2DRoll, RollCancelledError } from '../dice-logic';
import type { RollResult } from '../dice-logic';
import { notifyRollResult } from '../dice-logic';

export interface DiceRollEventPayload {
    notation: string;
    quiet?: boolean;
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
    }
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
