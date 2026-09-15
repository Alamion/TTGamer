import type { TrackBinding } from '../../../systems/templateBindings';
import type { ConditionMark } from '../../../types/character';
import { evaluateFormula, parseFormula } from './formula';

type ComputedLength = NonNullable<TrackBinding['length']>;

export interface ComputedTrackLength {
    /** Visible boxes: formula result plus the adjustment, within 1…maxLength. */
    length: number;
    adjustment: number;
    /** Adjustment one step down/up, or undefined when the side is exhausted. */
    shorter?: number;
    longer?: number;
    /** The formula could not be evaluated (the base counts as 0). */
    failed: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Length of a computed track (V5 Health = Stamina + 3): the binding formula over bound numbers
 * plus the adjustment stored in the track record. Pure; the caller supplies coordinate reads.
 */
export function resolveComputedTrackLength(
    spec: ComputedLength,
    record: Readonly<Record<string, unknown>> | undefined,
    readNumber: (coordinate: string) => number | undefined
): ComputedTrackLength {
    const parsed = parseFormula(spec.from);
    const evaluation = parsed.ok ? evaluateFormula(parsed.expr, readNumber) : undefined;
    const failed = !evaluation?.ok;
    const base = evaluation?.ok ? Math.trunc(evaluation.value) : 0;
    const stored = record?.[spec.adjustmentKey];
    const adjustment = clamp(
        typeof stored === 'number' ? Math.trunc(stored) : 0,
        spec.adjustmentRange.min,
        spec.adjustmentRange.max
    );
    const lengthFor = (value: number) => clamp(base + value, 1, spec.maxLength);
    const length = lengthFor(adjustment);
    const step = (direction: -1 | 1) => {
        const next = adjustment + direction;
        if (next < spec.adjustmentRange.min || next > spec.adjustmentRange.max) return undefined;
        return lengthFor(next) === length ? undefined : next;
    };
    return { length, adjustment, shorter: step(-1), longer: step(1), failed };
}

/** Marks padded or cut to exactly `length` visible slots (stored slots past it stay untouched). */
export function visibleMarks(marks: unknown, length: number): ConditionMark[] {
    const source = Array.isArray(marks) ? (marks as ConditionMark[]) : [];
    return Array.from({ length }, (_, index) => source[index] ?? 'empty');
}

/** Stored marks after editing the visible ones: hidden slots past the length are kept. */
export function mergeVisibleMarks(stored: unknown, visible: readonly ConditionMark[]) {
    const source = Array.isArray(stored) ? (stored as ConditionMark[]) : [];
    return [...visible, ...source.slice(visible.length)];
}
