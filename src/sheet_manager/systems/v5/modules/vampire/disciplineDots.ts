import { bookNameOf } from '../../../catalogs';
import { VAMPIRE_DISCIPLINES_CATALOG } from './catalogs';

const LOCALES = ['en', 'ru'] as const;

const normalize = (text: string) => text.trim().toLocaleLowerCase();

/** Every name a discipline is written under on a sheet, normalized. */
function namesOf(disciplineId: string): Set<string> {
    const entry = VAMPIRE_DISCIPLINES_CATALOG.entries.find(({ id }) => id === disciplineId);
    if (!entry) return new Set();
    return new Set(
        LOCALES.flatMap((locale) => [
            VAMPIRE_DISCIPLINES_CATALOG.entryLabel(entry, locale),
            VAMPIRE_DISCIPLINES_CATALOG.pickLabel(entry, locale),
        ])
            .concat(entry.name)
            .map(normalize)
    );
}

/**
 * Dots of one book discipline among a vampire's disciplines, by any of its names (or the book
 * name in parentheses); 0 when the vampire does not have it.
 */
export function disciplineDots(data: unknown, disciplineId: string): number {
    const rows = (data as { disciplines?: unknown } | null)?.disciplines;
    if (!Array.isArray(rows)) return 0;
    const names = namesOf(disciplineId);
    let dots = 0;
    for (const row of rows as Array<{ name?: unknown; value?: unknown }>) {
        if (typeof row.name !== 'string' || typeof row.value !== 'number') continue;
        const book = bookNameOf(row.name);
        if (names.has(normalize(row.name)) || (book && names.has(normalize(book)))) {
            dots = Math.max(dots, row.value);
        }
    }
    return dots;
}
