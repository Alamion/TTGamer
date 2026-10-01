import type { TrackMarkId } from '../../../systems/templateBindings';
import type { ConditionMark } from '../../../types/character';
import type {
    PrimitiveNode,
    TrackerColumn,
    TrackerDisplay,
    TrackerField,
    TrackerMarkKind,
} from '../../../types/template';
import type { TrackerCopyValue, TrackerValue } from '../../../types/templateValues';
import {
    copyLabel,
    coveredLevelIds,
    deepestMarked,
    isCopyOut,
    layerSource,
    lengthChangeHidesMarks,
    nextMarkId,
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
    marks: Readonly<Record<string, string>>;
    texts: Readonly<Record<string, string>>;
    out: boolean;
    /** Value of the deepest marked covered level; `undefined` when none. */
    total: string | undefined;
    hasValues: boolean;
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
    display: TrackerDisplay;
    marks: readonly Pick<TrackerMarkKind, 'id' | 'name' | 'symbol' | 'fill' | 'layer'>[];
    levels: readonly TrackerModelLevel[];
    valueColumn: { title: string; show: boolean };
    columns: readonly TrackerModelColumn[];
    total: boolean;
    legend: boolean;
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
    const kindIds = new Set(field.marks.map(({ id }) => id));
    const columns = new Map(field.columns.map((column) => [column.id, column]));
    let hidden = 0;
    for (const [columnId, copies] of Object.entries(value.columns)) {
        const column = columns.get(columnId);
        copies.forEach((copy, index) => {
            const copyCount = countEntries(copy.marks) + countEntries(copy.texts);
            if (!column || index >= (column.copies?.max ?? 1)) {
                hidden += Math.max(1, copyCount);
                return;
            }
            for (const [levelId, markId] of Object.entries(copy.marks ?? {})) {
                if (!levelIds.has(levelId) || !kindIds.has(markId)) hidden += 1;
            }
            for (const levelId of Object.keys(copy.texts ?? {})) {
                if (!levelIds.has(levelId)) hidden += 1;
            }
        });
    }
    return hidden;
}

function shownLevels(field: TrackerField, value: TrackerValue | undefined): string[] {
    return visibleLevelIds(
        field.levels.map(({ id }) => id),
        field.lengths,
        value?.length
    );
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
                const marks = copy.marks ?? {};
                const deepest =
                    column.kind === 'marks'
                        ? deepestMarked(field.marks, covered, marks)
                        : undefined;
                return {
                    id: copy.id,
                    label: repeatable ? `${column.title} ${copyLabel(index)}`.trim() : column.title,
                    ...(repeatable ? { letter: copyLabel(index) } : {}),
                    marks,
                    texts: copy.texts ?? {},
                    out:
                        column.kind === 'marks' &&
                        field.out &&
                        isCopyOut(field.marks, covered, marks),
                    total:
                        deepest === undefined ? undefined : byId.get(deepest)?.value || undefined,
                    hasValues: countEntries(copy.marks) + countEntries(copy.texts) > 0,
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

/** A box click: the next mark of the cycle, or empty after the last. */
export function toggleTrackerMark(
    field: Pick<TrackerField, 'columns' | 'marks'>,
    value: TrackerValue | undefined,
    columnId: string,
    copyId: string,
    levelId: string
): TrackerValue {
    return withCopy(field, value, columnId, copyId, (copy) => {
        const next = nextMarkId(field.marks, copy.marks?.[levelId]);
        return setOptional(
            copy,
            'marks',
            next === undefined
                ? withoutKey(copy.marks, levelId)
                : { ...copy.marks, [levelId]: next }
        );
    });
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
        let next: TrackerCopyValue = copy;
        if (source) next = setOptional(next, source, withoutKey(next[source], levelId));
        if (shown === markId) return next;
        const own = kind.layer === 'fill' ? 'marks' : 'outlines';
        return setOptional(next, own, { ...next[own], [levelId]: markId });
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
                lengthChangeHidesMarks(field.marks, before, after, copy.marks ?? {})
            )
    );
}

/** Steps the shown length; marks keep their shown position and fold into the new end. */
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
        columns[column.id] = columns[column.id]!.map((copy) =>
            setOptional(
                copy,
                'marks',
                emptyToUndefined(remapMarks(field.marks, before, after, copy.marks ?? {}))
            )
        );
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
