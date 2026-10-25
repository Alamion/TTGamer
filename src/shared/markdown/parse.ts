import type {
    MarkdownAlign,
    MarkdownBlock,
    MarkdownInline,
    MarkdownListBlock,
    MarkdownListItem,
    MarkdownTopBlock,
} from './types';

/**
 * Markdown to a small AST (spec 043, design D1). The syntax and its edge cases are ported from the
 * maintainer's SillyTavern WorldInfo Workspace preview (`src/core/preview.ts`, MIT): CommonMark/GFM
 * blocks, every line of a paragraph its own paragraph, Obsidian callouts, wikilinks, embeds, and
 * `==highlights==`. That module builds an HTML string; this one builds nodes, so a renderer can put
 * real controls (folding, checkboxes, rolls) in place and never needs to escape anything.
 */

/** Link targets that become links; any other scheme (`javascript:`, `data:`, …) stays text. */
export function safeHref(href: string): boolean {
    // Browsers ignore control characters and whitespace inside a scheme.
    const compact = [...href]
        .filter((char) => char.charCodeAt(0) > 0x20 && char.charCodeAt(0) !== 0x7f)
        .join('');
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
    if (scheme) return ['http', 'https', 'mailto'].includes((scheme[1] ?? '').toLowerCase());
    // A colon before any path part reads as a scheme somewhere (`&#106;avascript:`): not relative.
    return compact.startsWith('#') || !/^[^/?]*:/.test(compact);
}

// ---------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------

/** Finished nodes are parked behind markers so later rules never touch them. */
const STASH_OPEN = '';
const STASH_CLOSE = '';
/** Emphasis spans become an open and a close marker followed by a one-letter tag. */
const SPAN_OPEN = '';
const SPAN_CLOSE = '';
const WORD = '[\\p{L}\\p{N}_]';

type SpanTag = 'strong' | 'em' | 'del' | 'mark';
const SPAN_CODES: Readonly<Record<string, SpanTag>> = { s: 'strong', e: 'em', d: 'del', m: 'mark' };

/**
 * Emphasis needs non-space content next to its markers (`** x **` is text), and a marker never
 * borrows a character from a longer run (`**` is not two `*`).
 */
const EMPHASIS_RULES: ReadonlyArray<[RegExp, string]> = (() => {
    const span = (
        marker: string,
        char: string,
        codes: string,
        wordBound = false
    ): [RegExp, string] => {
        const before = wordBound ? `(?<!${WORD}|${char})` : `(?<!${char})`;
        const after = wordBound ? `(?!${WORD}|${char})` : `(?!${char})`;
        return [
            new RegExp(
                `${before}${marker}(?=[^\\s${char}])(.+?)(?<=[^\\s${char}])${marker}${after}`,
                'gu'
            ),
            codes,
        ];
    };
    return [
        span('\\*\\*\\*', '\\*', 'es'),
        span('\\*\\*', '\\*', 's'),
        span('__', '_', 's', true),
        span('\\*', '\\*', 'e'),
        span('_', '_', 'e', true),
        span('~~', '~', 'd'),
        span('==', '=', 'm'),
    ];
})();

function emphasis(text: string): string {
    let out = text;
    for (const [pattern, codes] of EMPHASIS_RULES) {
        out = out.replace(pattern, (_match, inner: string) => {
            const open = [...codes].map((code) => `${SPAN_OPEN}${code}`).join('');
            const close = [...codes]
                .reverse()
                .map((code) => `${SPAN_CLOSE}${code}`)
                .join('');
            return `${open}${inner}${close}`;
        });
    }
    return out;
}

