import type { TraitValue } from '../types/character';
import { DEFAULT_ATTRIBUTE_VALUE } from '../types/character';
import { useCharacter } from './useCharacter';

type TraitPath = 'attributes' | 'skills' | 'forceSkills' | 'virtues';

export function useTraitUpdater(path: TraitPath) {
    const { character: currentCharacter, updateCharacter } = useCharacter();

    const getTrait = (key: string): TraitValue => {
        if (!currentCharacter) return { ...DEFAULT_ATTRIBUTE_VALUE, value: 0 };
        const record = currentCharacter[path] as Record<string, TraitValue> | undefined;
        return record?.[key] ?? { ...DEFAULT_ATTRIBUTE_VALUE, value: 0 };
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
