import { createContext, useContext } from 'react';

import type { CharacterView } from '../systems/capabilities';

interface CharacterContextValue {
    character: CharacterView | null;
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
