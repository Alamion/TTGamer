import type {
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
    marks: readonly Pick<TrackerMarkKind, 'id' | 'name' | 'symbol' | 'fill'>[];
    levels: readonly TrackerModelLevel[];
    valueColumn: { title: string; show: boolean };
    columns: readonly TrackerModelColumn[];
    total: boolean;
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
    const copies = stored.length > 0 ? stored : [{ id: copyId }];
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

function setOptional<K extends 'marks' | 'texts'>(
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
