import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Admonition syntax that MDX silently misreads: a paragraph glued to a closing JSX block swallows
 * the next lines, so a closing `:::` becomes text and the admonition runs to the end of the page.
 */

const ROOT = path.resolve(__dirname, '../..');
const TREES = ['docs', 'i18n/ru/docusaurus-plugin-content-docs/current'];

function mdxFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) return mdxFiles(full);
        return full.endsWith('.mdx') ? [full] : [];
    });
}

describe('MDX admonitions', () => {
    for (const tree of TREES) {
        it(`close on their own line and stay balanced (${tree})`, () => {
            for (const file of mdxFiles(path.join(ROOT, tree))) {
                const name = path.relative(ROOT, file);
                const lines = readFileSync(file, 'utf8').split('\n');
                let open = 0;
                let fenced = false;
                lines.forEach((line, index) => {
                    const where = `${name}:${index + 1}`;
                    if (line.trim().startsWith('```')) fenced = !fenced;
                    if (fenced) return;
                    expect(line, `${where}: ":::" glued to text`).not.toMatch(/\S\s*:::\s*$/);
                    if (/^\s*:::+\w/.test(line)) open += 1;
                    else if (/^\s*:::+\s*$/.test(line)) open -= 1;
                    const next = lines[index + 1];
                    if (/^\s*<\/[A-Z]\w*>\s*$/.test(line) && next !== undefined) {
                        expect(next, `${where}: blank line after a JSX block`).toMatch(
                            /^\s*$|^\s*<|^\s*:::/
                        );
                    }
                });
                expect(open, `${name}: unclosed admonition`).toBe(0);
            }
        });
    }
});
