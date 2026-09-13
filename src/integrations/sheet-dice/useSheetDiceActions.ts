import { mergeDiceNotation } from '@site/src/dice_roller/dice-logic/notation-utils';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { pushStatLabel, setCharacterName } from '@site/src/dice_roller/utils/sessionStorage';
import { useCallback } from 'react';

interface SheetDiceContext {
    characterName?: string;
    statLabel?: string;
}

export function useSheetDiceActions({ characterName, statLabel }: SheetDiceContext) {
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
            setNotationInput(notationInput ? mergeDiceNotation(notationInput, notation) : notation);
        },
        [characterName, includeCharacterStats, notationInput, setNotationInput, statLabel]
    );

    const rollImmediately = useCallback(
        (notation: string) =>
            roll(notation, {
                characterName: characterName || undefined,
                statLabels: includeCharacterStats && statLabel ? [statLabel] : undefined,
            }),
        [characterName, includeCharacterStats, roll, statLabel]
    );

    return { queueNotation, rollImmediately };
}
