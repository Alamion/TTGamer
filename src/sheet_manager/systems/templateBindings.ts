import { systemRegistry } from './index';

/**
 * Document binding contract (system-independent): the closed set of document data addresses a
 * template can bind to. Each system plugin declares its bindings (`SystemPlugin.templateBindings`)
 * with every data path precomputed, so generic template code never knows a system's data shape.
 * Templates persist only the binding key.
 */

export type DocumentBindingKind =
    | 'trait'
    | 'list'
    | 'resource'
    | 'track'
    | 'field'
    | 'equipment'
    | 'rows';

interface BindingBase {
    key: string;
    kind: DocumentBindingKind;
    label: string;
    documentKinds: ReadonlySet<string>;
}

export interface TraitBinding extends BindingBase {
    kind: 'trait';
    /** Record in document data holding the trait (e.g. `attributes`). */
    map: string;
    traitKey: string;
    minimum: number;
    maximum: number;
    /** Value shown and used by formulas while the trait is unset. */
    defaultValue: number;
    /** Formula / shared value-key coordinate (kebab-case). */
    coordinate: string;
}

/** Entry shape of a bound list, selecting the list molecule and its raw↔entry mapping. */
export type SystemListShape = 'trait' | 'merit-flaw' | 'named-trait';

export interface ListCatalogSupport {
    /** Catalog adapter id in features/sheet/data/catalogBindings.ts (copy-on-select). */
    catalogId: string;
    /** Optional option filter (e.g. the merits/flaws split by entry type). */
    catalogFilter?: { key: string; value: string };
}

export interface ListBinding extends BindingBase {
    kind: 'list';
    listId: string;
    /** Array in document data holding the entries. */
    dataKey: string;
    entryShape: SystemListShape;
    catalog?: ListCatalogSupport;
    /** Coordinate a catalog fill can target (entries replace the whole list). */
    coordinate?: string;
}

/** Raw document-data entry for a new list item, shaped by the list's entry shape. */
export function createListEntry(
    shape: SystemListShape,
    entry: { id: string; label: string; value: number }
): Record<string, unknown> {
    switch (shape) {
        case 'named-trait':
            return { id: entry.id, name: entry.label, value: entry.value };
        case 'merit-flaw':
            // Merits and flaws are worth 1–5 points; an unvalued preset starts at 1.
            return {
                id: entry.id,
                label: entry.label,
                points: Math.min(Math.max(entry.value, 1), 5),
            };
        case 'trait':
            return { ...entry };
    }
}

export interface ResourceBinding extends BindingBase {
    kind: 'resource';
    resourceId: string;
    /** `pool` → `{ current, max }` object; `rating` → plain number. */
    dataKey: string;
    mode: 'pool' | 'rating';
    maximum: number;
    coordinate: string;
    /** Pools: raising `current` above `max` raises `max` too (otherwise current is capped). */
    currentRaisesMax?: boolean;
}

export interface TrackLevel {
    id: string;
    label: string;
    /** Dice penalty while this is the deepest marked level; null = none. */
    penalty: number | null;
    /** Translation descriptor for the level name; `label` is the untranslated fallback. */
    translation?: { id: string; message: string };
}

export interface TrackBinding extends BindingBase {
    kind: 'track';
    trackId: string;
    /**
     * Record in document data holding `{ levels: ConditionMark[] }`; with `members`, the array
     * of members, each holding the track under `members.trackKey`.
     */
    dataKey: string;
    levels: readonly TrackLevel[];
    /** One track per member (groups, packs, squadrons). */
    members?: { trackKey: string; maxMembers: number };
    /**
     * Visible level sets by track length; the length is read at `lengthPath` in document data.
     * Visible level i is stored in slot i.
     */
    variants?: {
        lengthPath: readonly string[];
        levelsByLength: Readonly<Record<number, readonly TrackLevel[]>>;
    };
}

