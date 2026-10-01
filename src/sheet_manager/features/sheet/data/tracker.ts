import type {
    TrackerColumn,
    TrackerLayer,
    TrackerLength,
    TrackerMarkKind,
} from '../../../types/template';

/**
 * Pure tracker rules (spec 018, R7), shared by own trackers and built-in ones. Marks are stored
 * by level id (`levelId → markId`); a mark's weight is its kind's position, lighter first.
 */

export type TrackerMarks = Readonly<Record<string, string>>;

type LayeredKind = Pick<TrackerMarkKind, 'id'> & { layer?: TrackerLayer };

const layerOf = (kind: LayeredKind): TrackerLayer => kind.layer ?? 'fill';

/** Kinds of one layer, in order (order is weight within a layer). */
export function kindsOfLayer<K extends LayeredKind>(kinds: readonly K[], layer: TrackerLayer): K[] {
    return kinds.filter((kind) => layerOf(kind) === layer);
}

/**
 * The layer a click cycles and the total, marked level, and "out" read (spec 019 R5): the fills,
 * or the outlines of a tracker that has no fill marks.
 */
export function readingLayer(kinds: readonly LayeredKind[]): TrackerLayer {
    return kinds.some((kind) => layerOf(kind) === 'fill') ? 'fill' : 'outline';
}

/** A stored copy's two slots: `marks` holds fills, `outlines` holds outlines. */
export interface TrackerSlots {
    marks?: TrackerMarks;
    outlines?: TrackerMarks;
}

const slotOf = (layer: TrackerLayer): keyof TrackerSlots =>
    layer === 'fill' ? 'marks' : 'outlines';

/**
 * Where a layer's shown mark of a level is stored, if any (spec 019 R3): the layer's own slot when
 * its kind is on that layer, else the other slot when its kind moved to that layer. Display reads
 * the kind's current layer, so changing a mark's layer rewrites no stored value.
 */
export function layerSource(
    kinds: readonly LayeredKind[],
    copy: TrackerSlots,
    layer: TrackerLayer,
    levelId: string
): keyof TrackerSlots | undefined {
    const onLayer = (markId: string | undefined) =>
        markId !== undefined && kinds.some((kind) => kind.id === markId && layerOf(kind) === layer);
    const own = slotOf(layer);
    if (onLayer(copy[own]?.[levelId])) return own;
    const other = slotOf(layer === 'fill' ? 'outline' : 'fill');
    return onLayer(copy[other]?.[levelId]) ? other : undefined;
}

/** The marks a layer shows, by level id; stored entries of the other layer or gone kinds drop out. */
export function layerMarks(
    kinds: readonly LayeredKind[],
    copy: TrackerSlots,
    layer: TrackerLayer
): Record<string, string> {
    const shown: Record<string, string> = {};
    const levelIds = new Set([
        ...Object.keys(copy.marks ?? {}),
        ...Object.keys(copy.outlines ?? {}),
    ]);
    for (const levelId of levelIds) {
        const source = layerSource(kinds, copy, layer, levelId);
        if (source) shown[levelId] = copy[source]![levelId]!;
    }
    return shown;
}

/** Stored entries of a copy that neither layer shows (removed kinds, or a layer collision). */
export function hiddenSlotEntries(
    kinds: readonly LayeredKind[],
    copy: TrackerSlots,
    isShownLevel: (levelId: string) => boolean = () => true
): number {
    let hidden = 0;
    for (const slot of ['marks', 'outlines'] as const) {
        for (const levelId of Object.keys(copy[slot] ?? {})) {
            const shown =
                isShownLevel(levelId) &&
                (layerSource(kinds, copy, 'fill', levelId) === slot ||
                    layerSource(kinds, copy, 'outline', levelId) === slot);
            if (!shown) hidden += 1;
        }
    }
    return hidden;
}

/** Next mark of a box: empty → first kind → … → last kind → empty (`undefined`). */
export function nextMarkId(
    kinds: readonly Pick<TrackerMarkKind, 'id'>[],
    current: string | undefined
): string | undefined {
    if (current === undefined) return kinds[0]?.id;
    const index = kinds.findIndex(({ id }) => id === current);
    // A mark of a removed kind starts the cycle over.
    if (index < 0) return kinds[0]?.id;
    return kinds[index + 1]?.id;
}

