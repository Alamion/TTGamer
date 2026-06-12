export function buildDiceNotation(
    value: number,
    specialization: boolean | null,
    experienced: boolean | null
): string | undefined {
    if (value <= 0) return undefined;
    let notation = `${value}d10>=6`;
    if (!experienced) {
        notation += 'f=1';
    }
    if (specialization) {
        notation += '!';
    }
    return notation;
}
