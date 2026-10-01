import type { TrackMarkId } from '../../../systems/templateBindings';
import type { ConditionMark } from '../../../types/character';
import type {
    PrimitiveNode,
    TrackerColumn,
    TrackerDisplay,
    TrackerField,
    TrackerLayer,
    TrackerMarkKind,
} from '../../../types/template';
import { TRACKER_LAYERS } from '../../../types/template';
import type { TrackerCopyValue, TrackerValue } from '../../../types/templateValues';
import {
    copyLabel,
    coveredLevelIds,
    deepestMarked,
    hiddenSlotEntries,
    isCopyOut,
    kindsOfLayer,
    layerMarks,
    layerSource,
    lengthChangeHidesMarks,
    nextMarkId,
    readingLayer,
    remapMarks,
    visibleLevelIds,
} from './tracker';

/**
 * What the tracker molecule draws (spec 018, R1): own and built-in trackers both reduce to this.
 * Level values and totals are display text; an empty value shows as a dash.
 */
export interface TrackerModelLevel {
    id: string;
    name: string;
    value: string;
}

export interface TrackerModelCopy {
    id: string;
    /** Header or strip name: the column title, with the copy's letter when repeatable. */
    label: string;
    /** A, B, C… in a repeatable column. */
    letter?: string;
    /** Shown fill marks by level id (spec 019: the fill layer). */
    marks: Readonly<Record<string, string>>;
    /** Shown outline marks by level id. */
    outlines: Readonly<Record<string, string>>;
    texts: Readonly<Record<string, string>>;
    out: boolean;
    /** The total row's text: the deepest level's value or a count; `undefined` when none. */
    total: string | undefined;
    hasValues: boolean;
    /** Pools (spec 020): boxes below these counts are held by a minimum on that layer. */
    locked?: { fill: number; outline: number };
}

export interface TrackerModelColumn {
    id: string;
    kind: TrackerColumn['kind'];
    title: string;
    /** Shown level ids this column has cells on. */
    covered: readonly string[];
    copies: readonly TrackerModelCopy[];
    repeatable: boolean;
    canAdd: boolean;
    canRemove: boolean;
}

export interface TrackerModel {
    label: string;
    hideLabel: boolean;
    /** `row` is a pool drawn like a rating row (spec 020). */
    display: TrackerDisplay | 'row';
    marks: readonly Pick<TrackerMarkKind, 'id' | 'name' | 'symbol' | 'fill' | 'layer'>[];
    levels: readonly TrackerModelLevel[];
    valueColumn: { title: string; show: boolean };
    columns: readonly TrackerModelColumn[];
    total: boolean;
    legend: boolean;
    /** The layer the click cycle, the total, the marked level, and "out" read (spec 019 R5). */
    readingLayer: TrackerLayer;
    /** The outline action (right click, Shift+Enter, long press) works only when true. */
    hasOutlines: boolean;
    /** Present when the reader can switch lengths. */
    length?: { shown: number; canShorten: boolean; canLengthen: boolean };
    /** Stored marks, notes, and copies the tracker no longer shows (spec FR-026a). */
    hidden: number;
}

/** The first copy of a column that has none stored yet. */
const FIRST_COPY_ID = 'a';

function copiesOf(column: TrackerColumn, value: TrackerValue | undefined): TrackerCopyValue[] {
    const stored = value?.columns[column.id] ?? [];
    const shown = stored.slice(0, column.copies?.max ?? 1);
    return shown.length > 0 ? shown : [{ id: FIRST_COPY_ID }];
}

function countEntries(record: Readonly<Record<string, unknown>> | undefined): number {
    return record ? Object.keys(record).length : 0;
}

