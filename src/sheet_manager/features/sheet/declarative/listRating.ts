import { bookNameOf, type CatalogBindingEntry } from '../../../systems/catalogs';

const LOCALES = ['en', 'ru'] as const;

const normalize = (text: string) => text.trim().toLocaleLowerCase();

/** One list entry as `rating()` reads it: its written name and its rating. */
export interface RatedEntry {
    name: string;
    value: number;
}

/**
 * Every name the entry called `name` goes by: with a catalog, all names of the catalog entry that
 * answers to it (English, translated, the book name in parentheses); otherwise the name itself.
 */
function namesFor(name: string, catalog: CatalogBindingEntry | undefined): Set<string> {
    const wanted = normalize(name);
    const entry = catalog?.entries.find(
        (candidate) =>
            LOCALES.some(
                (locale) =>
                    normalize(catalog.entryLabel(candidate, locale)) === wanted ||
                    normalize(catalog.pickLabel(candidate, locale)) === wanted
            ) || normalize(candidate.name) === wanted
    );
    if (!catalog || !entry) return new Set([wanted]);
    return new Set(
        LOCALES.flatMap((locale) => [
            catalog.entryLabel(entry, locale),
            catalog.pickLabel(entry, locale),
        ])
            .concat(entry.name)
            .map(normalize)
    );
}

/**
 * `rating(list, "Name")` (spec 038 D3): the rating of the list's entry with that name, under any
 * of its names; the highest when the name is written twice; 0 when the list has none.
 */
export function listRating(
    entries: readonly RatedEntry[],
    name: string,
    catalog?: CatalogBindingEntry
): number {
    const names = namesFor(name, catalog);
    let rating = 0;
    for (const entry of entries) {
        const book = bookNameOf(entry.name);
        if (names.has(normalize(entry.name)) || (book && names.has(normalize(book)))) {
            rating = Math.max(rating, entry.value);
        }
    }
    return rating;
}

/** Reads `{name|label, value|points}` records of a built-in or template list. */
export function ratedEntries(stored: unknown): RatedEntry[] {
    if (!Array.isArray(stored)) return [];
    return stored.flatMap((raw) => {
        const record = raw as {
            name?: unknown;
            label?: unknown;
            value?: unknown;
            points?: unknown;
        };
        const name = typeof record.name === 'string' ? record.name : record.label;
        const value = typeof record.value === 'number' ? record.value : record.points;
        return typeof name === 'string' && typeof value === 'number' ? [{ name, value }] : [];
    });
}
