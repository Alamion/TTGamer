import { buildLibraryTree } from '@site/src/sheet_manager/features/sheet/data/libraryTree';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    ASHEN_ID,
    CULT_ID,
    libraryInput,
    libraryPage,
    resetLibraryStores,
    seedLibrary,
} from './helpers/library';

const pages = (count: number) =>
    Array.from({ length: count }, (_, index) =>
        libraryPage(`tpl-bulk${String(index).padStart(4, '0')}`, {
            systemId: 'wod-v5',
            documentKind: CULT_ID,
            settingId: ASHEN_ID,
        })
    );

/** Milliseconds to build the tree with `count` extra pages (median of five). */
function buildMs(count: number) {
    const input = libraryInput({
        templates: [...useTemplateStore.getState().templates, ...pages(count)],
    });
    const runs = Array.from({ length: 5 }, () => {
        const started = performance.now();
        buildLibraryTree(input);
        return performance.now() - started;
    }).sort((a, b) => a - b);
    return runs[2]!;
}

describe('library tree performance (spec 013, SC-007 guard)', () => {
    beforeEach(seedLibrary);
    afterEach(resetLibraryStores);

    it('builds 300 pages in time that grows linearly with the pages', () => {
        buildMs(30); // warm-up
        const small = buildMs(30);
        const large = buildMs(300);
        // 10× the pages; quadratic work would be ~100×.
        expect(large).toBeLessThan(Math.max(small, 0.5) * 25);
    });
});
