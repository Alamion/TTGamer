import type { TraitValue } from '../../types/character';
import { starWarsWodProfile } from './profile';

/**
 * Document binding registry (feature 005, contracts/document-binding-registry.md): the closed
 * per-setup set of document data addresses a template primitive can bind to. Trait, resource,
 * and condition-track bindings derive from the system profile (single owner of names/limits);
 * identity fields and custom lists are declared explicitly. Templates persist only the key.
 */

export type CharacterLike = Record<string, unknown> & {
    metadata: Record<string, unknown>;
    attributes: Record<string, TraitValue>;
    skills: Record<string, TraitValue>;
    virtues?: Record<string, TraitValue>;
    forceSkills?: Record<string, TraitValue>;
    customTalents: unknown[];
    customSkills: unknown[];
    customKnowledges: unknown[];
    forcePowerItems?: unknown[];
    merits?: unknown[];
    flaws?: unknown[];
    backgrounds?: unknown[];
    inventory?: unknown[];
    armor?: unknown[];
    weapons?: unknown[];
    implants?: unknown[];
    willpower?: { current: number; max: number };
    forcePoints?: { current: number; max: number };
    darkSideResistance?: number;
    health: { levels: unknown[] };
};

export type DocumentBindingKind = 'trait' | 'list' | 'resource' | 'track' | 'field' | 'equipment';

interface BindingBase {
    key: string;
    kind: DocumentBindingKind;
    label: string;
    documentKinds: ReadonlySet<string>;
}

export interface TraitBinding extends BindingBase {
    kind: 'trait';
    /** Which character record holds the trait value. */
    map: 'attributes' | 'skills' | 'virtues' | 'forceSkills';
    traitKey: string;
    minimum: number;
    maximum: number;
}

/** System-owned lists a template list element can bind to (feature 006: beyond the skills domain). */
export type SystemListId =
    | 'customTalents'
    | 'customSkills'
    | 'customKnowledges'
    | 'forcePowers'
    | 'merits'
    | 'flaws'
    | 'backgrounds';

export interface ListCatalogSupport {
    /** Catalog adapter id in features/sheet/data/catalogBindings.ts (copy-on-select). */
    catalogId: string;
    /** Optional option filter (e.g. the merits/flaws split by entry type). */
    catalogFilter?: { key: string; value: string };
}

export interface ListBinding extends BindingBase {
    kind: 'list';
    listId: SystemListId;
    /** Declared when the list is catalog-backed (copy-on-select, built-in parity). */
    catalog?: ListCatalogSupport;
}

export interface ResourceBinding extends BindingBase {
    kind: 'resource';
    resourceId: 'willpower' | 'force-points' | 'dark-side-resistance';
    mode: 'pool' | 'rating';
    maximum: number;
}

export interface TrackBinding extends BindingBase {
    kind: 'track';
    trackId: 'health' | 'vehicle-damage';
}

export interface FieldBinding extends BindingBase {
    kind: 'field';
    /** Key inside the document data's metadata record. */
    fieldKey: string;
}

/** Catalog-backed equipment sections (feature 006): rendered through the body-section molecules. */
export interface EquipmentBinding extends BindingBase {
    kind: 'equipment';
    sectionId: 'inventory' | 'armor' | 'weapons' | 'implants';
}

export type DocumentBindingDescriptor =
    | TraitBinding
    | ListBinding
    | ResourceBinding
    | TrackBinding
    | FieldBinding
    | EquipmentBinding;

const CHARACTER_KINDS: ReadonlySet<string> = new Set(['character']);

function traitBindings(): DocumentBindingDescriptor[] {
    const bindings: DocumentBindingDescriptor[] = [];
    for (const group of starWarsWodProfile.traitGroups) {
        const map =
            group.role === 'attribute'
                ? 'attributes'
                : group.role === 'ability'
                  ? 'skills'
                  : group.role === 'virtue'
                    ? 'virtues'
                    : 'forceSkills';
        for (const trait of group.traits) {
            bindings.push({
                key: `trait:${group.id}:${trait.key}`,
                kind: 'trait',
                label: trait.label,
                documentKinds: CHARACTER_KINDS,
                map,
                traitKey: trait.key,
                minimum: trait.minimum,
                maximum: trait.maximum,
            });
        }
    }
    return bindings;
}

const resourceBindings: DocumentBindingDescriptor[] = (
    [
        { resourceId: 'willpower', dataKey: 'willpower', mode: 'pool', maximum: 10 },
        { resourceId: 'force-points', dataKey: 'forcePoints', mode: 'pool', maximum: 10 },
        {
            resourceId: 'dark-side-resistance',
            dataKey: 'darkSideResistance',
            mode: 'rating',
            maximum: 10,
        },
    ] as const
).flatMap(({ resourceId, mode, maximum }) => {
    const profileResource = starWarsWodProfile.resources.find(
        (resource) => resource.id === resourceId
    );
    if (!profileResource) return [];
    return [
        {
            key: `resource:${resourceId}`,
            kind: 'resource',
            label: profileResource.label,
            documentKinds: CHARACTER_KINDS,
            resourceId,
            mode,
            maximum,
        } satisfies DocumentBindingDescriptor,
    ];
});

const trackBindings: DocumentBindingDescriptor[] = starWarsWodProfile.conditionTracks.flatMap(
    (track) => {
        if (track.id !== 'health' && track.id !== 'vehicle-damage') return [];
        return [
            {
                key: `track:${track.id}`,
                kind: 'track',
                label: track.label,
                documentKinds: track.id === 'health' ? CHARACTER_KINDS : new Set(['vehicle']),
                trackId: track.id,
            } satisfies DocumentBindingDescriptor,
        ];
    }
);

