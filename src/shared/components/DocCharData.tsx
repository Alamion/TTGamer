import type { ReactNode } from 'react';
import { useCharacterStore } from '@site/src/sheet_manager/store/characterStore';
import { InlineRoll } from '@site/src/dice_roller/components/InlineRoll';
import type { BaseCharacter } from '@site/src/sheet_manager/types/character';

function resolveCharValue(char: BaseCharacter, path: string): number {
    let current: unknown = char;
    for (const part of path.split('.')) {
        if (current == null || typeof current !== 'object') return 0;
        current = (current as Record<string, unknown>)[part];
    }
    if (
        current != null &&
        typeof current === 'object' &&
        'value' in (current as Record<string, unknown>)
    ) {
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
    hideForced?: boolean;
    preroll?: boolean;
    animationTime?: number;
}): ReactNode {
    const char = useCharacterStore((s) => s.currentCharacter);
    if (!char) return null;

    const attrVal = attr ? (char.attributes?.[attr]?.value ?? 1) : 0;
    const skillVal = skill ? (char.skills?.[skill]?.value ?? 0) : 0;
    const extra = (params ?? []).reduce((sum, p) => sum + resolveCharValue(char, p), 0);
    const pool = attrVal + skillVal + extra;
    if (pool <= 0) return null;

    const notation = `${pool}d10>=6f=1`;
    return <InlineRoll notation={notation} {...props} />;
}
