import {
    CONTEXT_MAX,
    extractLinks,
    rewriteLinks,
    splitLinkTarget,
} from '@site/src/shared/markdown/links';
import { describe, expect, it } from 'vitest';

/** Links between documents as written (spec 044, D4). */

describe('splitLinkTarget', () => {
    it('reads the folder path, the name, and the section', () => {
        expect(splitLinkTarget(' World/Items/Sword #History ')).toEqual({
            reference: 'World/Items/Sword',
            name: 'Sword',
            path: 'World/Items',
            section: 'History',
        });
        expect(splitLinkTarget('Ines Ruiz')).toEqual({ reference: 'Ines Ruiz', name: 'Ines Ruiz' });
    });
});

describe('extractLinks', () => {
    it('finds links, embeds, aliases, paths, and sections with their line', () => {
        const links = extractLinks(
            'Meet [[Ines Ruiz]] and [[The Lantern Choir|the choir]].\n' +
                '![[Bruno Kessel]] then [[World/Items/Sword#History]]'
        );
        expect(links).toEqual([
            expect.objectContaining({ name: 'Ines Ruiz', embed: false, line: 0 }),
            expect.objectContaining({ name: 'The Lantern Choir', alias: 'the choir', line: 0 }),
            expect.objectContaining({ name: 'Bruno Kessel', embed: true, line: 1 }),
            expect.objectContaining({
                name: 'Sword',
                path: 'World/Items',
                section: 'History',
                line: 1,
            }),
        ]);
        expect(links[0]?.context).toBe('Meet [[Ines Ruiz]] and [[The Lantern Choir|the choir]].');
    });

    it('skips code spans, fenced blocks, and links without a name', () => {
        const text = [
            'Real [[A]] and `[[B]]` and ``x [[C]] x``',
            '```',
            '[[D]]',
            '```',
            '~~~~',
            '[[E]]',
            '~~~',
            '[[F]]',
            '~~~~',
            '[[#Only a section]] [[G]]',
        ].join('\n');
        expect(extractLinks(text).map(({ name }) => name)).toEqual(['A', 'G']);
    });

    it('keeps the context around a link on a long line', () => {
        const line = `${'a'.repeat(400)} [[Far]] ${'b'.repeat(400)}`;
        const [link] = extractLinks(line);
        expect(link?.context.length).toBe(CONTEXT_MAX);
        expect(link?.context).toContain('[[Far]]');
    });
});

describe('rewriteLinks', () => {
    it('changes only the named references and keeps section, alias, and embed', () => {
        const text = [
            '[[Ines]] met [[Ines|her]] at ![[Ines#Bio]]; [[Inessa]] stayed.',
            '`[[Ines]]` is code',
            '```',
            '[[Ines]]',
            '```',
        ].join('\n');
        const result = rewriteLinks(text, new Map([['Ines', 'Ines Ruiz']]));
        expect(result.count).toBe(3);
        expect(result.text.split('\n')[0]).toBe(
            '[[Ines Ruiz]] met [[Ines Ruiz|her]] at ![[Ines Ruiz#Bio]]; [[Inessa]] stayed.'
        );
        expect(result.text.split('\n').slice(1)).toEqual(text.split('\n').slice(1));
    });

    it('rewrites a written path and returns the same text when nothing matches', () => {
        expect(
            rewriteLinks('[[Items/Sword]]', new Map([['Items/Sword', 'World/Items/Sword']])).text
        ).toBe('[[World/Items/Sword]]');
        const same = 'nothing here';
        expect(rewriteLinks(same, new Map([['A', 'B']]))).toEqual({ text: same, count: 0 });
    });
});
