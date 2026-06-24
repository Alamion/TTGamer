import { createContext, useContext } from 'react';
import type { BaseCharacter } from '../types/character';

interface CharacterContextValue {
    character: BaseCharacter | null;
    readOnly: boolean;
}

const CharacterContext = createContext<CharacterContextValue>({
    character: null,
    readOnly: false,
});

export function useCharacterContext() {
    return useContext(CharacterContext);
}

export { CharacterContext };
