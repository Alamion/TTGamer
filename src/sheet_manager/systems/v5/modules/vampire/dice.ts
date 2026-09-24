import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { DiceOutcome } from '../../../types';
import { type V5DiceLine, v5Outcome } from '../../ruleset/dice';

const messages = uiMessages.sheet.v5.dice.hunger;

/**
 * Hunger dice (VtM 5e). Only the dice line exists so far; the vampire sheet arrives with
 * T-039 and then lists its definition here.
 */
export const hungerDiceLine: V5DiceLine = {
    id: 'hunger',
    label: messages.line,
    definitionIds: [],
    outcomes: ({ specialFaces, critical, succeeded }) => {
        const outcomes: DiceOutcome[] = [];
        if (critical && specialFaces.includes(10) && succeeded !== false) {
            outcomes.push(
                v5Outcome(
                    'messy-critical',
                    {
                        known: messages.messyCritical,
                        conditional: messages.messyCriticalConditional,
                    },
                    messages.messyCriticalDetail,
                    succeeded === null
                )
            );
        }
        if (specialFaces.includes(1) && succeeded !== true) {
            outcomes.push(
                v5Outcome(
                    'bestial-failure',
                    {
                        known: messages.bestialFailure,
                        conditional: messages.bestialFailureConditional,
                    },
                    messages.bestialFailureDetail,
                    succeeded === null
                )
            );
        }
        return outcomes;
    },
};
