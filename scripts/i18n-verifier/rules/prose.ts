export interface ProseLine {
    line: number;
    text: string;
}

const FRONTMATTER_TEXT_KEYS = /^(title|sidebar_label|description):\s*(.*)$/;

/**
 * Human-readable text of an MDX page, line by line: frontmatter title/sidebar_label/description,
 * and body lines outside code fences, imports/exports, and JSX-only lines. Inline code, tags,
 * link targets, `{…}` expressions, comments, and URLs are removed.
 */
export function proseLines(content: string): ProseLine[] {
    const lines = content.split('\n');
    const result: ProseLine[] = [];
    let index = 0;
    if (lines[0]?.trim() === '---') {
        index = 1;
        while (index < lines.length && lines[index].trim() !== '---') {
            const match = FRONTMATTER_TEXT_KEYS.exec(lines[index]);
            if (match) {
                result.push({ line: index + 1, text: match[2].replace(/^["']|["']$/g, '') });
            }
            index++;
        }
        index++;
    }
    let fenced = false;
    let braceDepth = 0;
    let inTag = false;
    for (; index < lines.length; index++) {
        const raw = lines[index];
        const trimmed = raw.trim();
        if (/^(```|~~~)/.test(trimmed)) {
            fenced = !fenced;
            continue;
        }
        if (fenced) continue;
        // Multi-line imports, JSX tags, and `{…}` expressions are code, not prose.
        const insideCode = braceDepth > 0 || inTag;
        braceDepth = Math.max(
            0,
            braceDepth + (raw.match(/\{/g) ?? []).length - (raw.match(/\}/g) ?? []).length
        );
        if (/^(import|export)\s/.test(trimmed)) continue;
        if (inTag) {
            if (/>\s*$/.test(trimmed)) inTag = false;
            continue;
        }
        if (/^<[A-Za-z][\w.]*/.test(trimmed)) {
            inTag = !/>/.test(trimmed);
            continue;
        }
        if (insideCode || trimmed.startsWith('{')) continue;
        const text = raw
            .replace(/<!--.*?-->/g, ' ')
            .replace(/`[^`]*`/g, ' ')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\]\([^)]*\)/g, '] ')
            .replace(/\{[^}]*\}/g, ' ')
            .replace(/https?:\/\/\S+/g, ' ')
            .trim();
        if (text) result.push({ line: index + 1, text });
    }
    return result;
}

const LATIN_WORD = /\b[A-Za-z][A-Za-z'’-]+\b/g;
const CYRILLIC_WORD = /[А-Яа-яЁё][А-Яа-яЁё'’-]+/g;

/** True when a line of a translated page reads as English prose. */
export function isEnglishProse(text: string): boolean {
    const latin = (text.match(LATIN_WORD) ?? []).length;
    const cyrillic = (text.match(CYRILLIC_WORD) ?? []).length;
    return latin >= 4 && latin > cyrillic;
}