/** Visible levels of a track for a given stored length (falls back to the full track). */
export function trackLevelsFor(binding: TrackBinding, length: unknown): readonly TrackLevel[] {
    if (!binding.variants || typeof length !== 'number') return binding.levels;
    return binding.variants.levelsByLength[length] ?? binding.levels;
}

export interface BindingOption {
    id: string;
    label: string;
    translation?: { id: string; message: string };
}

export interface FieldBinding extends BindingBase {
    kind: 'field';
    /** Path inside document data, e.g. `['metadata', 'name']` or `['experience', 'total']`. */
    path: readonly string[];
    valueType: 'string' | 'number' | 'image' | 'enum';
    coordinate: string;
    /** Closed value set (`enum`); ids are the stored values. */
    options?: readonly BindingOption[];
    /** Numeric reading of a text value for formulas (e.g. `'+3D'` → 3). */
    numeric?: (raw: unknown) => number | undefined;
    /** Writing this field also renames the document (entities without a metadata name). */
    syncsTitle?: boolean;
    /**
     * Custom mapping for values not stored at a single path (e.g. a portrait split across
     * `imageUrl` / `portraitId`): `read` yields the field value, `update` the top-level update.
     */
    adapter?: {
        read: (data: unknown) => unknown;
        update: (data: unknown, value: unknown) => Record<string, unknown>;
    };
    /**
     * Keeps the top-level record valid after a write (e.g. spent XP never above total). Receives
     * and returns the value stored under `path[0]`.
     */
    constrain?: (record: unknown) => unknown;
}

