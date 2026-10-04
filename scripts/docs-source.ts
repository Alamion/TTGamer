import { readdirSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

/** Developer pages: draft-only and English-only (constitution VI). */
const UNMIRRORED_ROOTS = new Set(['dev']);

/**
 * Documentation trees whose English pages must have Russian counterparts: every folder under
 * `docs/` except the developer pages, so a new tree needs no registration (spec 024).
 */
export function documentRoots(docsRoot = 'docs'): string[] {
    return readdirSync(docsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !UNMIRRORED_ROOTS.has(entry.name))
        .map((entry) => entry.name)
        .sort();
}
/** Top-level pages outside the trees (the docs landing page). */
export const ROOT_DOCUMENTS = ['index.mdx'] as const;
export const TRANSLATION_DOCS_ROOT = 'i18n/ru/docusaurus-plugin-content-docs/current';

/** Relative paths of every `.md`/`.mdx` page under `directory`, sorted. */
export async function collectDocuments(root: string, directory = root): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const paths = await Promise.all(
        entries.map(async (entry) => {
            const absolutePath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                return collectDocuments(root, absolutePath);
            }
            return /\.mdx?$/.test(entry.name) ? [path.relative(root, absolutePath)] : [];
        })
    );
    return paths.flat().sort();
}
