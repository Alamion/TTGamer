import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * V5 documentation page format (specs/008 contracts/docs-structure.md): every page has a
 * description and opens with a short summary; guided creation steps embed the reader's own sheet.
 * The Dark Pack statement lives on one page (`dark-pack.mdx`) and nowhere else. English and Russian trees mirror each other.
 */

const ROOT = path.resolve(__dirname, '../..');
const TREES = {
    en: path.join(ROOT, 'docs/wod-v5'),
    ru: path.join(ROOT, 'i18n/ru/docusaurus-plugin-content-docs/current/wod-v5'),
} as const;
const SUMMARY_TITLES = { en: 'In short', ru: 'Коротко' } as const;

function mdxFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((entry) => {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) return mdxFiles(full);
        return full.endsWith('.mdx') ? [full] : [];
    });
}

const relative = (locale: keyof typeof TREES, file: string) => path.relative(TREES[locale], file);

describe('V5 documentation format', () => {
    it('has English pages', () => {
        expect(mdxFiles(TREES.en).length).toBeGreaterThan(20);
    });

    it('mirrors every English page in Russian', () => {
        const english = mdxFiles(TREES.en)
            .map((file) => relative('en', file))
            .sort();
        const russian = mdxFiles(TREES.ru)
            .map((file) => relative('ru', file))
            .sort();
        expect(russian).toEqual(english);
    });

    for (const locale of ['en', 'ru'] as const) {
        it(`follows the page anatomy (${locale})`, () => {
            for (const file of mdxFiles(TREES[locale])) {
                const name = relative(locale, file);
                const source = readFileSync(file, 'utf8');
                const frontMatter = /^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? '';
                expect(frontMatter, `${name}: description`).toMatch(/^description:\s*\S/m);
                expect(source, `${name}: summary`).toContain(`:::tip[${SUMMARY_TITLES[locale]}]`);
                const statements = source.match(/<PolicyStatement policy="dark-pack" \/>/g) ?? [];
                expect(statements, `${name}: Dark Pack statement only on its page`).toHaveLength(
                    name === 'dark-pack.mdx' ? 1 : 0
                );
                expect(source, `${name}: no legacy notice`).not.toMatch(/<PolicyNotice\b/);
                // An embed followed by more content is separated by two <br /> (see the docs skill).
                const lines = source.split('\n');
                lines.forEach((line, index) => {
                    if (line.trim() !== '</TWWrapper>') return;
                    const rest = lines.slice(index + 1).filter((next) => next.trim() !== '');
                    const next = rest[0]?.trim() ?? '';
                    if (!next || next.startsWith('#') || /^:::\s*$/.test(next)) return;
                    expect(rest.slice(0, 2), `${name}:${index + 1}: <br /> after embed`).toEqual([
                        '<br />',
                        '<br />',
                    ]);
                });
                if (/first-hunter\/0[2-9]-/.test(name)) {
                    expect(source, `${name}: sheet embed`).toMatch(
                        /<TemplateFragment systemId="wod-v5"/
                    );
                }
            }
        });
    }
});
