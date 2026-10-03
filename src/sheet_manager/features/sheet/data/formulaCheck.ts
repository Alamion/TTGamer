import { parseFormula } from '../declarative/formula';

export type FormulaInputCheck =
    | { kind: 'empty' }
    | { kind: 'ok'; reads: readonly string[] }
    | { kind: 'error'; code: 'parse'; position: number }
    | { kind: 'error'; code: 'unknown'; name: string };

/** The coordinates a parsed formula reads that the template's numeric space does not offer. */
export function unknownCoordinates(
    reads: readonly string[],
    coordinates: ReadonlySet<string>
): string[] {
    return reads.filter((coordinate) => !coordinates.has(coordinate));
}

/**
 * What a formula setting says under its box and in the issue list (spec 022, FR-003): nothing
 * while empty, the values it reads, or the first problem (a parse error or an unknown name).
 */
export function checkFormulaInput(
    source: string | undefined,
    /** The template's numeric coordinates; without them only the syntax is checked. */
    coordinates?: ReadonlySet<string>
): FormulaInputCheck {
    if (!source || source.trim().length === 0) return { kind: 'empty' };
    const parsed = parseFormula(source);
    // The parser reports the end of input past the last character; count from one for people.
    if (!parsed.ok) {
        const position = Math.min(parsed.error.position, source.length) + 1;
        return { kind: 'error', code: 'parse', position };
    }
    const [unknown] = coordinates ? unknownCoordinates(parsed.coords, coordinates) : [];
    if (unknown !== undefined) return { kind: 'error', code: 'unknown', name: unknown };
    return { kind: 'ok', reads: parsed.coords };
}
