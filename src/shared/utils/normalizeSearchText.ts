/**
 * Search key for matching user queries against names in any supported language:
 * locale-lowercased, trimmed, `ё` folded to `е`, and diacritics removed (`Twi'lék` → `twi'lek`).
 * The breve is kept so `й` stays distinct from `и`.
 */
export function normalizeSearchText(value: string): string {
    return value
        .toLocaleLowerCase()
        .replace(/ё/g, 'е')
        .normalize('NFD')
        .replace(/(?!̆)\p{M}/gu, '')
        .normalize('NFC')
        .trim();
}

/** True when every whitespace-separated part of `query` occurs in one of `texts`. */
export function matchesSearch(query: string, ...texts: readonly (string | undefined)[]): boolean {
    const needle = normalizeSearchText(query);
    if (!needle) return true;
    const haystack = texts
        .filter((text): text is string => Boolean(text))
        .map(normalizeSearchText)
        .join('\n');
    return needle.split(/\s+/).every((part) => haystack.includes(part));
}
