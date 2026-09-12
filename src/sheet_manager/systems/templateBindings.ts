import { systemRegistry } from './index';

/**
 * Document binding contract (system-independent): the closed set of document data addresses a
 * template can bind to. Each system plugin declares its bindings (`SystemPlugin.templateBindings`)
 * with every data path precomputed, so generic template code never knows a system's data shape.
 * Templates persist only the binding key.
 */

export type DocumentBindingKind = 'trait' | 'list' | 'resource' | 'track' | 'field' | 'equipment';

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
}

export interface TrackLevel {
    id: string;
    label: string;
    /** Translation descriptor for the level name; `label` is the untranslated fallback. */
    translation?: { id: string; message: string };
}

export interface TrackBinding extends BindingBase {
    kind: 'track';
    trackId: string;
    /** Record in document data holding `{ levels: ConditionMark[] }`. */
    dataKey: string;
    levels: readonly TrackLevel[];
}

export interface FieldBinding extends BindingBase {
    kind: 'field';
    /** Key inside the document data's metadata record. */
    fieldKey: string;
    coordinate: string;
}

export type EquipmentSectionId = 'inventory' | 'armor' | 'weapons' | 'implants';

/** Catalog-backed equipment sections rendered through the body-section molecules. */
export interface EquipmentBinding extends BindingBase {
    kind: 'equipment';
    sectionId: EquipmentSectionId;
}

export type DocumentBindingDescriptor =
    | TraitBinding
    | ListBinding
    | ResourceBinding
    | TrackBinding
    | FieldBinding
    | EquipmentBinding;

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
