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
    willpower?: { current: number; max: number };
    forcePoints?: { current: number; max: number };
    darkSideResistance?: number;
    health: { levels: unknown[] };
};

export type DocumentBindingKind = 'trait' | 'list' | 'resource' | 'track' | 'field';

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

export interface ListBinding extends BindingBase {
    kind: 'list';
    listId: 'customTalents' | 'customSkills' | 'customKnowledges';
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

export type DocumentBindingDescriptor =
    | TraitBinding
    | ListBinding
    | ResourceBinding
    | TrackBinding
    | FieldBinding;

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
    ] as const
).map(({ listId, label }) => ({
    key: `list:${listId}`,
    kind: 'list',
    label,
    documentKinds: CHARACTER_KINDS,
    listId,
}));

const characterFieldBindings: DocumentBindingDescriptor[] = (
    ['name', 'concept', 'player', 'nature', 'adventure', 'demeanor', 'species', 'age'] as const
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

/** Pure transform: replace a bound custom list. */
export function writeList(
    data: CharacterLike,
    listId: ListBinding['listId'],
    items: unknown[]
): CharacterLike {
    return { ...data, [listId]: items };
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
    const normalize = (value: string) =>
        value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    return listDocumentBindings(systemId, documentKind).find((binding) => {
        switch (binding.kind) {
            case 'trait':
                return normalize(binding.traitKey) === coordinate;
            case 'resource':
                return normalize(binding.resourceId) === coordinate;
            case 'field':
                return normalize(binding.fieldKey) === coordinate;
            default:
                return false;
        }
    });
}
