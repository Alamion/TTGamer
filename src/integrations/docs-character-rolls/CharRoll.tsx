import { InlineRoll } from '@site/src/dice_roller/components/InlineRoll';
import { useCharacterStore } from '@site/src/sheet_manager/store/characterStore';
import type { BaseCharacter } from '@site/src/sheet_manager/types/character';
import type { ReactNode } from 'react';

function resolveCharValue(character: BaseCharacter, path: string): number {
    let current: unknown = character;
    for (const part of path.split('.')) {
        if (current == null || typeof current !== 'object') return 0;
        current = (current as Record<string, unknown>)[part];
    }
    if (current != null && typeof current === 'object' && 'value' in current) {
        return (current as { value: number }).value;
    }
    return typeof current === 'number' ? current : 0;
}

export function CharRoll({
    attr,
    skill,
    params,
    ...props
}: {
    attr?: string;
    skill?: string;
    params?: string[];
    variant?: 'simple' | 'details' | 'formatted' | 'full';
    multiline?: boolean;
    showForced?: boolean;
    preroll?: boolean;
    animationTime?: number;
}): ReactNode {
    const character = useCharacterStore((state) => state.currentCharacter);
    if (!character) return null;

    const attributeValue = attr ? (character.attributes[attr]?.value ?? 1) : 0;
    const skillValue = skill ? (character.skills[skill]?.value ?? 0) : 0;
    const extra = (params ?? []).reduce((sum, path) => sum + resolveCharValue(character, path), 0);
    const pool = attributeValue + skillValue + extra;
    if (pool <= 0) return null;

    return <InlineRoll notation={`${pool}d10>=6f=1`} {...props} />;
}
