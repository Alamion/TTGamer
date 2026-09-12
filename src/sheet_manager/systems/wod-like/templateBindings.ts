import type { ResourceBinding, TrackBinding, TraitBinding } from '../templateBindings';
import type { WodSheetProfile, WodTraitGroup } from './profile';

/** Kebab coordinate form of a profile key ('Self Control' → 'self-control'). */
export function toCoordinate(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export interface WodTraitBindingOptions {
    documentKinds: ReadonlySet<string>;
    /** Document data record holding a group's traits; `undefined` skips the group. */
    recordFor: (group: WodTraitGroup) => string | undefined;
    /** Value of an unset trait in a group. */
    defaultValueFor: (group: WodTraitGroup) => number;
}

/** Trait bindings (`trait:<groupId>:<TraitKey>`) derived from a WoD profile. */
export function buildWodTraitBindings(
    profile: WodSheetProfile,
    { documentKinds, recordFor, defaultValueFor }: WodTraitBindingOptions
): TraitBinding[] {
    return profile.traitGroups.flatMap((group) => {
        const map = recordFor(group);
        if (!map) return [];
        return group.traits.map((trait) => ({
            key: `trait:${group.id}:${trait.key}`,
            kind: 'trait' as const,
            label: trait.label,
            documentKinds,
            map,
            traitKey: trait.key,
            minimum: trait.minimum,
            maximum: trait.maximum,
            defaultValue: defaultValueFor(group),
            coordinate: toCoordinate(trait.key),
        }));
    });
}

/**
 * Resource bindings (`resource:<resourceId>`) for the profile resources listed in `dataKeys`
 * (resource id → document data key); unlisted resources are not bindable.
 */
export function buildWodResourceBindings(
    profile: WodSheetProfile,
    options: { documentKinds: ReadonlySet<string>; dataKeys: Readonly<Record<string, string>> }
): ResourceBinding[] {
    return profile.resources.flatMap((resource) => {
        const dataKey = options.dataKeys[resource.id];
        if (!dataKey) return [];
        return [
            {
                key: `resource:${resource.id}`,
                kind: 'resource' as const,
                label: resource.label,
                documentKinds: options.documentKinds,
                resourceId: resource.id,
                dataKey,
                mode: resource.mode,
                maximum: resource.maximum,
                coordinate: toCoordinate(resource.id),
            },
        ];
    });
}

/** Condition-track bindings (`track:<trackId>`) for the profile tracks listed in `tracks`. */
export function buildWodTrackBindings(
    profile: WodSheetProfile,
    tracks: Readonly<
        Record<
            string,
            {
                dataKey: string;
                documentKinds: ReadonlySet<string>;
                /** Level id → translation descriptor. */
                levelTranslations?: Readonly<Record<string, { id: string; message: string }>>;
            }
        >
    >
): TrackBinding[] {
    return profile.conditionTracks.flatMap((track) => {
        const target = tracks[track.id];
        if (!target) return [];
        return [
            {
                key: `track:${track.id}`,
                kind: 'track' as const,
                label: track.label,
                documentKinds: target.documentKinds,
                trackId: track.id,
                dataKey: target.dataKey,
                levels: track.levels.map(({ id, label }) => {
                    const translation = target.levelTranslations?.[id];
                    return translation ? { id, label, translation } : { id, label };
                }),
            },
        ];
    });
}