/** Stored values the tracker cannot show: unknown columns, levels, kinds, or extra copies. */
export function countHiddenTrackerValues(
    field: Pick<TrackerField, 'columns' | 'levels' | 'marks'>,
    value: TrackerValue | undefined
): number {
    if (!value) return 0;
    const levelIds = new Set(field.levels.map(({ id }) => id));
    const columns = new Map(field.columns.map((column) => [column.id, column]));
    let hidden = 0;
    for (const [columnId, copies] of Object.entries(value.columns)) {
        const column = columns.get(columnId);
        copies.forEach((copy, index) => {
            const copyCount =
                countEntries(copy.marks) + countEntries(copy.outlines) + countEntries(copy.texts);
            if (!column || index >= (column.copies?.max ?? 1)) {
                hidden += Math.max(1, copyCount);
                return;
            }
            // Marks of either slot that neither layer shows: gone levels or kinds, or collisions.
            hidden += hiddenSlotEntries(field.marks, copy, (levelId) => levelIds.has(levelId));
            for (const levelId of Object.keys(copy.texts ?? {})) {
                if (!levelIds.has(levelId)) hidden += 1;
            }
        });
    }
    return hidden;
}

function shownLevels(
    field: Pick<TrackerField, 'levels' | 'lengths'>,
    value: TrackerValue | undefined
): string[] {
    return visibleLevelIds(
        field.levels.map(({ id }) => id),
        field.lengths,
        value?.length
    );
}

/**
 * A count total (spec 020 R4): filled boxes, and framed boxes when the tracker has outline marks
 * and frames any box ("2 / 5"); never "2 / 0".
 */
export function countText(
    covered: readonly string[],
    fills: Readonly<Record<string, string>>,
    outlines: Readonly<Record<string, string>>,
    hasOutlines: boolean
): string {
    const filled = covered.filter((id) => fills[id] !== undefined).length;
    const framed = covered.filter((id) => outlines[id] !== undefined).length;
    return hasOutlines && framed > 0 ? `${filled} / ${framed}` : String(filled);
}

/** The drawn model of an own tracker; `label` is the field's shown (translated) label. */
export function ownTrackerModel(
    field: TrackerField,
    value: TrackerValue | undefined,
    label: string,
    readOnly: boolean
): TrackerModel {
    const visible = shownLevels(field, value);
    const byId = new Map(field.levels.map((level) => [level.id, level]));
    const reading = readingLayer(field.marks);
    const readingKinds = kindsOfLayer(field.marks, reading);
    const hasOutlines = kindsOfLayer(field.marks, 'outline').length > 0;
    const columns = field.columns.map((column): TrackerModelColumn => {
        const covered = coveredLevelIds(column, visible);
        const copies = copiesOf(column, value);
        const repeatable = column.copies !== undefined;
        return {
            id: column.id,
            kind: column.kind,
            title: column.title,
            covered,
            repeatable,
            canAdd: !readOnly && repeatable && copies.length < (column.copies?.max ?? 1),
            canRemove: !readOnly && repeatable && copies.length > 1,
            copies: copies.map((copy, index) => {
                const marks = layerMarks(field.marks, copy, 'fill');
                const outlines = layerMarks(field.marks, copy, 'outline');
                const read = reading === 'fill' ? marks : outlines;
                const deepest =
                    column.kind === 'marks'
                        ? deepestMarked(readingKinds, covered, read)
                        : undefined;
                return {
                    id: copy.id,
                    label: repeatable ? `${column.title} ${copyLabel(index)}`.trim() : column.title,
                    ...(repeatable ? { letter: copyLabel(index) } : {}),
                    marks,
                    outlines,
                    texts: copy.texts ?? {},
                    out:
                        column.kind === 'marks' &&
                        field.out &&
                        isCopyOut(readingKinds, covered, read),
                    total:
                        column.kind !== 'marks'
                            ? undefined
                            : field.totalReads === 'count'
                              ? countText(covered, marks, outlines, hasOutlines)
                              : deepest === undefined
                                ? undefined
                                : byId.get(deepest)?.value || undefined,
                    hasValues:
                        countEntries(copy.marks) +
                            countEntries(copy.outlines) +
                            countEntries(copy.texts) >
                        0,
                };
            }),
        };
    });
    const lengthIndex = Math.min(value?.length ?? 0, Math.max(0, field.lengths.length - 1));
    return {
        label,
        hideLabel: field.hideLabel ?? false,
        display: field.display,
        marks: field.marks,
        levels: visible.map((id) => {
            const level = byId.get(id)!;
            return { id, name: level.name, value: level.value };
        }),
        valueColumn: { title: field.valueColumn.title ?? '', show: field.valueColumn.show },
        columns,
        total: field.total,
        legend: field.legend,
        readingLayer: reading,
        hasOutlines,
        ...(field.lengths.length > 1
            ? {
                  length: {
                      shown: visible.length,
                      canShorten: !readOnly && lengthIndex > 0,
                      canLengthen: !readOnly && lengthIndex < field.lengths.length - 1,
                  },
              }
            : {}),
        hidden: countHiddenTrackerValues(field, value),
    };
}