/** Reads a nested document-data value. */
export function readDataPath(data: unknown, path: readonly string[]): unknown {
    let current: unknown = data;
    for (const key of path) {
        if (current === null || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[key];
    }
    return current;
}

/**
 * The top-level update (`{ [path[0]]: nextRecord }`) that writes `value` at a field binding's
 * path, preserving sibling keys and applying the binding's `constrain`.
 */
export function fieldBindingUpdate(
    binding: FieldBinding,
    data: unknown,
    value: unknown
): Record<string, unknown> {
    const [head, ...rest] = binding.path;
    if (!head) return {};
    const setIn = (current: unknown, keys: readonly string[]): unknown => {
        if (keys.length === 0) return value;
        const [key, ...tail] = keys;
        const record =
            current !== null && typeof current === 'object'
                ? (current as Record<string, unknown>)
                : {};
        return { ...record, [key!]: setIn(record[key!], tail) };
    };
    const next = setIn(readDataPath(data, [head]), rest);
    return { [head]: binding.constrain ? binding.constrain(next) : next };
}

export type EquipmentSectionId = 'inventory' | 'armor' | 'weapons' | 'implants';

/** Catalog-backed equipment sections rendered through the body-section molecules. */
export interface EquipmentBinding extends BindingBase {
    kind: 'equipment';
    sectionId: EquipmentSectionId;
}

export interface RowsColumn {
    key: string;
    label: string;
    translation?: { id: string; message: string };
    /** `enum` stores option ids; an unknown stored value is shown as-is and kept until changed. */
    type: 'text' | 'enum';
    options?: readonly BindingOption[];
}

/**
 * An array of plain records in document data edited as a table (attacks, weapons, systems).
 * Every row carries a generated `id`; columns are the editable string properties.
 */
export interface RowsBinding extends BindingBase {
    kind: 'rows';
    dataKey: string;
    coordinate: string;
    maxRows: number;
    columns: readonly RowsColumn[];
    /**
     * Name-column suggestions: picking a catalog entry fills mapped columns of that row
     * (detail key → column key), overwriting them.
     */
    catalog?: {
        catalogIds: readonly string[];
        column: string;
        fills: Readonly<Record<string, string>>;
    };
}

export type DocumentBindingDescriptor =
    | TraitBinding
    | ListBinding
    | ResourceBinding
    | TrackBinding
    | FieldBinding
    | EquipmentBinding
    | RowsBinding;

export interface NumericCoordinate {
    coordinate: string;
    label: string;
}

export function listDocumentBindings(
    systemId: string,
    documentKind: string
): readonly DocumentBindingDescriptor[] {
    const bindings = systemRegistry.getSystem(systemId)?.templateBindings ?? [];
    return bindings.filter((binding) => binding.documentKinds.has(documentKind));
}

export function resolveDocumentBinding(
    systemId: string,
    documentKind: string,
    key: string
): DocumentBindingDescriptor | undefined {
    return listDocumentBindings(systemId, documentKind).find((binding) => binding.key === key);
}

/**
 * Bridges the shared value-key namespace into document data: a declarative field whose storage
 * coordinate matches a trait, resource, or identity field coordinate operates on document data
 * instead of the template value bag.
 */
export function resolveDataBindingByCoordinate(
    systemId: string,
    documentKind: string,
    coordinate: string
): TraitBinding | ResourceBinding | FieldBinding | undefined {
    for (const binding of listDocumentBindings(systemId, documentKind)) {
        if (
            (binding.kind === 'trait' || binding.kind === 'resource' || binding.kind === 'field') &&
            binding.coordinate === coordinate
        ) {
            return binding;
        }
    }
    return undefined;
}

/**
 * Numeric coordinates a formula can reference: trait values and pool parts. Pools expose
 * `.current` / `.max`; non-scalar bindings (lists, tracks, equipment) stay out of formulas.
 */
export function listNumericCoordinates(
    systemId: string,
    documentKind: string
): readonly NumericCoordinate[] {
    const coordinates: NumericCoordinate[] = [];
    for (const binding of listDocumentBindings(systemId, documentKind)) {
        if (binding.kind === 'trait') {
            coordinates.push({ coordinate: binding.coordinate, label: binding.label });
        } else if (
            binding.kind === 'field' &&
            (binding.valueType === 'number' || binding.numeric)
        ) {
            coordinates.push({ coordinate: binding.coordinate, label: binding.label });
        } else if (binding.kind === 'resource') {
            coordinates.push({
                coordinate: `${binding.coordinate}.current`,
                label: `${binding.label} (current)`,
            });
            coordinates.push({
                coordinate: `${binding.coordinate}.max`,
                label: `${binding.label} (max)`,
            });
        }
    }
    return coordinates;
}

export type BoundNumber = { bound: false } | { bound: true; value: number | undefined };

/**
 * Reads a formula coordinate from document data when a trait or resource binding owns it.
 * `bound: false` means the coordinate belongs to the template value bag instead.
 */
export function readBoundNumber(
    systemId: string,
    documentKind: string,
    data: Readonly<Record<string, unknown>>,
    path: string
): BoundNumber {
    const [head, part] = path.split('.');
    for (const binding of listDocumentBindings(systemId, documentKind)) {
        if (binding.kind === 'trait' && binding.coordinate === path) {
            const record = data[binding.map] as Record<string, { value?: number }> | undefined;
            return {
                bound: true,
                value: record?.[binding.traitKey]?.value ?? binding.defaultValue,
            };
        }
        if (binding.kind === 'field' && binding.coordinate === path) {
            const stored = readDataPath(data, binding.path);
            if (binding.numeric) return { bound: true, value: binding.numeric(stored) };
            if (binding.valueType === 'number') {
                return { bound: true, value: typeof stored === 'number' ? stored : 0 };
            }
        }
        if (binding.kind === 'resource' && binding.coordinate === head) {
            const stored = data[binding.dataKey];
            if (binding.mode === 'rating') {
                return {
                    bound: true,
                    value: part === 'max' || typeof stored !== 'number' ? undefined : stored,
                };
            }
            const pool = stored as { current?: number; max?: number } | undefined;
            return { bound: true, value: part === 'max' ? pool?.max : pool?.current };
        }
    }
    return { bound: false };
}

/** Bindings a coordinate write (e.g. a catalog fill) can target in document data. */
export type WritableBinding =
    | TraitBinding
    | ResourceBinding
    | FieldBinding
    | RowsBinding
    | (ListBinding & { coordinate: string });

export function resolveWritableBinding(
    systemId: string,
    documentKind: string,
    coordinate: string
): WritableBinding | undefined {
    for (const binding of listDocumentBindings(systemId, documentKind)) {
        if (
            (binding.kind === 'trait' ||
                binding.kind === 'resource' ||
                binding.kind === 'field' ||
                binding.kind === 'rows' ||
                binding.kind === 'list') &&
            binding.coordinate === coordinate
        ) {
            return binding as WritableBinding;
        }
    }
    return undefined;
}

let generatedRowCounter = 0;

/** Stable-enough row id for rows created by fills (documents re-parse, so ids only need uniqueness). */
export function createRowId(): string {
    generatedRowCounter += 1;
    return `row-${Date.now().toString(36)}-${generatedRowCounter.toString(36)}`;
}

const clampInt = (value: number, minimum: number, maximum: number) =>
    Math.max(minimum, Math.min(maximum, Math.trunc(value)));

/**
 * The top-level document-data update that stores `value` through a writable binding. `null`
 * clears (empty text, default trait, empty list); `undefined` must be filtered by the caller.
 */
export function boundWriteUpdate(
    binding: WritableBinding,
    data: Readonly<Record<string, unknown>>,
    value: unknown
): Record<string, unknown> {
    switch (binding.kind) {
        case 'trait': {
            const record = (data[binding.map] ?? {}) as Record<string, Record<string, unknown>>;
            const current = record[binding.traitKey] ?? {};
            const next =
                typeof value === 'number'
                    ? clampInt(value, binding.minimum, binding.maximum)
                    : binding.defaultValue;
            return {
                [binding.map]: { ...record, [binding.traitKey]: { ...current, value: next } },
            };
        }
        case 'resource': {
            if (binding.mode === 'rating') {
                return {
                    [binding.dataKey]:
                        typeof value === 'number' ? clampInt(value, 0, binding.maximum) : 0,
                };
            }
            const pool =
                typeof value === 'number'
                    ? { current: value, max: value }
                    : value && typeof value === 'object'
                      ? (value as { current?: number; max?: number })
                      : { current: 0, max: 0 };
            const max = clampInt(pool.max ?? 0, 0, binding.maximum);
            return {
                [binding.dataKey]: { current: clampInt(pool.current ?? 0, 0, max), max },
            };
        }
        case 'field': {
            const typed =
                binding.valueType === 'number'
                    ? typeof value === 'number'
                        ? value
                        : 0
                    : binding.valueType === 'enum'
                      ? binding.options?.some((option) => option.id === value)
                          ? value
                          : readDataPath(data, binding.path)
                      : value === null || value === undefined
                        ? ''
                        : String(value);
            return fieldBindingUpdate(binding, data, typed);
        }
        case 'rows': {
            const rows = Array.isArray(value) ? value : [];
            return {
                [binding.dataKey]: rows.slice(0, binding.maxRows).map((row) => {
                    const source = (row ?? {}) as Record<string, unknown>;
                    const entry: Record<string, unknown> = { id: createRowId() };
                    for (const column of binding.columns) {
                        const cell = source[column.key];
                        if (cell !== undefined && cell !== null) entry[column.key] = String(cell);
                    }
                    return entry;
                }),
            };
        }
        case 'list': {
            const entries = Array.isArray(value) ? value : [];
            return {
                [binding.dataKey]: entries.map((entry) => {
                    const source = (entry ?? {}) as { label?: unknown; value?: unknown };
                    return createListEntry(binding.entryShape, {
                        id: createRowId(),
                        label: String(source.label ?? ''),
                        value: typeof source.value === 'number' ? source.value : 0,
                    });
                }),
            };
        }
    }
}
