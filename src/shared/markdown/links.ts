/**
 * Links between documents as written in markdown (spec 044, D4): `[[Name]]`, `[[Folder/Name]]`,
 * `[[Name#Section]]`, `[[Name|text]]`, and `![[…]]` embeds. A line scan, not a parse, so a long
 * text is read on every save; code spans and fenced blocks are text, never links.
 */

/** The parts of a link's target: `Folder/Name#Section`. */
export interface LinkTarget {
    /** The name and its folder path as written, without the section (`World/Items/Sword`). */
    reference: string;
    name: string;
    /** The folders written before the name (`World/Items`). */
    path?: string;
    section?: string;
}

export interface LinkRef extends LinkTarget {
    embed: boolean;
    alias?: string;
    /** 0-based line of the text. */
    line: number;
    /** The line around the link, at most `CONTEXT_MAX` characters. */
    context: string;
}

export const CONTEXT_MAX = 160;
/** At most this many links are read from one text. */
export const LINKS_PER_TEXT_MAX = 2000;

const LINK = /(!?)\[\[([^\]|\n]+?)(?:\|([^\]\n]*))?\]\]/g;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const CODE_SPAN = /(`+)(?:(?!\1)[\s\S])+?\1/g;

/** A name as links compare it: case-insensitive, spaces collapsed, a trailing `.md` dropped. */
export function linkName(value: string): string {
    return value
        .normalize('NFC')
        .toLocaleLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\.md$/, '');
}

/** The name, folder path, and section of a target as written. */
export function splitLinkTarget(raw: string): LinkTarget {
    const hash = raw.indexOf('#');
    const reference = (hash >= 0 ? raw.slice(0, hash) : raw).trim();
    const section = hash >= 0 ? raw.slice(hash + 1).trim() : '';
    const slash = reference.lastIndexOf('/');
    const name = (slash >= 0 ? reference.slice(slash + 1) : reference).trim();
    const path = slash >= 0 ? reference.slice(0, slash).trim() : '';
    return {
        reference,
        name,
        ...(path ? { path } : {}),
        ...(section ? { section } : {}),
    };
}

/** A line with its code spans blanked out, so offsets stay where they were. */
const withoutCode = (line: string) =>
    line.includes('`') ? line.replace(CODE_SPAN, (span) => ' '.repeat(span.length)) : line;

function contextOf(line: string, start: number, end: number): string {
    const text = line.trim();
    if (text.length <= CONTEXT_MAX) return text;
    const offset = line.length - line.trimStart().length;
    const middle = Math.floor((start + end) / 2) - offset;
    const from = Math.max(0, Math.min(text.length - CONTEXT_MAX, middle - CONTEXT_MAX / 2));
    return text.slice(from, from + CONTEXT_MAX);
}

/** Visits every link outside code, line by line; `visit` returning `false` stops. */
function scan(
    text: string,
    visit: (match: RegExpExecArray, line: string, index: number) => boolean | void
): void {
    const lines = text.split('\n');
    let fence: string | undefined;
    for (const [index, line] of lines.entries()) {
        const marker = FENCE.exec(line)?.[1];
        if (fence) {
            if (marker && marker[0] === fence[0] && marker.length >= fence.length)
                fence = undefined;
            continue;
        }
        if (marker) {
            fence = marker;
            continue;
        }
        if (!line.includes('[[')) continue;
        const visible = withoutCode(line);
        for (const match of visible.matchAll(LINK)) {
            if (visit(match, line, index) === false) return;
        }
    }
}

/** Every link of a text outside code, in reading order. Links without a name are skipped. */
export function extractLinks(text: string): LinkRef[] {
    const links: LinkRef[] = [];
    scan(text, (match, line, index) => {
        const target = splitLinkTarget(match[2] ?? '');
        if (!target.name) return;
        const start = match.index;
        const alias = match[3]?.trim();
        links.push({
            ...target,
            embed: match[1] === '!',
            ...(alias ? { alias } : {}),
            line: index,
            context: contextOf(line, start, start + match[0].length),
        });
        return links.length < LINKS_PER_TEXT_MAX;
    });
    return links;
}

/**
 * Replaces the reference (name and folder path) of links written as one of `edits`' keys, keeping
 * the section, the alias, and `!`; code is never touched. Returns the text and how many links
 * changed.
 */
export function rewriteLinks(
    text: string,
    edits: ReadonlyMap<string, string>
): { text: string; count: number } {
    if (edits.size === 0) return { text, count: 0 };
    const found: Array<{ line: number; at: number; length: number; replacement: string }> = [];
    scan(text, (match, _line, index) => {
        const { reference, section } = splitLinkTarget(match[2] ?? '');
        const next = edits.get(reference);
        if (next === undefined) return;
        const target = section === undefined ? next : `${next}#${section}`;
        const alias = match[3] === undefined ? '' : `|${match[3]}`;
        found.push({
            line: index,
            at: match.index,
            length: match[0].length,
            replacement: `${match[1]}[[${target}${alias}]]`,
        });
    });
    if (found.length === 0) return { text, count: 0 };
    const lines = text.split('\n');
    // Right to left, so earlier offsets on a line stay valid.
    for (const { line, at, length, replacement } of found.reverse()) {
        const current = lines[line] ?? '';
        lines[line] = `${current.slice(0, at)}${replacement}${current.slice(at + length)}`;
    }
    return { text: lines.join('\n'), count: found.length };
}
