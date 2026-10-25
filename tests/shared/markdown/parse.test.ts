import {
    embedNames,
    parseInline,
    parseMarkdown,
    safeHref,
    toggleTaskLine,
} from '@site/src/shared/markdown/parse';
import type { MarkdownBlock, MarkdownInline } from '@site/src/shared/markdown/types';
import { describe, expect, it } from 'vitest';

const blocksOf = (source: string): MarkdownBlock[] =>
    parseMarkdown(source).map(({ block }) => block);
const text = (value: string): MarkdownInline => ({ type: 'text', text: value });

describe('blocks', () => {
    it('reads ATX and setext headings with their level', () => {
        expect(blocksOf('# One\n### Three ###\nTwo\n---\nOne again\n===')).toEqual([
            { type: 'heading', level: 1, children: [text('One')] },
            { type: 'heading', level: 3, children: [text('Three')] },
            { type: 'heading', level: 2, children: [text('Two')] },
            { type: 'heading', level: 1, children: [text('One again')] },
        ]);
    });

    it('makes every line of a paragraph its own paragraph', () => {
        expect(blocksOf('first line\nsecond line\n\nthird')).toEqual([
            { type: 'paragraph', children: [text('first line')] },
            { type: 'paragraph', children: [text('second line')] },
            { type: 'paragraph', children: [text('third')] },
        ]);
    });

    it('reads rules and fenced code with an info string, unclosed fences to the end', () => {
        expect(blocksOf('***\n```ts\nconst a = `x`;\n```\n~~~\nopen')).toEqual([
            { type: 'rule' },
            { type: 'code', language: 'ts', code: 'const a = `x`;' },
            { type: 'code', language: '', code: 'open' },
        ]);
    });

    it('keeps quotes with lazy continuation and stops at a new block', () => {
        expect(blocksOf('> quoted\nlazy\n- item')).toEqual([
            {
                type: 'quote',
                children: [
                    { type: 'paragraph', children: [text('quoted')] },
                    { type: 'paragraph', children: [text('lazy')] },
                ],
            },
            {
                type: 'list',
                ordered: false,
                start: 1,
                items: [{ children: [text('item')], lists: [] }],
            },
        ]);
    });

    it('reads callouts with their fold marker and a default title', () => {
        const [closed, open, plain] = blocksOf(
            '> [!info]- History\n> long text\n\n> [!Spoiler]+ Twist\n\n> [!warning]'
        );
        expect(closed).toMatchObject({
            type: 'callout',
            kind: 'info',
            fold: 'closed',
            title: [text('History')],
            children: [{ type: 'paragraph', children: [text('long text')] }],
        });
        expect(open).toMatchObject({ kind: 'spoiler', fold: 'open', title: [text('Twist')] });
        expect(plain).toMatchObject({ kind: 'warning', fold: null, title: [text('Warning')] });
    });

    it('nests lists by indentation, keeps loose lists whole, and marks tasks with their line', () => {
        const [list] = blocksOf('- [ ] buy dice\n  - [x] d10s\n\n- second\n3. third');
        expect(list).toEqual({
            type: 'list',
            ordered: false,
            start: 1,
            items: [
                {
                    children: [text('buy dice')],
                    task: { checked: false, line: 0 },
                    lists: [
                        {
                            type: 'list',
                            ordered: false,
                            start: 1,
                            items: [
                                {
                                    children: [text('d10s')],
                                    task: { checked: true, line: 1 },
                                    lists: [],
                                },
                            ],
                        },
                    ],
                },
                { children: [text('second')], lists: [] },
            ],
        });
        expect(blocksOf('- a\n3. third')[1]).toMatchObject({
            type: 'list',
            ordered: true,
            start: 3,
        });
    });

    it('reads pipe tables with alignment and escaped pipes', () => {
        expect(blocksOf('| NPC | Motive |\n|:---|---:|\n| Ines | a \\| b |')).toEqual([
            {
                type: 'table',
                align: ['left', 'right'],
                head: [[text('NPC')], [text('Motive')]],
                rows: [[[text('Ines')], [text('a | b')]]],
            },
        ]);
    });

    it('hides HTML comments without moving the lines after them', () => {
        const parsed = parseMarkdown('<!-- a\nnote -->\n- [ ] task');
        expect(parsed.map(({ block }) => block.type)).toEqual(['list']);
        expect(parsed[0]?.block).toMatchObject({ items: [{ task: { line: 2 } }] });
    });

    it('gives each top-level block its source and first line', () => {
        expect(
            parseMarkdown('# Title\n\ntext').map(({ source, line }) => ({ source, line }))
        ).toEqual([
            { source: '# Title', line: 0 },
            { source: 'text', line: 2 },
        ]);
    });
});

