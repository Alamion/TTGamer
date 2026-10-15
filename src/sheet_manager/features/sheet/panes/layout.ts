/** The smallest a group may be drawn beside or above another (spec 036, FR-006). */
export const MIN_GROUP_WIDTH = 320;
export const MIN_GROUP_HEIGHT = 200;
export const DIVIDER_SIZE = 6;
/** Below this width (the `md` breakpoint) one document shows at a time. */
export const SIDE_BY_SIDE_WIDTH = 768;

/**
 * Sizes for children with these weights in `room` px along one axis (dividers already taken out):
 * proportional to the weights, none under its minimum when there is room for all, whole pixels
 * adding up to the room.
 */
export function fitSizes(
    weights: readonly number[],
    room: number,
    mins: readonly number[] = weights.map(() => MIN_GROUP_WIDTH)
): number[] {
    const count = weights.length;
    if (count === 0) return [];
    const space = Math.max(0, room);
    const total = weights.reduce((sum, weight) => sum + (weight || 1), 0) || count;
    let sizes = weights.map((weight) => (space * (weight || 1)) / total);
    if (space >= mins.reduce((sum, min) => sum + min, 0)) {
        const low = sizes.map((value, index) => value < mins[index]!);
        const deficit = sizes.reduce(
            (sum, value, index) => sum + (low[index] ? mins[index]! - value : 0),
            0
        );
        const spare = sizes.reduce(
            (sum, value, index) => sum + (low[index] ? 0 : value - mins[index]!),
            0
        );
        if (deficit > 0 && spare > 0) {
            sizes = sizes.map((value, index) =>
                low[index] ? mins[index]! : value - ((value - mins[index]!) * deficit) / spare
            );
        }
    }
    const whole = sizes.map(Math.floor);
    whole[count - 1] = Math.max(0, whole[count - 1]! + space - whole.reduce((a, b) => a + b, 0));
    return whole;
}

/** Weights with an average of 1 for these sizes (what the layout stores). */
export function weightsOf(sizes: readonly number[]): number[] {
    const mean = sizes.reduce((sum, value) => sum + value, 0) / (sizes.length || 1) || 1;
    return sizes.map((value) => Math.round((value / mean) * 1000) / 1000);
}

/**
 * The sizes after the divider after child `index` moved so that child is `before` px long; both
 * neighbours keep their minimums.
 */
export function moveDivider(
    sizes: readonly number[],
    index: number,
    before: number,
    mins: readonly number[] = sizes.map(() => MIN_GROUP_WIDTH)
): number[] {
    const pair = sizes[index]! + sizes[index + 1]!;
    const bounded = Math.round(Math.min(pair - mins[index + 1]!, Math.max(mins[index]!, before)));
    return sizes.map((value, position) =>
        position === index ? bounded : position === index + 1 ? pair - bounded : value
    );
}