/** Heavier marks sort later; unknown kinds weigh nothing. */
export function markWeight(kinds: readonly Pick<TrackerMarkKind, 'id'>[], id: string): number {
    return kinds.findIndex((kind) => kind.id === id);
}

/** Only marks of kinds the tracker has count; others stay stored and hidden. */
function knownMark(
    kinds: readonly Pick<TrackerMarkKind, 'id'>[],
    marks: TrackerMarks,
    levelId: string
): string | undefined {
    const mark = marks[levelId];
    return mark !== undefined && markWeight(kinds, mark) >= 0 ? mark : undefined;
}

/**
 * Level ids shown at a length, in level order. Without lengths every level shows; an index out of
 * range uses the first length (new trackers start short, like fodder groups).
 */
export function visibleLevelIds(
    levelIds: readonly string[],
    lengths: readonly TrackerLength[],
    lengthIndex: number | undefined
): string[] {
    if (lengths.length === 0) return [...levelIds];
    const length = lengths[lengthIndex ?? 0] ?? lengths[0]!;
    const shown = new Set(length.levels);
    return levelIds.filter((id) => shown.has(id));
}

/** Levels a column has cells on: the first `covers` shown levels, or all of them. */
export function coveredLevelIds(
    column: Pick<TrackerColumn, 'covers'>,
    visible: readonly string[]
): string[] {
    return column.covers === undefined ? [...visible] : visible.slice(0, column.covers);
}

/** The deepest shown level holding a known mark, or `undefined`. */
export function deepestMarked(
    kinds: readonly Pick<TrackerMarkKind, 'id'>[],
    visible: readonly string[],
    marks: TrackerMarks
): string | undefined {
    for (let index = visible.length - 1; index >= 0; index -= 1) {
        const levelId = visible[index]!;
        if (knownMark(kinds, marks, levelId) !== undefined) return levelId;
    }
    return undefined;
}

/** A copy is out once its last shown level is marked. */
export function isCopyOut(
    kinds: readonly Pick<TrackerMarkKind, 'id'>[],
    visible: readonly string[],
    marks: TrackerMarks
): boolean {
    const last = visible[visible.length - 1];
    return last !== undefined && knownMark(kinds, marks, last) !== undefined;
}

/**
 * Marks after switching from one shown length to another. Marks keep their position in the shown
 * order, as a fodder group's damage does: the n-th shown box stays the n-th. Marks past the new
 * end fold into its last level (the heaviest wins). Only marks of the levels shown before move;
 * marks of hidden or removed levels are dropped, as the switch rewrites the copy's marks.
 */
export function remapMarks(
    kinds: readonly Pick<TrackerMarkKind, 'id'>[],
    before: readonly string[],
    after: readonly string[],
    marks: TrackerMarks
): Record<string, string> {
    const sequence = before.map((levelId) => knownMark(kinds, marks, levelId));
    const next: Record<string, string> = {};
    if (after.length === 0) return next;
    after.forEach((levelId, index) => {
        const mark =
            index < after.length - 1 ? sequence[index] : heaviest(kinds, sequence.slice(index));
        if (mark !== undefined) next[levelId] = mark;
    });
    return next;
}

function heaviest(
    kinds: readonly Pick<TrackerMarkKind, 'id'>[],
    marks: readonly (string | undefined)[]
): string | undefined {
    let found: string | undefined;
    for (const mark of marks) {
        if (mark === undefined) continue;
        if (found === undefined || markWeight(kinds, mark) > markWeight(kinds, found)) found = mark;
    }
    return found;
}

/** True when switching from `before` to the shorter `after` would fold or drop a mark. */
export function lengthChangeHidesMarks(
    kinds: readonly Pick<TrackerMarkKind, 'id'>[],
    before: readonly string[],
    after: readonly string[],
    marks: TrackerMarks
): boolean {
    return before
        .slice(after.length)
        .some((levelId) => knownMark(kinds, marks, levelId) !== undefined);
}

/** Copy label by position: A, B, C… (copies never exceed the 24-letter cap). */
export function copyLabel(index: number): string {
    return String.fromCharCode(65 + (index % 26));
}
