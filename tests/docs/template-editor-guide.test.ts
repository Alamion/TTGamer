import { readFileSync } from 'node:fs';
import path from 'node:path';

import { EDITOR_GUIDE } from '@site/src/sheet_manager/components/dialogs/template-editor/EditorHelp';
import { describe, expect, it } from 'vitest';

const ROOTS = ['docs', 'i18n/ru/docusaurus-plugin-content-docs/current'];

function page(root: string, docsPath: string) {
    const relative = docsPath.replace(/^\/docs\//, '').replace(/#.*$/, '');
    // A folder link resolves to its index page.
    const candidates = [`${relative}.mdx`, path.join(relative, 'index.mdx')];
    for (const candidate of candidates) {
        try {
            return readFileSync(path.resolve(root, candidate), 'utf8');
        } catch {
            // try the next form
        }
    }
    throw new Error(`No page for ${docsPath} under ${root}`);
}

describe('template editor guide links (T-068)', () => {
    it.each(Object.entries(EDITOR_GUIDE))(
        '%s points at an existing page and heading in both locales',
        (_, docsPath) => {
            const anchor = docsPath.split('#')[1];
            for (const root of ROOTS) {
                const content = page(root, docsPath);
                if (anchor) expect(content, `${root}: #${anchor}`).toContain(`{#${anchor}}`);
            }
        }
    );
});