// ---------------------------------------------------------------------------
// Writes: each returns the whole next value, so one click is one store write.
// ---------------------------------------------------------------------------

function emptyValue(): TrackerValue {
    return { tracker: 1, columns: {} };
}

function withCopy(
    field: Pick<TrackerField, 'columns'>,
    value: TrackerValue | undefined,
    columnId: string,
    copyId: string,
    update: (copy: TrackerCopyValue) => TrackerCopyValue
): TrackerValue {
    const base = value ?? emptyValue();
    const column = field.columns.find(({ id }) => id === columnId);
    if (!column) return base;
    const stored = base.columns[columnId] ?? [];
    // The first copy, or a member's copy of a built-in extra column, is stored on first write.
    const copies = stored.some(({ id }) => id === copyId) ? stored : [...stored, { id: copyId }];
    return {
        ...base,
        columns: {
            ...base.columns,
            [columnId]: copies.map((copy) => (copy.id === copyId ? update(copy) : copy)),
        },
    };
}

function withoutKey<T>(record: Readonly<Record<string, T>> | undefined, key: string) {
    const next = { ...record };
    delete next[key];
    return Object.keys(next).length > 0 ? next : undefined;
}

function setOptional<K extends 'marks' | 'outlines' | 'texts'>(
    copy: TrackerCopyValue,
    key: K,
    record: TrackerCopyValue[K]
): TrackerCopyValue {
    const next = { ...copy };
    if (record === undefined) delete next[key];
    else next[key] = record;
    return next;
}

/** A box press (spec 020): the legend brush's mark, or a layer's own rule. */
export type TrackerClick = { brush: string } | { layer: TrackerLayer };

/**
 * A box click: the next mark of the layer's cycle (the reading layer by default), or empty after
 * the last; the other layer stays (spec 019 FR-012).
 */
export function toggleTrackerMark(
    field: Pick<TrackerField, 'columns' | 'marks'>,
    value: TrackerValue | undefined,
    columnId: string,
    copyId: string,
    levelId: string,
    layer: TrackerLayer = readingLayer(field.marks)
): TrackerValue {
    const kinds = kindsOfLayer(field.marks, layer);
    return withCopy(field, value, columnId, copyId, (copy) => {
        const source = layerSource(field.marks, copy, layer, levelId);
        const next = nextMarkId(kinds, source ? copy[source]?.[levelId] : undefined);
        return writeLayer(field.marks, copy, layer, levelId, next);
    });
}

const slotOf = (layer: TrackerLayer) => (layer === 'fill' ? 'marks' : 'outlines');

/**
 * Sets (or clears) what one layer of a box shows. The mark it replaces is removed from wherever it
 * was stored; a mark of the other layer that sits in this layer's slot (its layer changed since)
 * moves to its own slot first, so writing one layer never loses the other.
 */
