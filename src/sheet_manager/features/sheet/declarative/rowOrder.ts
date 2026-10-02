/** A copy of `items` with the item at `from` moved to `to` (both clamped positions). */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
    const next = [...items];
    if (from < 0 || from >= next.length) return next;
    const [moved] = next.splice(from, 1);
    next.splice(Math.min(Math.max(to, 0), next.length), 0, moved!);
    return next;
}

/**
 * Table rows (`Record<rowIndex, cells>`, shown in numeric key order) with one row moved: the
 * keys are rewritten `0…n-1` in the new order, closing gaps (spec 022, R7). `from` and `to` are
 * positions in the shown order; cells keep their column ids.
 */
export function moveTableRow<Row>(
    rows: Readonly<Record<string, Row>>,
    from: number,
    to: number
): Record<string, Row> {
    const ordered = Object.entries(rows)
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, row]) => row);
    return Object.fromEntries(
        moveItem(ordered, from, to).map((row, index) => [String(index), row])
    );
}
