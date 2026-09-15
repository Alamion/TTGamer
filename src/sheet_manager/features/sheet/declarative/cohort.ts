import type { ConditionMark } from '../../../types/character';

/**
 * Pure rules for member tracks (fodder squads, creature packs, vehicle squadrons): one condition
 * track per member, lettered A, B, C…, with a visible length that may be shorter than the
 * stored slots (visible level i lives in stored slot i).
 */

const SEVERITY: Record<ConditionMark, number> = { empty: 0, slash: 1, cross: 2 };

export interface CohortMember {
    id: string;
    label: string;
    marks: readonly ConditionMark[];
}

function memberLetter(index: number): string {
    return String.fromCharCode(65 + (index % 26));
}

/** First letter not used by an existing member label. */
export function nextMemberLabel(labels: readonly string[]): string {
    const used = new Set(labels);
    for (let index = 0; index < 26; index += 1) {
        const letter = memberLetter(index);
        if (!used.has(letter)) return letter;
    }
    return memberLetter(labels.length);
}

export function hasMarks(marks: readonly ConditionMark[]): boolean {
    return marks.some((mark) => mark !== 'empty');
}

/** Dice penalty of the deepest marked visible level (none → 0). */
export function memberPenalty(
    marks: readonly ConditionMark[],
    penalties: readonly (number | null)[]
): number {
    for (let index = penalties.length - 1; index >= 0; index -= 1) {
        if ((marks[index] ?? 'empty') !== 'empty') return penalties[index] ?? 0;
    }
    return 0;
}

/** A member is out of the fight once its last visible level is marked. */
export function isDefeated(marks: readonly ConditionMark[], visibleLength: number): boolean {
    return visibleLength > 0 && (marks[visibleLength - 1] ?? 'empty') !== 'empty';
}

/** True when shortening to `length` would hide a recorded mark. */
export function shorteningHidesMarks(marks: readonly ConditionMark[], length: number): boolean {
    return marks.slice(length).some((mark) => mark !== 'empty');
}

/**
 * Marks after shortening the visible track: marks past the new end collapse into its last level
 * (the most severe mark wins) instead of vanishing; hidden slots are cleared.
 */
export function shortenMarks(marks: readonly ConditionMark[], length: number): ConditionMark[] {
    if (length <= 0) return marks.map(() => 'empty');
    const tail = marks.slice(length - 1);
    const worst = tail.reduce<ConditionMark>(
        (current, mark) => (SEVERITY[mark] > SEVERITY[current] ? mark : current),
        'empty'
    );
    return marks.map((mark, index) =>
        index < length - 1 ? mark : index === length - 1 ? worst : 'empty'
    );
}

/** Cycles a stored slot through empty → bashing → lethal. */
export function toggleMark(marks: readonly ConditionMark[], index: number): ConditionMark[] {
    const order: ConditionMark[] = ['empty', 'slash', 'cross'];
    const next = [...marks];
    const current = next[index] ?? 'empty';
    next[index] = order[(order.indexOf(current) + 1) % order.length]!;
    return next;
}