function writeLayer(
    kinds: TrackerField['marks'],
    copy: TrackerCopyValue,
    layer: TrackerLayer,
    levelId: string,
    markId: string | undefined
): TrackerCopyValue {
    const other: TrackerLayer = layer === 'fill' ? 'outline' : 'fill';
    const own = slotOf(layer);
    let next = copy;
    const source = layerSource(kinds, next, layer, levelId);
    if (source) next = setOptional(next, source, withoutKey(next[source], levelId));
    if (markId === undefined) return next;
    if (layerSource(kinds, next, other, levelId) === own) {
        const moved = next[own]![levelId]!;
        next = setOptional(next, slotOf(other), { ...next[slotOf(other)], [levelId]: moved });
    }
    return setOptional(next, own, { ...next[own], [levelId]: markId });
}

/**
 * A brush click (spec 019): the box's layer of that mark gets it, or loses it when it already
 * shows it. The other layer never changes. A mark shown from the other slot (its layer changed
 * since it was stored) is replaced there.
 */
export function paintTrackerMark(
    field: Pick<TrackerField, 'columns' | 'marks'>,
    value: TrackerValue | undefined,
    columnId: string,
    copyId: string,
    levelId: string,
    markId: string
): TrackerValue {
    const kind = field.marks.find(({ id }) => id === markId);
    if (!kind) return value ?? emptyValue();
    return withCopy(field, value, columnId, copyId, (copy) => {
        const source = layerSource(field.marks, copy, kind.layer, levelId);
        const shown = source ? copy[source]?.[levelId] : undefined;
        return writeLayer(
            field.marks,
            copy,
            kind.layer,
            levelId,
            shown === markId ? undefined : markId
        );
    });
}

type RunField = Pick<
    TrackerField,
    'columns' | 'marks' | 'levels' | 'lengths' | 'fromStart' | 'fillInside'
>;

/**
 * An own tracker's box press (spec 020). With "marks fill from the start" a layer press runs that
 * layer's first mark and a brush runs its own mark; otherwise the press cycles or paints one box.
 */
export function markTracker(
    field: RunField,
    value: TrackerValue | undefined,
    columnId: string,
    copyId: string,
    levelId: string,
    click: TrackerClick
): TrackerValue {
    if (!field.fromStart) {
        return 'brush' in click
            ? paintTrackerMark(field, value, columnId, copyId, levelId, click.brush)
            : toggleTrackerMark(field, value, columnId, copyId, levelId, click.layer);
    }
    const markId = 'brush' in click ? click.brush : kindsOfLayer(field.marks, click.layer)[0]?.id;
    return markId === undefined
        ? (value ?? emptyValue())
        : runTrackerMark(field, value, columnId, copyId, levelId, markId);
}

function lastShown(order: readonly string[], shown: Readonly<Record<string, string>>): number {
    for (let index = order.length - 1; index >= 0; index -= 1) {
        if (shown[order[index]!] !== undefined) return index;
    }
    return -1;
}

/**
 * Marks boxes 1…N of the mark's layer in shown order and clears that layer after N, as a rating's
 * dots do: pressing the last box of a run of this mark shortens it by one. The other layer and
 * levels outside the shown length keep what they hold.
 */
function runTrackerMark(
    field: RunField,
    value: TrackerValue | undefined,
    columnId: string,
    copyId: string,
    levelId: string,
    markId: string
): TrackerValue {
    const kind = field.marks.find(({ id }) => id === markId);
    const column = field.columns.find(({ id }) => id === columnId);
    if (!kind || !column) return value ?? emptyValue();
    const order = coveredLevelIds(column, shownLevels(field, value));
    const index = order.indexOf(levelId);
    if (index < 0) return value ?? emptyValue();
    return withCopy(field, value, columnId, copyId, (copy) => {
        const shown = layerMarks(field.marks, copy, kind.layer);
        let last =
            index === lastShown(order, shown) && shown[levelId] === markId ? index - 1 : index;
        if (field.fillInside && kind.layer === 'fill') {
            last = Math.min(last, lastShown(order, layerMarks(field.marks, copy, 'outline')));
        }
        return order.reduce(
            (next, id, position) =>
                writeLayer(
                    field.marks,
                    next,
                    kind.layer,
                    id,
                    position <= last ? markId : undefined
                ),
            copy
        );
    });
}

