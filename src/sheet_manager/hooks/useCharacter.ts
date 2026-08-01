import { useCallback, useEffect, useRef } from 'react';
import { useCharacterStore } from '../store/characterStore';
import { useCharacterContext } from '../context/CharacterContext';
import type { BaseCharacter } from '../types/character';

export function useCharacter() {
    const { currentCharacter, updateCharacter: rawUpdate } = useCharacterStore();
    const { character: contextChar, readOnly } = useCharacterContext();

    const character = contextChar ?? currentCharacter;

    const characterRef = useRef(character);
    const readOnlyRef = useRef(readOnly);

    useEffect(() => {
        characterRef.current = character;
        readOnlyRef.current = readOnly;
    }, [character, readOnly]);

    const updateCharacter = useCallback(
        (id: string, updates: Partial<BaseCharacter>) => {
            if (readOnlyRef.current || !characterRef.current) return;
            rawUpdate(id, updates);
        },
        [rawUpdate]
    );

    return { character, readOnly, updateCharacter };
}
