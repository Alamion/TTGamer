import { readdir } from 'node:fs/promises';
import path from 'node:path';

/** Documentation trees whose English pages must have Russian counterparts. */
export const DOCUMENT_ROOTS = ['star-wars-wod-2e', 'wod-v5'] as const;
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