describe('inline', () => {
    it('reads emphasis, strong, strikethrough, and highlights with flanking rules', () => {
        expect(parseInline('**bold** *it* ~~old~~ ==warn== ** not ** snake_case_word')).toEqual([
            { type: 'strong', children: [text('bold')] },
            text(' '),
            { type: 'em', children: [text('it')] },
            text(' '),
            { type: 'del', children: [text('old')] },
            text(' '),
            { type: 'mark', children: [text('warn')] },
            text(' ** not ** snake_case_word'),
        ]);
        expect(parseInline('***both***')).toEqual([
            { type: 'em', children: [{ type: 'strong', children: [text('both')] }] },
        ]);
    });

    it('keeps code spans literal, with longer fences around backticks', () => {
        expect(parseInline('a `**x**` and ``b ` c``')).toEqual([
            text('a '),
            { type: 'code', code: '**x**' },
            text(' and '),
            { type: 'code', code: 'b ` c' },
        ]);
    });

    it('reads escapes and entities as text', () => {
        expect(parseInline('\\*not em\\* &amp;')).toEqual([text('*not em* &amp;')]);
    });

    it('reads links with titles and balanced parentheses, autolinks, and bare URLs', () => {
        expect(parseInline('[Foo](https://e.org/Foo_(bar) "T")')).toEqual([
            {
                type: 'link',
                href: 'https://e.org/Foo_(bar)',
                title: 'T',
                children: [text('Foo')],
            },
        ]);
        expect(parseInline('<https://e.org> <me@e.org> see https://e.org/x.')).toEqual([
            { type: 'link', href: 'https://e.org', children: [text('https://e.org')] },
            text(' '),
            { type: 'link', href: 'mailto:me@e.org', children: [text('me@e.org')] },
            text(' see '),
            { type: 'link', href: 'https://e.org/x', children: [text('https://e.org/x')] },
            text('.'),
        ]);
    });

    it('keeps wikilinks and embeds as written, with alias and alt', () => {
        expect(
            parseInline('[[Ines Ruiz]] [[Ines Ruiz|Ines]] ![[map.png]] ![[map.png|Map]]')
        ).toEqual([
            { type: 'wikilink', target: 'Ines Ruiz' },
            text(' '),
            { type: 'wikilink', target: 'Ines Ruiz', alias: 'Ines' },
            text(' '),
            { type: 'embed', name: 'map.png' },
            text(' '),
            { type: 'embed', name: 'map.png', alt: 'Map' },
        ]);
    });

    it('reads markdown images', () => {
        expect(parseInline('![A map](https://e.org/m.png "Map")')).toEqual([
            { type: 'image', src: 'https://e.org/m.png', alt: 'A map', title: 'Map' },
        ]);
    });

    it('leaves inline spoilers as literal text', () => {
        expect(parseInline('||hidden||')).toEqual([text('||hidden||')]);
    });
});

describe('helpers', () => {
    it('accepts only web, mail, anchor, and relative link targets', () => {
        expect(safeHref('https://e.org')).toBe(true);
        expect(safeHref('#scene')).toBe(true);
        expect(safeHref('notes/a.md')).toBe(true);
        expect(safeHref('java\tscript:alert(1)')).toBe(false);
        expect(safeHref('DATA:text/html,x')).toBe(false);
        expect(safeHref('&#106;avascript:alert(1)')).toBe(false);
        expect(safeHref('#scene:two')).toBe(true);
    });

    it('toggles the task checkbox of one line, inside quotes too', () => {
        expect(toggleTaskLine('- [ ] a\n- [x] b', 0)).toBe('- [x] a\n- [x] b');
        expect(toggleTaskLine('- [ ] a\n- [x] b', 1)).toBe('- [ ] a\n- [ ] b');
        expect(toggleTaskLine('> [!todo]\n> 1. [ ] c', 1)).toBe('> [!todo]\n> 1. [x] c');
        expect(toggleTaskLine('plain', 0)).toBe('plain');
    });

    it('lists the embed names a text references', () => {
        expect([...embedNames('![[a.png]] x ![[b.png|B]] ![[a.png]]')]).toEqual(['a.png', 'b.png']);
    });
});