export function setTrackerText(
    field: Pick<TrackerField, 'columns'>,
    value: TrackerValue | undefined,
    columnId: string,
    copyId: string,
    levelId: string,
    text: string
): TrackerValue {
    return withCopy(field, value, columnId, copyId, (copy) =>
        setOptional(
            copy,
            'texts',
            text === '' ? withoutKey(copy.texts, levelId) : { ...copy.texts, [levelId]: text }
        )
    );
}

export function addTrackerCopy(
    field: Pick<TrackerField, 'columns'>,
    value: TrackerValue | undefined,
    columnId: string,
    newCopyId: string
): TrackerValue {
    const base = value ?? emptyValue();
    const column = field.columns.find(({ id }) => id === columnId);
    const stored = base.columns[columnId] ?? [];
    const copies = stored.length > 0 ? stored : [{ id: FIRST_COPY_ID }];
    if (!column || copies.length >= (column.copies?.max ?? 1)) return base;
    return { ...base, columns: { ...base.columns, [columnId]: [...copies, { id: newCopyId }] } };
}

export function removeTrackerCopy(
    value: TrackerValue | undefined,
    columnId: string,
    copyId: string
): TrackerValue {
    const base = value ?? emptyValue();
    const copies = base.columns[columnId] ?? [];
    if (copies.length <= 1) return base;
    return {
        ...base,
        columns: { ...base.columns, [columnId]: copies.filter(({ id }) => id !== copyId) },
    };
}

function nextLengthIndex(field: TrackerField, value: TrackerValue | undefined, step: -1 | 1) {
    const current = Math.min(value?.length ?? 0, Math.max(0, field.lengths.length - 1));
    const next = current + step;
    return next >= 0 && next < field.lengths.length ? next : undefined;
}

/** True when stepping the length this way folds or drops a stored mark. */
export function trackerLengthHidesMarks(
    field: TrackerField,
    value: TrackerValue | undefined,
    step: -1 | 1
): boolean {
    const next = nextLengthIndex(field, value, step);
    if (next === undefined || !value) return false;
    const before = shownLevels(field, value);
    const after = visibleLevelIds(
        field.levels.map(({ id }) => id),
        field.lengths,
        next
    );
    return field.columns.some(
        (column) =>
            column.kind === 'marks' &&
            copiesOf(column, value).some((copy) =>
                TRACKER_LAYERS.some((layer) =>
                    lengthChangeHidesMarks(
                        kindsOfLayer(field.marks, layer),
                        before,
                        after,
                        layerMarks(field.marks, copy, layer)
                    )
                )
            )
    );
}

/**
 * Steps the shown length; marks keep their shown position and fold into the new end, each layer on
 * its own (the heaviest of that layer wins; spec 019 FR-017).
 */
export function stepTrackerLength(
    field: TrackerField,
    value: TrackerValue | undefined,
    step: -1 | 1
): TrackerValue | undefined {
    const next = nextLengthIndex(field, value, step);
    if (next === undefined) return undefined;
    const base = value ?? emptyValue();
    const before = shownLevels(field, base);
    const after = visibleLevelIds(
        field.levels.map(({ id }) => id),
        field.lengths,
        next
    );
    const columns = { ...base.columns };
    for (const column of field.columns) {
        if (column.kind !== 'marks' || !columns[column.id]) continue;
        columns[column.id] = columns[column.id]!.map((copy) => {
            const remap = (layer: TrackerLayer) =>
                emptyToUndefined(
                    remapMarks(
                        kindsOfLayer(field.marks, layer),
                        before,
                        after,
                        layerMarks(field.marks, copy, layer)
                    )
                );
            return setOptional(
                setOptional(copy, 'marks', remap('fill')),
                'outlines',
                remap('outline')
            );
        });
    }
    return { ...base, length: next, columns };
}

