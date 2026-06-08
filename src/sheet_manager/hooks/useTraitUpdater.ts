import { useCharacterStore } from '../store/characterStore.ts';
import { DEFAULT_TRAIT_VALUE } from '../types/character.ts';
import type { TraitValue } from '../types/character.ts';

type TraitPath = 'attributes' | 'skills' | 'forceSkills' | 'virtues';

export function useTraitUpdater(path: TraitPath) {
    const { currentCharacter, updateCharacter } = useCharacterStore();

    const getTrait = (key: string): TraitValue => {
        if (!currentCharacter) return { ...DEFAULT_TRAIT_VALUE, value: 0 };
        const record = currentCharacter[path] as Record<string, TraitValue> | undefined;
        return record?.[key] ?? { ...DEFAULT_TRAIT_VALUE, value: 0 };
    };

    const updateTrait = (key: string, updates: Partial<TraitValue>) => {
        if (!currentCharacter) return;
        const current = getTrait(key);
        updateCharacter(currentCharacter.id, {
            [path]: {
                ...(currentCharacter[path] as Record<string, unknown>),
                [key]: { ...current, ...updates },
            },
        });
    };

    return { currentCharacter, updateCharacter, getTrait, updateTrait };
}
