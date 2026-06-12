export function stripForcedValues(notation: string): string {
    return notation.replace(/@\d+(?:,\d+)*/g, '');
}
