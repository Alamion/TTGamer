import { useCallback } from 'react';
import { useCharacterStore } from '../store/characterStore';
import { useCharacterContext } from '../context/CharacterContext';
import type { BaseCharacter } from '../types/character';

export function useCharacter() {
    const { currentCharacter, updateCharacter: rawUpdate } = useCharacterStore();
    const { character: contextChar, readOnly } = useCharacterContext();

    const character = contextChar ?? currentCharacter;

    const updateCharacter = useCallback(
        (id: string, updates: Partial<BaseCharacter>) => {
            if (readOnly || !character) return;
            rawUpdate(id, updates);
        },
        [readOnly, character, rawUpdate]
    );

    return { character, readOnly, updateCharacter };
}
