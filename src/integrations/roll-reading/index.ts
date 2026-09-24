import type { RollResult } from '@site/src/dice_roller/dice-logic';
import type {
    RollOrigin,
    RollReader,
    RollReadingSummary,
    RollSource,
} from '@site/src/dice_roller/utils/rollReader';
import type { RollReadingRules, SystemPlugin } from '@site/src/sheet_manager/systems';

import { getShownDocument } from '../sheet-dice/shownDocument';

/** The WoD tab's V5 mode asks for this reading by id, never by system id. */
const WOD_TAB_READING_ID = 'v5';

interface SystemLookup {
    getSystems(): readonly SystemPlugin[];
    getSystem(systemId: string): SystemPlugin | undefined;
}

interface ReadingContext {
    rules: RollReadingRules;
    line: string;
    difficulty: number | null;
    outcomes: boolean;
}

interface Applicable {
    rules: RollReadingRules;
    line: string;
    difficulty: number | null;
}

function readingForSource(systems: SystemLookup, source: RollSource | null | undefined) {
    if (!source) return null;
    const rules = systems.getSystem(source.systemId)?.dice?.reading;
    const line = rules?.lineFor(source.definitionId);
    return rules && line ? { rules, line, difficulty: null } : null;
}

/**
 * Where a system reading applies (spec 011 FR-013/FR-014). Rolls made from a character — a
 * sheet's immediate roll, or the header's pending-roll button — follow that character's system
 * and line, whatever tab is selected. Rolls made in the dice panel follow the panel: the WoD
 * tab in V5 mode with its own line, and with no tab selected the character the roll came from
 * (the queued stat's, else the shown document). A Difficulty comes only from the WoD tab.
 */
export function resolveReading(
    systems: SystemLookup,
    origin: RollOrigin,
    shownDocument: () => RollSource | null
): Applicable | null {
    if (origin.kind === 'sheet') return readingForSource(systems, origin.source);
    if (origin.control === 'header') {
        const fromCharacter = readingForSource(systems, origin.source ?? shownDocument());
        if (fromCharacter) return { ...fromCharacter, difficulty: origin.wod?.difficulty ?? null };
    }
    if (origin.tab === 'wod') {
        if (origin.wod?.mode !== 'v5') return null;
        const rules = systems
            .getSystems()
            .map((system) => system.dice?.reading)
            .find((reading) => reading?.id === WOD_TAB_READING_ID);
        return rules ? { rules, line: origin.wod.line, difficulty: origin.wod.difficulty } : null;
    }
    if (origin.tab !== '') return null;
    return readingForSource(systems, origin.source ?? shownDocument());
}

export function createRollReader(
    systems: SystemLookup,
    shownDocument: () => RollSource | null = getShownDocument
): RollReader {
    return {
        prepare(notation, origin, settings) {
            const applicable = resolveReading(systems, origin, shownDocument);
            if (!applicable) return null;
            const prepared = applicable.rules.prepare(notation, {
                criticalPairs: settings.v5CriticalPairs,
            });
            if (prepared === null) return null;
            const context: ReadingContext = {
                ...applicable,
                outcomes: settings.v5SpecialOutcomes,
            };
            return { notation: prepared, context };
        },
        interpret(result: RollResult, context: unknown): RollReadingSummary | undefined {
            const { rules, line, difficulty, outcomes } = context as ReadingContext;
            const lineLabel = rules.lines.find((entry) => entry.id === line)?.label;
            if (!lineLabel) return undefined;
            return {
                readingId: rules.id,
                line,
                lineLabel,
                difficulty,
                outcomes: rules.interpret(result, { line, outcomes, difficulty }),
            };
        },
    };
}