function emptyToUndefined(record: Record<string, string>) {
    return Object.keys(record).length > 0 ? record : undefined;
}

// ---------------------------------------------------------------------------
// Built-in trackers (spec 018, R4–R7): the game's levels, marks, and members, with the page's
// overrides and extra columns.
// ---------------------------------------------------------------------------

/** The column that holds the game's own marks (stored in the document's data). */
export const GAME_COLUMN_ID = 'game';

const GAME_MARK_LOOK: Record<TrackMarkId, Pick<TrackerMarkKind, 'symbol' | 'fill'>> = {
    slash: { symbol: '╱', fill: 'secondary' },
    cross: { symbol: '×', fill: 'error' },
};

/**
 * Display of a track primitive: its own setting, else the legacy `compact` (one line) or
 * `trackLayout`, else a table for named levels and a strip for a computed length (FR-013).
 */
export function trackerDisplayOf(
    node: Pick<PrimitiveNode, 'tracker' | 'compact' | 'trackLayout'>,
    computed: boolean
): TrackerDisplay {
    if (node.tracker?.display) return node.tracker.display;
    if (node.compact) return 'line';
    return node.trackLayout ?? (computed ? 'strip' : 'table');
}

/** A game penalty as level text: none and zero read as no value, as the tables always showed. */
export function penaltyText(penalty: number | null | undefined): string {
    return penalty ? String(penalty) : '';
}

/**
 * Levels of a built-in track with the page's text: a page override replaces only the name or
 * value it sets (FR-021). A legacy `track` override with another count still sets the levels.
 */
export function builtInLevels(
    game: readonly { id: string; name: string; penalty: number | null }[],
    node: Pick<PrimitiveNode, 'track' | 'tracker'>
): TrackerModelLevel[] {
    const legacy = node.track;
    const base =
        legacy && legacy.names.length !== game.length
            ? legacy.names.map((name, index) => ({ id: `level-${index}`, name, value: '' }))
            : game.map((level, index) => ({
                  id: level.id,
                  name: legacy?.names[index] ?? level.name,
                  value: penaltyText(level.penalty),
              }));
    const overrides = node.tracker?.levels ?? [];
    return base.map((level, index) => {
        const override = overrides[index];
        return {
            id: level.id,
            name: override?.name || level.name,
            value: override?.value ?? level.value,
        };
    });
}

/** The two built-in marks with the game's names and the page's look. */
export function builtInMarks(
    game: readonly { id: TrackMarkId; name: string }[],
    node: Pick<PrimitiveNode, 'tracker'>
): TrackerModel['marks'] {
    return game.map(({ id, name }) => {
        const override = node.tracker?.marks?.[id];
        return {
            id,
            name: override?.name || name,
            symbol: override?.symbol ?? GAME_MARK_LOOK[id].symbol,
            fill: override?.fill ?? GAME_MARK_LOOK[id].fill,
            // The game keeps one mark per box (spec 019 FR-022).
            layer: 'fill',
        };
    });
}

export interface BuiltInCopy {
    id: string;
    /** A member's letter; absent on a plain track. */
    label?: string;
    /** Marks by shown position (`ConditionMark`). */
    marks: readonly ConditionMark[];
}

export interface BuiltInTrackerInput {
    label: string;
    hideLabel: boolean;
    display: TrackerDisplay;
    levels: readonly TrackerModelLevel[];
    marks: TrackerModel['marks'];
    valueColumn: { title: string; show: boolean };
    total: boolean;
    legend: boolean;
    gameColumnTitle: string;
    copies: readonly BuiltInCopy[];
    members?: { canAdd: boolean };
    extraColumns: readonly TrackerColumn[];
    pageValue: TrackerValue | undefined;
    length?: TrackerModel['length'];
    readOnly: boolean;
}

