import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { parseDocsLink } from '@site/src/shared/utils/docsLink';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { walkTemplateNodes } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

/**
 * Every docs link a shipped sheet carries opens its part of the page in both languages (spec 045,
 * D3): Russian headings slug differently, so a linked heading carries the same explicit `{#id}` in
 * the English and the Russian page.
 */

const ROOT = path.resolve(__dirname, '../..');
const LOCALES = {
    en: path.join(ROOT, 'docs'),
    ru: path.join(ROOT, 'i18n/ru/docusaurus-plugin-content-docs/current'),
};

/** The page file of a docs path; Docusaurus drops a folder's or file's `NN-` order prefix. */
function pageFile(base: string, docPath: string): string | undefined {
    const segments = docPath
        .replace(/^\/docs\/?/, '')
        .replace(/\/$/, '')
        .split('/')
        .filter(Boolean);
    let dir = base;
    for (const [index, segment] of segments.entries()) {
        if (!existsSync(dir)) return undefined;
        const names = readdirSync(dir);
        const match = (name: string) =>
            name.replace(/^\d+-/, '').replace(/\.mdx?$/, '') === segment;
        const last = index === segments.length - 1;
        const file = last ? names.find((name) => /\.mdx?$/.test(name) && match(name)) : undefined;
        if (file) return path.join(dir, file);
        const folder = names.find((name) => !/\.mdx?$/.test(name) && match(name));
        if (!folder) return undefined;
        dir = path.join(dir, folder);
    }
    return ['index.mdx', 'index.md']
        .map((name) => path.join(dir, name))
        .find((file) => existsSync(file));
}

function shippedDocsLinks(): Map<string, string[]> {
    const links = new Map<string, string[]>();
    for (const system of systemRegistry.getSystems()) {
        for (const template of system.defaultTemplates ?? []) {
            walkTemplateNodes(template.children, (node) => {
                const docsPath = 'docsPath' in node ? node.docsPath : undefined;
                if (typeof docsPath !== 'string') return;
                const users = links.get(docsPath) ?? [];
                links.set(docsPath, [...users, `${template.id}/${node.id}`]);
            });
        }
    }
    return links;
}

describe('docs links of shipped sheets', () => {
    const links = shippedDocsLinks();

    it('exist', () => {
        expect(links.size).toBeGreaterThan(10);
    });

    it('name a page in both languages, and a heading with the same explicit anchor', () => {
        const problems: string[] = [];
        for (const [docsPath, users] of links) {
            const link = parseDocsLink(docsPath);
            if (link?.kind !== 'site') continue;
            const [page, anchor] = link.path.split('#') as [string, string | undefined];
            for (const [locale, base] of Object.entries(LOCALES)) {
                const file = pageFile(base, page);
                if (!file) {
                    problems.push(`${locale} ${docsPath}: no page (${users[0]})`);
                    continue;
                }
                if (!anchor) continue;
                const text = readFileSync(file, 'utf8');
                const heading = new RegExp(`^#{1,6}\\s.*\\\\?\\{#${anchor}\\}\\s*$`, 'm');
                if (!heading.test(text)) problems.push(`${locale} ${docsPath}: no {#${anchor}}`);
            }
        }
        expect(problems).toEqual([]);
    });
});
