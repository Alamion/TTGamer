import { mergeDiceNotation } from '@site/src/dice_roller/dice-logic/notation-utils';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import type { RollSource } from '@site/src/dice_roller/utils/rollReader';
import {
    pushStatLabel,
    setCharacterName,
    setRollSource,
} from '@site/src/dice_roller/utils/sessionStorage';
import { useCallback } from 'react';

interface SheetDiceContext {
    characterName?: string;
    statLabel?: string;
    /** The document the stat belongs to; lets the dice roller apply its system's reading. */
    rollSource?: RollSource;
}

export function useSheetDiceActions({ characterName, statLabel, rollSource }: SheetDiceContext) {
    const setNotationInput = useDiceRollerStore((state) => state.setNotationInput);
    const notationInput = useDiceRollerStore((state) => state.notationInput);
    const roll = useDiceRollerStore((state) => state.roll);
    const includeCharacterStats = useDiceRollerStore(
        (state) => state.settings.includeCharacterStats
    );

    const queueNotation = useCallback(
        (notation: string) => {
            if (includeCharacterStats && statLabel) pushStatLabel(statLabel);
            if (characterName) setCharacterName(characterName);
            if (rollSource) setRollSource(rollSource);
            setNotationInput(notationInput ? mergeDiceNotation(notationInput, notation) : notation);
        },
        [
            characterName,
            includeCharacterStats,
            notationInput,
            rollSource,
            setNotationInput,
            statLabel,
        ]
    );

    const rollImmediately = useCallback(
        (notation: string) =>
            roll(notation, {
                characterName: characterName || undefined,
                statLabels: includeCharacterStats && statLabel ? [statLabel] : undefined,
                origin: rollSource ? { kind: 'sheet', source: rollSource } : undefined,
            }),
        [characterName, includeCharacterStats, roll, rollSource, statLabel]
    );

    return { queueNotation, rollImmediately };
}