const listBindings: DocumentBindingDescriptor[] = (
    [
        { listId: 'customTalents', label: 'Custom talents' },
        { listId: 'customSkills', label: 'Custom skills' },
        { listId: 'customKnowledges', label: 'Custom knowledges' },
        {
            listId: 'forcePowers',
            label: 'Force Powers',
            catalog: { catalogId: 'force-powers' },
        },
        {
            listId: 'merits',
            label: 'Merits',
            catalog: { catalogId: 'merits-flaws', catalogFilter: { key: 'type', value: 'Merit' } },
        },
        {
            listId: 'flaws',
            label: 'Flaws',
            catalog: { catalogId: 'merits-flaws', catalogFilter: { key: 'type', value: 'Flaw' } },
        },
        { listId: 'backgrounds', label: 'Backgrounds', catalog: { catalogId: 'backgrounds' } },
    ] as ReadonlyArray<{
        listId: SystemListId;
        label: string;
        catalog?: ListCatalogSupport;
    }>
).map(({ listId, label, catalog }) => ({
    key: `list:${listId}`,
    kind: 'list',
    label,
    documentKinds: CHARACTER_KINDS,
    listId,
    ...(catalog ? { catalog } : {}),
}));

const equipmentBindings: DocumentBindingDescriptor[] = (
    [
        { sectionId: 'inventory', label: 'Inventory' },
        { sectionId: 'armor', label: 'Dressed — Armor' },
        { sectionId: 'weapons', label: 'Dressed — Weapons' },
        { sectionId: 'implants', label: 'Implants & Cyberware' },
    ] as const
).map(({ sectionId, label }) => ({
    key: `equipment:${sectionId}`,
    kind: 'equipment',
    label,
    documentKinds: CHARACTER_KINDS,
    sectionId,
}));

const characterFieldBindings: DocumentBindingDescriptor[] = (
    [
        'name',
        'concept',
        'player',
        'nature',
        'adventure',
        'demeanor',
        'species',
        'age',
        'appearance',
        'biography',
    ] as const
).map((fieldKey) => ({
    key: `field:${fieldKey}`,
    kind: 'field',
    label: fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1),
    documentKinds: CHARACTER_KINDS,
    fieldKey,
}));

const bindings: readonly DocumentBindingDescriptor[] = [
    ...traitBindings(),
    ...resourceBindings,
    ...trackBindings,
    ...listBindings,
    ...equipmentBindings,
    ...characterFieldBindings,
];

/** Pure transform: merge a partial trait value into the bound record. */
export function writeTraitValue(
    data: CharacterLike,
    map: TraitBinding['map'],
    traitKey: string,
    patch: Partial<TraitValue>
): CharacterLike {
    const current =
        data[map]?.[traitKey] ??
        ({
            value: map === 'skills' ? 0 : 1,
            specialization: false,
            experienced: false,
            practiced: false,
        } as TraitValue);
    return { ...data, [map]: { ...data[map], [traitKey]: { ...current, ...patch } } };
}

/** Pure transform: replace a bound list (works for every SystemListId). */
export function writeList(
    data: CharacterLike,
    listId: SystemListId,
    items: unknown[]
): CharacterLike {
    return { ...data, [listId]: items };
}

/** Kebab coordinate form of a profile key ('Self Control' → 'self-control'). */
export function toCoordinate(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Document data key holding a bound list (FR: `forcePowerItems` is the single Force-power
 * representation; retired `forcePowers` keys are stripped from imports).
 */
export function systemListDataKey(listId: SystemListId): string {
    return listId === 'forcePowers' ? 'forcePowerItems' : listId;
}

export interface NumericCoordinate {
    coordinate: string;
    label: string;
}

/**
 * Numeric coordinates a formula can reference (feature 006): trait values and pool parts.
 * Pools expose `.current` / `.max` suffixes; non-scalar bindings (lists, tracks, equipment)
 * are not numeric and stay out of the formula space.
 */
export function listNumericCoordinates(
    systemId: string,
    documentKind: string
): readonly NumericCoordinate[] {
    const coordinates: NumericCoordinate[] = [];
    for (const binding of listDocumentBindings(systemId, documentKind)) {
        if (binding.kind === 'trait') {
            coordinates.push({
                coordinate: toCoordinate(binding.traitKey),
                label: `${binding.label}`,
            });
        } else if (binding.kind === 'resource') {
            const base = toCoordinate(binding.resourceId);
            coordinates.push({
                coordinate: `${base}.current`,
                label: `${binding.label} (current)`,
            });
            coordinates.push({ coordinate: `${base}.max`, label: `${binding.label} (max)` });
        }
    }
    return coordinates;
}

export function listDocumentBindings(
    systemId: string,
    documentKind: string
): readonly DocumentBindingDescriptor[] {
    // Only the star-wars-wod setup registers bindings; other setups declare their own modules.
    if (systemId !== 'star-wars-wod') return [];
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
 * Bridges the shared value-key namespace into document data (feature 005 review, 2026-09-05):
 * a declarative field whose storage coordinate matches a document data address operates on the
 * document data instead of the template value bag — the user-facing interface is identical for
 * system-backed and custom content. Coordinates are kebab-case forms of the profile keys
 * ('Strength' → 'strength', 'Self Control' → 'self-control', resources/fields as declared).
 */
export function resolveDataBindingByCoordinate(
    systemId: string,
    documentKind: string,
    coordinate: string
): DocumentBindingDescriptor | undefined {
    return listDocumentBindings(systemId, documentKind).find((binding) => {
        switch (binding.kind) {
            case 'trait':
                return toCoordinate(binding.traitKey) === coordinate;
            case 'resource':
                return toCoordinate(binding.resourceId) === coordinate;
            case 'field':
                return toCoordinate(binding.fieldKey) === coordinate;
            default:
                return false;
        }
    });
}
