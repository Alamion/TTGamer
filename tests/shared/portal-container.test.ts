import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Tailwind utilities exist only under `.tailwind-root`. A portal drawn into `document.body` loses
 * every class, so each one names a container under it: `modalRoot()` (`#modal-root`) or an
 * element the owner draws inside the site's root.
 */

const ROOT = join(__dirname, '../..');
const SRC = join(ROOT, 'src');

/** `createPortal` calls whose target is drawn inside `.tailwind-root`, with the reason. */
const INSIDE_ROOT: Record<string, string> = {
    'src/sheet_manager/features/sheet/panes/PaneArea.tsx': 'the toolbar slot sits in the sheet',
};

function sources(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return entry.name === 'generated' ? [] : sources(path);
        return /\.tsx?$/.test(entry.name) ? [path] : [];
    });
}

describe('portals', () => {
    it('draw under .tailwind-root', () => {
        const unstyled: string[] = [];
        for (const path of sources(SRC)) {
            const file = relative(ROOT, path);
            const text = readFileSync(path, 'utf8');
            for (const match of text.matchAll(/<\w+\.Portal\b([^>]*)>/g)) {
                if (!/\bcontainer=/.test(match[1]!)) unstyled.push(`${file}: ${match[0]}`);
            }
            if (/\bcreatePortal\(/.test(text) && !/modalRoot\(|'modal-root'/.test(text)) {
                if (!(file in INSIDE_ROOT)) unstyled.push(`${file}: createPortal`);
            }
        }
        expect(unstyled).toEqual([]);
    });
});