/** Characters a backslash makes literal (CommonMark ASCII punctuation). */
const ESCAPABLE = /\\([!-/:-@[-`{-~])/g;
/** A link destination: no spaces, parentheses only balanced (`Foo_(bar)`). */
const DESTINATION = '(?:[^()\\s]|\\([^()\\s]*\\))+';
const TITLE = '(?:\\s+"(.*?)")?';
const LINK = new RegExp(`\\[([^\\]]+)\\]\\((<.*?>|${DESTINATION})${TITLE}\\)`, 'g');
/** Image references may contain spaces and balanced parentheses. */
const IMAGE = new RegExp(`!\\[([^\\]]*)\\]\\((<.+?>|(?:[^()]|\\([^()]*\\))+?)${TITLE}\\)`, 'g');
const EMBED = /!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;
const WIKILINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const AUTOLINK = /<((?:https?:\/\/|mailto:)[^\s<>]*?)>/g;
const MAIL_AUTOLINK = /<([\w.+-]+@[\w-]+(?:\.[\w-]+)+)>/g;
const BARE_URL = /\b(?:https?:\/\/|mailto:)[^\s<>"-]+/g;
const STASH_REF = new RegExp(`${STASH_OPEN}(\\d+)${STASH_CLOSE}`, 'g');

/** Trailing punctuation is not part of a bare URL; a `)` only when unbalanced. */
function trimUrl(url: string): string {
    let end = url.length;
    for (;;) {
        const last = url[end - 1] ?? '';
        const body = url.slice(0, end);
        if (/[.,;:!?'"\]*_~]/.test(last)) {
            end -= 1;
        } else if (
            last === ')' &&
            (body.match(/\)/g)?.length ?? 0) > (body.match(/\(/g)?.length ?? 0)
        ) {
            end -= 1;
        } else {
            return url.slice(0, end);
        }
    }
}

const unwrapAngle = (value: string) => value.replace(/^<(.*)>$/, '$1');

/** Text outside code spans: links, images, embeds, wikilinks, and emphasis. */
function parseText(text: string): MarkdownInline[] {
    const stash: MarkdownInline[] = [];
    const keep = (node: MarkdownInline) =>
        `${STASH_OPEN}${String(stash.push(node) - 1)}${STASH_CLOSE}`;
    /** A stashed string as plain text (attributes such as alt and title). */
    const plain = (value: string) =>
        value.replace(STASH_REF, (_match, index: string) => {
            const node = stash[Number(index)];
            return node?.type === 'text' ? node.text : '';
        });

    let out = text.replace(ESCAPABLE, (_match, char: string) => keep({ type: 'text', text: char }));
    out = out.replace(IMAGE, (_match, alt: string, ref: string, title?: string) =>
        keep({
            type: 'image',
            src: plain(unwrapAngle(ref)).trim(),
            alt: plain(alt),
            ...(title ? { title: plain(title) } : {}),
        })
    );
    out = out.replace(EMBED, (_match, name: string, alt?: string) =>
        keep({ type: 'embed', name: plain(name).trim(), ...(alt ? { alt: plain(alt) } : {}) })
    );
    out = out.replace(LINK, (_match, label: string, destination: string, title?: string) => {
        const href = plain(unwrapAngle(destination));
        if (!safeHref(href)) return label;
        return keep({
            type: 'link',
            href,
            ...(title ? { title: plain(title) } : {}),
            children: build(emphasis(label), stash),
        });
    });
    out = out.replace(AUTOLINK, (_match, url: string) =>
        keep({ type: 'link', href: url, children: [{ type: 'text', text: url }] })
    );
    out = out.replace(MAIL_AUTOLINK, (_match, mail: string) =>
        keep({ type: 'link', href: `mailto:${mail}`, children: [{ type: 'text', text: mail }] })
    );
    out = out.replace(BARE_URL, (match: string) => {
        const url = trimUrl(match);
        const link = keep({ type: 'link', href: url, children: [{ type: 'text', text: url }] });
        return `${link}${match.slice(url.length)}`;
    });
    out = out.replace(WIKILINK, (_match, target: string, alias?: string) =>
        keep({
            type: 'wikilink',
            target: plain(target).trim(),
            ...(alias ? { alias: plain(alias) } : {}),
        })
    );
    return build(emphasis(out), stash);
}

/** Builds nodes from text holding stash references and emphasis markers. */
function build(text: string, stash: readonly MarkdownInline[]): MarkdownInline[] {
    const root: MarkdownInline[] = [];
    const frames: Array<{ tag: SpanTag; children: MarkdownInline[] }> = [];
    let buffer = '';
    const target = () => frames.at(-1)?.children ?? root;
    const flush = () => {
        if (buffer === '') return;
        const children = target();
        const last = children.at(-1);
        if (last?.type === 'text') last.text += buffer;
        else children.push({ type: 'text', text: buffer });
        buffer = '';
    };
    let index = 0;
    while (index < text.length) {
        const char = text[index] ?? '';
        if (char === STASH_OPEN) {
            const end = text.indexOf(STASH_CLOSE, index);
            const node = stash[Number(text.slice(index + 1, end))];
            index = end + 1;
            if (!node) continue;
            if (node.type === 'text') {
                buffer += node.text;
            } else {
                flush();
                target().push(node);
            }
        } else if (char === SPAN_OPEN) {
            flush();
            const tag = SPAN_CODES[text[index + 1] ?? ''] ?? 'em';
            frames.push({ tag, children: [] });
            index += 2;
        } else if (char === SPAN_CLOSE) {
            flush();
            const tag = SPAN_CODES[text[index + 1] ?? ''] ?? 'em';
            index += 2;
            // Spans that cross (`**a *b** c*`) close at the first matching marker.
            const at = frames.map((frame) => frame.tag).lastIndexOf(tag);
            if (at === -1) continue;
            while (frames.length > at) {
                const frame = frames.pop();
                if (frame) target().push({ type: frame.tag, children: frame.children });
            }
        } else {
            buffer += char;
            index += 1;
        }
    }
    flush();
    while (frames.length > 0) {
        const frame = frames.pop();
        if (frame) target().push({ type: frame.tag, children: frame.children });
    }
    return root;
}

/**
 * Inline parses by text: typing changes one line, so a re-parse of a long note reuses the rest
 * (design D7). Returned nodes are never mutated after they are built.
 */
const inlineCache = new Map<string, MarkdownInline[]>();
const INLINE_CACHE_MAX = 20_000;

/**
 * Code spans are literal. A span opens with a run of backticks and closes with a run of the same
 * length (``a ` b``).
 */
