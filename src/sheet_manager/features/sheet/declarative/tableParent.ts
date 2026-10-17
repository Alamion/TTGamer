import type { CatalogParent } from '../../../types/template';
import { CATALOG_LOOKUP, readCatalogDetails } from '../data/catalogBindings';
import type { RatedList } from './hooks';
import { entryIdsNamed } from './rowsCatalog';

/** A parent entry on the page: the name it is written under and its rating. */
interface ParentRating {
    name: string;
    value: number;
}

/**
 * Ratings of the parents named in the parent list, by parent entry id (spec 038): the list's
 * catalog finds an entry by any of its names; the highest rating wins when named twice.
 */
export function parentRatings(
    list: RatedList | undefined,
    locale: string
): Map<string, ParentRating> {
    const ratings = new Map<string, ParentRating>();
    if (!list?.catalog) return ratings;
    const lookup = {
        get: (id: string) => (id === list.catalog!.catalogId ? list.catalog : undefined),
    };
    for (const { name, value } of list.entries) {
        for (const id of entryIdsNamed(lookup, list.catalog.catalogId, [name], locale)) {
            const known = ratings.get(id);
            if (!known || known.value < value) ratings.set(id, { name, value });
        }
    }
    return ratings;
}

/** The parent id and level of one catalog entry, read from its details. */
function placeOf(catalogId: string, entryId: string, parent: CatalogParent, list: RatedList) {
    const details = readCatalogDetails(catalogId, entryId) ?? {};
    const via = details[parent.via];
    const level = parent.level !== undefined ? Number(details[parent.level]) : NaN;
    // A parent cell holds the parent's entry id, or its name.
    const parentId =
        typeof via === 'string' && list.catalog
            ? list.catalog.entries.some(({ id }) => id === via)
                ? via
                : [...entryIdsNamed(CATALOG_LOOKUP, list.catalog.catalogId, [via], 'en')][0]
            : undefined;
    return { parentId, level: Number.isFinite(level) ? level : undefined };
}

/**
 * The entries a row may pick: those of the parents on the page, up to each parent's rating.
 * Without any parent on the page every entry stays offered.
 */
export function offeredByParent<T extends { value: string }>(
    options: readonly T[],
    catalogId: string,
    parent: CatalogParent,
    list: RatedList | undefined,
    ratings: ReadonlyMap<string, ParentRating>
): readonly T[] {
    if (!list || ratings.size === 0) return options;
    return options.filter((option) => {
        const { parentId, level } = placeOf(catalogId, option.value, parent, list);
        const rating = parentId ? ratings.get(parentId) : undefined;
        return rating !== undefined && (level === undefined || level <= rating.value);
    });
}

/** The parent a picked entry is above (its level over the parent's rating), or `null`. */
export function aboveParent(
    catalogId: string,
    entryId: string,
    parent: CatalogParent,
    list: RatedList | undefined,
    ratings: ReadonlyMap<string, ParentRating>
): { parent: string; dots: number } | null {
    if (!list || parent.level === undefined || !entryId) return null;
    const { parentId, level } = placeOf(catalogId, entryId, parent, list);
    const rating = parentId ? ratings.get(parentId) : undefined;
    return rating && level !== undefined && level > rating.value
        ? { parent: rating.name, dots: rating.value }
        : null;
}
