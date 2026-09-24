import { isSuccessPool, type RollResult, withPoolSetBonus } from '@site/src/dice_roller/dice-logic';

import type {
    DiceOutcome,
    DiceReadingLine,
    DocumentViewLabel,
    RollReadingRules,
    SystemDiceRules,
} from '../../types';

/** A V5 critical: every pair of 10s gains two successes (four in total). */
const CRITICAL_PAIRS = { size: 2, bonus: 2, comparePoint: { operator: '=', value: 10 } } as const;

/** What a line's outcome rules can ask about a finished V5 roll. */
export interface V5RollFacts {
    /** Kept faces of the line's special dice (`:h`). */
    specialFaces: readonly number[];
    /** At least one critical pair was counted. */
    critical: boolean;
    /** `null` when the Difficulty is unknown. */
    succeeded: boolean | null;
}

/**
 * A module's special dice (VtM Hunger, H:tR Desperation). The ruleset counts successes and
 * criticals; each line names its dice and reads their outcomes.
 */
export interface V5DiceLine extends DiceReadingLine {
    /** Document definitions whose sheet rolls use this line. */
    definitionIds: readonly string[];
    outcomes(facts: V5RollFacts): DiceOutcome[];
}

/** Builds an outcome that is conditional when the Difficulty is unknown. */
export function v5Outcome(
    id: string,
    titles: { known: DocumentViewLabel; conditional: DocumentViewLabel },
    detail: DocumentViewLabel,
    conditional: boolean
): DiceOutcome {
    return { id, title: conditional ? titles.conditional : titles.known, detail, conditional };
}

function factsOf(result: RollResult, difficulty: number | null): V5RollFacts {
    return {
        specialFaces: result.diceGroups
            .filter((group) => group.label === 'h')
            .flatMap((group) => group.keptRolls.map((roll) => roll.value)),
        critical: result.diceGroups.some((group) =>
            group.keptRolls.some((roll) => roll.setIndex !== undefined)
        ),
        succeeded: difficulty === null ? null : result.total >= difficulty,
    };
}

export function createV5DiceReading(lines: readonly V5DiceLine[]): RollReadingRules {
    return {
        id: 'v5',
        lines: lines.map(({ id, label }) => ({ id, label })),
        lineFor: (definitionId) =>
            lines.find((line) => line.definitionIds.includes(definitionId))?.id,
        prepare(notation, { criticalPairs }) {
            if (!criticalPairs) return isSuccessPool(notation) ? notation.trim() : null;
            return withPoolSetBonus(notation, CRITICAL_PAIRS);
        },
        interpret(result, { line, outcomes, difficulty }) {
            if (!outcomes) return [];
            return lines.find(({ id }) => id === line)?.outcomes(factsOf(result, difficulty)) ?? [];
        },
    };
}

/**
 * A V5 stat rolls its dots against 6+: ones never subtract and nothing explodes. A specialty is
 * free text that applies only when it fits the action, so the sheet adds no die for it.
 */
export function v5TraitPool(value: number): string | undefined {
    return value > 0 ? `${value}d10>=6` : undefined;
}

export function createV5DiceRules(lines: readonly V5DiceLine[]): SystemDiceRules {
    return { traitPool: v5TraitPool, reading: createV5DiceReading(lines) };
}
