import { applyOperations } from '@site/src/sheet_manager/features/documents/operations';
import {
    applyQuery,
    buildQueryIndex,
    EMPTY_QUERY,
    orderFor,
} from '@site/src/sheet_manager/features/documents/query';
import { buildRows, folderKey } from '@site/src/sheet_manager/features/documents/rows';
import { describe, expect, it } from 'vitest';

import { makeScaleTree, scaleLabeler } from './helpers/documentsScale';

/** Milliseconds for one piece of work on `count` documents (median of five, after a warm-up). */
function measure(count: number, work: (tree: ReturnType<typeof makeScaleTree>) => void) {
    const tree = makeScaleTree(count);
    work(tree);
    const runs = Array.from({ length: 5 }, () => {
        const started = performance.now();
        work(tree);
        return performance.now() - started;
    }).sort((a, b) => a - b);
    return runs[2]!;
}

/** 10× the documents must cost about 10×; quadratic work would cost about 100×. */
function expectLinear(work: (tree: ReturnType<typeof makeScaleTree>) => void) {
    const small = measure(300, work);
    const large = measure(3000, work);
    expect(large).toBeLessThan(Math.max(small, 0.5) * 25);
}

const allOpen = (tree: ReturnType<typeof makeScaleTree>) =>
    new Set(tree.folders.map(({ id }) => folderKey(id)));

describe('the documents tree at scale (spec 032, SC-002)', () => {
    it('builds the index and every row in time that grows linearly', () => {
        expectLinear((tree) => {
            const index = buildQueryIndex(tree.entries, scaleLabeler);
            const found = applyQuery(tree.entries, tree.folders, EMPTY_QUERY, index, Date.now());
            buildRows(found.entries, found.folders, allOpen(tree), orderFor(EMPTY_QUERY, index));
        });
    });

    it('searches and filters in time that grows linearly', () => {
        expectLinear((tree) => {
            const index = buildQueryIndex(tree.entries, scaleLabeler);
            const query = { ...EMPTY_QUERY, text: 'doc 02', kind: 'character' };
            const found = applyQuery(tree.entries, tree.folders, query, index, Date.now());
            buildRows(found.entries, found.folders, found.open, orderFor(query, index));
        });
    });

    it('sorts in time that grows linearly', () => {
        expectLinear((tree) => {
            const index = buildQueryIndex(tree.entries, scaleLabeler);
            const query = { ...EMPTY_QUERY, sort: 'changed' as const, descending: true };
            buildRows(tree.entries, tree.folders, allOpen(tree), orderFor(query, index));
        });
    });

    it('moves rows and undoes the move in time that grows linearly', () => {
        expectLinear((tree) => {
            const moved = applyOperations(tree, [
                { op: 'move', ids: ['d1', 'd2', 'd3', 'd4', 'd5'], parentId: 'c0', before: null },
            ]);
            applyOperations(moved.state, moved.inverse);
        });
    });
});
