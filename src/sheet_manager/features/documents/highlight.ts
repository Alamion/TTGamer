import { normalizeSearchText } from '@site/src/shared/utils/normalizeSearchText';

export interface NameSegment {
    text: string;
    match: boolean;
}

/** The name split into runs that match a search and runs that do not (same rules as the search). */
export function highlightSegments(name: string, query: string): NameSegment[] {
    const parts = normalizeSearchText(query).split(/\s+/).filter(Boolean);
    if (parts.length === 0 || !name) return [{ text: name, match: false }];
    // The normalized text with, for each of its characters, where it came from in the name.
    let normalized = '';
    const origin: number[] = [];
    let at = 0;
    for (const char of name) {
        const piece = /\s/u.test(char) ? ' ' : normalizeSearchText(char);
        for (const unit of piece) {
            normalized += unit;
            origin.push(at);
        }
        at += char.length;
    }
    const marked = new Array<boolean>(name.length).fill(false);
    for (const part of parts) {
        let from = normalized.indexOf(part);
        while (from >= 0) {
            const start = origin[from]!;
            const last = from + part.length - 1;
            const end = (origin[last] ?? start) + 1;
            for (let index = start; index < Math.min(end, marked.length); index += 1) {
                marked[index] = true;
            }
            from = normalized.indexOf(part, from + part.length);
        }
    }
    const segments: NameSegment[] = [];
    for (let index = 0; index < name.length; index += 1) {
        const last = segments.at(-1);
        if (last && last.match === marked[index]) last.text += name[index];
        else segments.push({ text: name[index]!, match: marked[index]! });
    }
    return segments;
}
