import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const MDX_ROOTS = ['docs', 'i18n', 'src/pages'];
const RESOLVABLE_EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '.mdx', '.md', '.json'];

function listMdxFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((name) => {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) return listMdxFiles(full);
        return full.endsWith('.mdx') ? [full] : [];
    });
}

/** Import specifiers outside fenced code blocks, where example snippets may show any path. */
function importSpecifiers(source: string): string[] {
    const prose = source.replace(/^(```|~~~)[\s\S]*?^\1/gm, '');
    return [...prose.matchAll(/^(?:import|export)\s[\s\S]*?\bfrom\s+['"]([^'"]+)['"]/gm)].map(
        (match) => match[1]
    );
}

function resolves(base: string): boolean {
    return RESOLVABLE_EXTENSIONS.some((ext) => {
        const candidate = base + ext;
        if (existsSync(candidate) && statSync(candidate).isFile()) return true;
        return ['index.ts', 'index.tsx', 'index.js'].some((index) =>
            existsSync(path.join(base, index))
        );
    });
}

const files = MDX_ROOTS.flatMap((dir) => listMdxFiles(path.join(ROOT, dir)));

describe('MDX imports', () => {
    it('finds MDX files to check', () => {
        expect(files.length).toBeGreaterThan(0);
    });

    it.each(files.map((file) => [path.relative(ROOT, file), file]))(
        '%s uses @site/ for project code and every local import resolves',
        (_relative, file) => {
            const problems: string[] = [];
            for (const specifier of importSpecifiers(readFileSync(file, 'utf8'))) {
                if (specifier.startsWith('/')) {
                    problems.push(`${specifier}: root-absolute path; use @site/…`);
                } else if (specifier.startsWith('.')) {
                    const target = path.resolve(path.dirname(file), specifier);
                    if (path.relative(ROOT, target).startsWith('src')) {
                        problems.push(`${specifier}: relative path into src/; use @site/…`);
                    } else if (!resolves(target)) {
                        problems.push(`${specifier}: file not found`);
                    }
                } else if (
                    specifier.startsWith('@site/') &&
                    !resolves(path.join(ROOT, specifier.slice('@site/'.length)))
                ) {
                    problems.push(`${specifier}: file not found`);
                }
            }
            expect(problems).toEqual([]);
        }
    );
});