export function parseInline(text: string): MarkdownInline[] {
    const cached = inlineCache.get(text);
    if (cached) return cached;
    const nodes = parseInlineUncached(text);
    if (inlineCache.size >= INLINE_CACHE_MAX) inlineCache.clear();
    inlineCache.set(text, nodes);
    return nodes;
}

function parseInlineUncached(text: string): MarkdownInline[] {
    const nodes: MarkdownInline[] = [];
    let plain = '';
    let index = 0;
    const flushPlain = () => {
        if (plain !== '') nodes.push(...parseText(plain));
        plain = '';
    };
    while (index < text.length) {
        const run = /^`+/.exec(text.slice(index));
        if (!run) {
            plain += text[index] ?? '';
            index += 1;
            continue;
        }
        const ticks = run[0];
        const close = new RegExp(`(?<!\`)${ticks}(?!\`)`).exec(text.slice(index + ticks.length));
        if (!close) {
            plain += ticks;
            index += ticks.length;
            continue;
        }
        let code = text
            .slice(index + ticks.length, index + ticks.length + close.index)
            .replace(/\n/g, ' ');
        if (/^ .*[^ ].* $/.test(code)) code = code.slice(1, -1);
        flushPlain();
        nodes.push({ type: 'code', code });
        index += ticks.length + close.index + ticks.length;
    }
    flushPlain();
    return nodes;
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const SETEXT = /^ {0,3}(=+|-+)[ \t]*$/;
const LIST_ITEM = /^(\s*)([-*+]|(\d{1,9})[.)])(?:[ \t]+(.*))?$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
const RULE = /^ {0,3}([-*_])([ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^ {0,3}>/;
const TASK = /^\[([ xX])\][ \t]+(.*)$/;
const CALLOUT = /^\[!([\w-]+)\]([+-]?)[ \t]*(.*)$/;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)[^`]*$/;

/** A source line and its number in the whole text. */
interface Line {
    text: string;
    line: number;
}

interface PendingItem {
    indent: number;
    ordered: boolean;
    start: number;
    text: string;
    line: number;
}

/** Tab = 4 columns, as in CommonMark. */
function indentOf(whitespace: string): number {
    return whitespace.replace(/\t/g, '    ').length;
}

function listItem(item: PendingItem): MarkdownListItem {
    const task = TASK.exec(item.text);
    if (!task) return { children: parseInline(item.text), lists: [] };
    return {
        children: parseInline(task[2] ?? ''),
        task: { checked: task[1] !== ' ', line: item.line },
        lists: [],
    };
}

/** Nested ordered and unordered lists from indentation. */
function buildList(items: readonly PendingItem[]): MarkdownListBlock[] {
    const top: MarkdownListBlock[] = [];
    const stack: Array<{ indent: number; list: MarkdownListBlock }> = [];
    for (const item of items) {
        let frame = stack.at(-1);
        while (frame && item.indent < frame.indent) {
            stack.pop();
            frame = stack.at(-1);
        }
        if (frame && item.indent === frame.indent && frame.list.ordered !== item.ordered) {
            stack.pop();
            frame = stack.at(-1);
        }
        if (!frame || item.indent > frame.indent) {
            const list: MarkdownListBlock = {
                type: 'list',
                ordered: item.ordered,
                start: item.start,
                items: [],
            };
            const parentItem = frame?.list.items.at(-1);
            if (parentItem) parentItem.lists.push(list);
            else top.push(list);
            stack.push({ indent: item.indent, list });
            frame = stack.at(-1);
        }
        frame?.list.items.push(listItem(item));
    }
    return top;
}

/** Cells of a table row; `\|` is a literal pipe. */
function splitRow(line: string): string[] {
    return line
        .trim()
        .replace(/^\|/, '')
        .replace(/(?<!\\)\|$/, '')
        .split(/(?<!\\)\|/)
        .map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function table(lines: readonly string[]): MarkdownBlock {
    const [head = '', separator = '', ...body] = lines;
    const align = splitRow(separator).map((cell): MarkdownAlign => {
        if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
        if (cell.endsWith(':')) return 'right';
        if (cell.startsWith(':')) return 'left';
        return null;
    });
    return {
        type: 'table',
        align,
        head: splitRow(head).map(parseInline),
        rows: body.map((row) => splitRow(row).map(parseInline)),
    };
}

function isTableStart(line: string, next: string | undefined): boolean {
    return line.includes('|') && TABLE_SEPARATOR.test(next ?? '');
}

/** Whether a line opens a block other than a paragraph (ends a lazy quote line). */
function startsBlock(line: string, next: string | undefined): boolean {
    return (
        ATX_HEADING.test(line) ||
        RULE.test(line) ||
        QUOTE.test(line) ||
        LIST_ITEM.test(line) ||
        isTableStart(line, next)
    );
}

/** Obsidian callout: `> [!note]- Title` → a titled, typed, maybe foldable quote. */
function quote(quoted: readonly Line[]): MarkdownBlock {
    const callout = CALLOUT.exec(quoted[0]?.text ?? '');
    if (!callout) return { type: 'quote', children: blocks(quoted).map(({ block }) => block) };
    const kind = (callout[1] ?? 'note').toLowerCase();
    const title = callout[3] ? callout[3] : kind.charAt(0).toUpperCase() + kind.slice(1);
    const marker = callout[2];
    return {
        type: 'callout',
        kind,
        title: parseInline(title),
        fold: marker === '-' ? 'closed' : marker === '+' ? 'open' : null,
        children: blocks(quoted.slice(1)).map(({ block }) => block),
    };
}

/** Block structure of lines without fences. Every line of a paragraph is its own paragraph. */
function blocks(lines: readonly Line[]): MarkdownTopBlock[] {
    const result: MarkdownTopBlock[] = [];
    let index = 0;
    const push = (block: MarkdownBlock, from: number) => {
        result.push({
            block,
            source: lines
                .slice(from, index)
                .map((line) => line.text)
                .join('\n'),
            line: lines[from]?.line ?? 0,
        });
    };
    while (index < lines.length) {
        const from = index;
        const line = lines[index]?.text ?? '';
        const next = lines[index + 1]?.text;
        const heading = ATX_HEADING.exec(line);
        if (line.trim() === '') {
            index += 1;
        } else if (heading) {
            index += 1;
            push(
                {
                    type: 'heading',
                    level: (heading[1] ?? '#').length,
                    children: parseInline(heading[2] ?? ''),
                },
                from
            );
        } else if (RULE.test(line)) {
            index += 1;
            push({ type: 'rule' }, from);
        } else if (QUOTE.test(line)) {
            const quoted: Line[] = [];
            while (index < lines.length) {
                const current = lines[index] ?? { text: '', line: 0 };
                if (QUOTE.test(current.text)) {
                    const text = current.text.replace(/^ {0,3}>[ \t]?/, '');
                    // Every line is its own paragraph, so a callout header starts its own block.
                    if (quoted.length > 0 && CALLOUT.test(text)) break;
                    quoted.push({ ...current, text });
                } else if (
                    // Lazy continuation: a plain line right after quoted text.
                    current.text.trim() !== '' &&
                    (quoted.at(-1)?.text ?? '').trim() !== '' &&
                    !startsBlock(current.text, lines[index + 1]?.text)
                ) {
                    quoted.push(current);
                } else {
                    break;
                }
                index += 1;
            }
            push(quote(quoted), from);
        } else if (isTableStart(line, next)) {
            const rows: string[] = [];
            while (index < lines.length && (lines[index]?.text ?? '').includes('|')) {
                rows.push(lines[index]?.text ?? '');
                index += 1;
            }
            push(table(rows), from);
        } else if (LIST_ITEM.test(line)) {
            const items: PendingItem[] = [];
            while (index < lines.length) {
                const current = lines[index] ?? { text: '', line: 0 };
                const match = LIST_ITEM.exec(current.text);
                const previous = items.at(-1);
                if (match && !RULE.test(current.text)) {
                    items.push({
                        indent: indentOf(match[1] ?? ''),
                        ordered: match[3] !== undefined,
                        start: match[3] !== undefined ? Number(match[3]) : 1,
                        text: match[4] ?? '',
                        line: current.line,
                    });
                } else if (previous && /^\s+\S/.test(current.text)) {
                    // An indented continuation line belongs to the item above.
                    previous.text += ` ${current.text.trim()}`;
                } else if (current.text.trim() === '') {
                    // A loose list: blank lines between items keep one list.
                    let ahead = index + 1;
                    while (ahead < lines.length && (lines[ahead]?.text ?? '').trim() === '') {
                        ahead += 1;
                    }
                    const following = lines[ahead]?.text ?? '';
                    if (!LIST_ITEM.test(following) || RULE.test(following)) break;
                    index = ahead;
                    continue;
                } else {
                    break;
                }
                index += 1;
            }
            for (const list of buildList(items)) push(list, from);
        } else if (next !== undefined && SETEXT.test(next) && next.trim() !== '') {
            // `Title` over `===` / `---`.
            index += 2;
            push(
                {
                    type: 'heading',
                    level: next.trim().startsWith('=') ? 1 : 2,
                    children: parseInline(line.trim()),
                },
                from
            );
        } else {
            index += 1;
            push({ type: 'paragraph', children: parseInline(line) }, from);
        }
    }
    return result;
}

/** HTML comments are notes for the author: blanked, keeping their line breaks. */
function blankComments(lines: readonly Line[]): Line[] {
    const joined = lines.map((line) => line.text).join('\n');
    if (!joined.includes('<!--')) return [...lines];
    const blanked = joined.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, ''));
    return blanked.split('\n').map((text, index) => ({ text, line: lines[index]?.line ?? 0 }));
}

/** Parses a whole markdown text into top-level blocks with their source. */
export function parseMarkdown(source: string): MarkdownTopBlock[] {
    const lines = source
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((text, line) => ({ text, line }));
    const result: MarkdownTopBlock[] = [];
    let text: Line[] = [];
    const flushText = () => {
        if (text.some((line) => line.text.trim() !== ''))
            result.push(...blocks(blankComments(text)));
        text = [];
    };
    let index = 0;
    while (index < lines.length) {
        const current = lines[index] ?? { text: '', line: 0 };
        const open = FENCE_OPEN.exec(current.text);
        if (!open) {
            text.push(current);
            index += 1;
            continue;
        }
        flushText();
        const marker = open[1] ?? '```';
        const fenceChar = marker.startsWith('`') ? '`' : '~';
        const close = new RegExp(`^ {0,3}${fenceChar}{${String(marker.length)},}[ \\t]*$`);
        const from = index;
        const code: string[] = [];
        index += 1;
        // An unclosed fence runs to the end, as in CommonMark.
        while (index < lines.length && !close.test(lines[index]?.text ?? '')) {
            code.push(lines[index]?.text ?? '');
            index += 1;
        }
        index += 1;
        result.push({
            block: { type: 'code', language: open[2] ?? '', code: code.join('\n') },
            source: lines
                .slice(from, index)
                .map((line) => line.text)
                .join('\n'),
            line: from,
        });
    }
    flushText();
    return result;
}

const TASK_LINE = /^((?: {0,3}>[ \t]?)*\s*(?:[-*+]|\d{1,9}[.)])[ \t]+\[)([ xX])(\][ \t])/;

/** Ticks or unticks the task checkbox on a source line; other text stays as it is. */
export function toggleTaskLine(source: string, line: number): string {
    const lines = source.split('\n');
    const current = lines[line];
    if (current === undefined) return source;
    const next = current.replace(
        TASK_LINE,
        (_match, before: string, mark: string, after: string) =>
            `${before}${mark === ' ' ? 'x' : ' '}${after}`
    );
    if (next === current) return source;
    lines[line] = next;
    return lines.join('\n');
}

/** Names of `![[name]]` embeds in a text (images a value still references). */
export function embedNames(source: string): Set<string> {
    const names = new Set<string>();
    for (const match of source.matchAll(EMBED)) {
        const name = (match[1] ?? '').trim();
        if (name) names.add(name);
    }
    return names;
}