/** The drawn model of a built-in tracker (members are copies of the game's column). */
export function builtInTrackerModel(input: BuiltInTrackerInput): TrackerModel {
    const visible = input.levels.map(({ id }) => id);
    const byId = new Map(input.levels.map((level) => [level.id, level]));
    const lettered = input.members !== undefined && input.copies.length > 1;
    const totalOf = (marks: Readonly<Record<string, string>>) => {
        const deepest = deepestMarked(input.marks, visible, marks);
        return deepest === undefined ? undefined : byId.get(deepest)?.value || undefined;
    };
    const game: TrackerModelColumn = {
        id: GAME_COLUMN_ID,
        kind: 'marks',
        title: input.gameColumnTitle,
        covered: visible,
        repeatable: input.members !== undefined,
        canAdd: !input.readOnly && (input.members?.canAdd ?? false),
        canRemove: !input.readOnly && input.members !== undefined && input.copies.length > 1,
        copies: input.copies.map((copy) => {
            const marks: Record<string, string> = {};
            visible.forEach((levelId, index) => {
                const mark = copy.marks[index];
                if (mark && mark !== 'empty') marks[levelId] = mark;
            });
            return {
                id: copy.id,
                label: lettered ? (copy.label ?? '') : input.gameColumnTitle,
                ...(lettered && copy.label ? { letter: copy.label } : {}),
                marks,
                outlines: {},
                texts: {},
                out: input.members !== undefined && isCopyOut(input.marks, visible, marks),
                total: totalOf(marks),
                hasValues: Object.keys(marks).length > 0,
            };
        }),
    };
    const extras = input.extraColumns.map((column): TrackerModelColumn => {
        const covered = coveredLevelIds(column, visible);
        // Repeated extra columns on member tracks have one copy per member.
        const byMember = input.members !== undefined && column.copies !== undefined;
        const stored = input.pageValue?.columns[column.id] ?? [];
        const copies: TrackerCopyValue[] = byMember
            ? input.copies.map(
                  (member) => stored.find(({ id }) => id === member.id) ?? { id: member.id }
              )
            : [stored[0] ?? { id: FIRST_COPY_ID }];
        return {
            id: column.id,
            kind: column.kind,
            title: column.title,
            covered,
            repeatable: false,
            canAdd: false,
            canRemove: false,
            copies: copies.map((copy, index) => {
                const marks = copy.marks ?? {};
                const member = byMember ? input.copies[index] : undefined;
                return {
                    id: copy.id,
                    label:
                        member && lettered
                            ? `${column.title} ${member.label ?? ''}`.trim()
                            : column.title,
                    ...(member && lettered && member.label ? { letter: member.label } : {}),
                    marks,
                    outlines: {},
                    texts: copy.texts ?? {},
                    out: false,
                    total:
                        column.kind === 'marks'
                            ? (() => {
                                  const deepest = deepestMarked(input.marks, covered, marks);
                                  return deepest === undefined
                                      ? undefined
                                      : byId.get(deepest)?.value || undefined;
                              })()
                            : undefined,
                    hasValues: Object.keys(marks).length + Object.keys(copy.texts ?? {}).length > 0,
                };
            }),
        };
    });
    return {
        label: input.label,
        hideLabel: input.hideLabel,
        display: input.display,
        marks: input.marks,
        levels: input.levels,
        valueColumn: input.valueColumn,
        columns: [game, ...extras],
        total: input.total,
        legend: input.legend,
        readingLayer: 'fill',
        hasOutlines: false,
        ...(input.length ? { length: input.length } : {}),
        hidden: 0,
    };
}

/** Stored extra-column values a built-in tracker no longer shows (removed columns). */
export function countHiddenExtraValues(
    columns: readonly TrackerColumn[],
    value: TrackerValue | undefined
): number {
    if (!value) return 0;
    const known = new Set(columns.map(({ id }) => id));
    let hidden = 0;
    for (const [columnId, copies] of Object.entries(value.columns)) {
        if (known.has(columnId)) continue;
        for (const copy of copies) {
            hidden += Math.max(1, countEntries(copy.marks) + countEntries(copy.texts));
        }
    }
    return hidden;
}
