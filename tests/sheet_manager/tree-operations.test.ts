// @vitest-environment happy-dom
import { OperationHistory } from '@site/src/sheet_manager/features/documents/history';
import {
    applyOperations,
    collectDeletion,
    describeOperation,
    MAX_TREE_DEPTH,
    parseOperations,
    repairFolders,
    type TreeOperation,
    type TreeState,
} from '@site/src/sheet_manager/features/documents/operations';
import type { DocumentIndexEntry, Folder } from '@site/src/sheet_manager/store/documentIndex';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { beforeEach, describe, expect, it } from 'vitest';

const NOW = Date.parse('2026-10-14T10:00:00Z');

const doc = (id: string, parentId: string | null = null, rank = 1): DocumentIndexEntry => ({
    id,
    name: id,
    kind: 'character',
    systemId: 'wod-v5',
    definitionId: 'hunter',
    parentId,
    rank,
    updatedAt: 1,
});

const folder = (id: string, parentId: string | null = null, rank = 1): Folder => ({
    id,
    name: id,
    parentId,
    rank,
    createdAt: '2026-01-01T00:00:00.000Z',
    changedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: 1,
});

const start = (): TreeState => ({
    folders: [folder('f1', null, 1), folder('f2', null, 2), folder('f1a', 'f1', 1)],
    entries: [doc('a', null, 1), doc('b', null, 2), doc('c', 'f1', 1), doc('d', 'f1a', 1)],
});

/** The tree without merge stamps, for comparing a state with the one before. */
const plain = (state: TreeState) => ({
    folders: state.folders.map((item) => ({ ...item, updatedAt: 0 })),
    entries: state.entries.map((item) => ({ ...item, updatedAt: 0 })),
});
const sorted = (state: TreeState) => {
    const { folders, entries } = plain(state);
    const byId = <T extends { id: string }>(list: T[]) =>
        [...list].sort((x, y) => x.id.localeCompare(y.id));
    return { folders: byId(folders), entries: byId(entries) };
};

const run = (operations: TreeOperation[], state = start()) =>
    applyOperations(state, operations, NOW);

const orderIn = (state: TreeState, place: string | null) => [
    ...state.folders
        .filter((x) => x.parentId === place)
        .sort((x, y) => x.rank - y.rank)
        .map((x) => x.id),
    ...state.entries
        .filter((x) => x.parentId === place)
        .sort((x, y) => x.rank - y.rank)
        .map((x) => x.id),
];

describe('tree operations (spec 032, D6)', () => {
    it('creates a folder at the end of a place, with both times', () => {
        const { state, problems } = run([
            { op: 'createFolder', id: 'new', name: '  Notes ', parentId: null },
        ]);
        expect(problems).toEqual([]);
        expect(state.folders.find((x) => x.id === 'new')).toMatchObject({
            name: 'Notes',
            parentId: null,
            rank: 3,
            createdAt: '2026-10-14T10:00:00.000Z',
            changedAt: '2026-10-14T10:00:00.000Z',
        });
    });

    it('renames a folder, and refuses to rename a document or a missing row', () => {
        const ok = run([{ op: 'rename', id: 'f1', name: 'Renamed' }]);
        expect(ok.state.folders.find((x) => x.id === 'f1')!.name).toBe('Renamed');
        const refused = run([
            { op: 'rename', id: 'a', name: 'X' },
            { op: 'rename', id: 'nope', name: 'X' },
        ]);
        expect(refused.problems).toEqual([
            { code: 'document-name', id: 'a' },
            { code: 'missing', id: 'nope' },
        ]);
        expect(refused.inverse).toEqual([]);
    });

    it('moves rows into a folder and puts folders before the documents', () => {
        const { state } = run([{ op: 'move', ids: ['a', 'f2'], parentId: 'f1' }]);
        expect(orderIn(state, 'f1')).toEqual(['f1a', 'f2', 'c', 'a']);
    });

    it('reorders by a sibling: before it, and at the end when it is unknown', () => {
        const before = run([{ op: 'move', ids: ['b'], parentId: null, before: 'a' }]);
        expect(orderIn(before.state, null)).toEqual(['f1', 'f2', 'b', 'a']);
        const folderFirst = run([{ op: 'move', ids: ['f2'], parentId: null, before: 'f1' }]);
        expect(orderIn(folderFirst.state, null)).toEqual(['f2', 'f1', 'a', 'b']);
        const last = run([{ op: 'move', ids: ['a'], parentId: null, before: 'ghost' }]);
        expect(orderIn(last.state, null)).toEqual(['f1', 'f2', 'b', 'a']);
        const aboveFolders = run([{ op: 'move', ids: ['b'], parentId: null, before: 'f1' }]);
        expect(orderIn(aboveFolders.state, null)).toEqual(['f1', 'f2', 'b', 'a']);
    });

    it('moves several rows in the order given, between two neighbors', () => {
        const state: TreeState = {
            folders: [],
            entries: [doc('p', null, 1), doc('q', null, 2), doc('x', null, 3), doc('y', null, 4)],
        };
        const { state: next } = run(
            [{ op: 'move', ids: ['y', 'x'], parentId: null, before: 'q' }],
            state
        );
        expect(orderIn(next, null)).toEqual(['p', 'y', 'x', 'q']);
    });

    it('renormalizes ranks when the gap is too small, and keeps the order', () => {
        const state: TreeState = {
            folders: [],
            entries: [doc('p', null, 1), doc('q', null, 1 + 1e-9), doc('x', null, 5)],
        };
        const { state: next, inverse } = run(
            [{ op: 'move', ids: ['x'], parentId: null, before: 'q' }],
            state
        );
        expect(orderIn(next, null)).toEqual(['p', 'x', 'q']);
        expect(sorted(applyOperations(next, inverse, NOW).state)).toEqual(sorted(state));
    });

    it('refuses a move into itself or a descendant, and changes nothing', () => {
        const { state, problems, inverse } = run([
            { op: 'move', ids: ['f1'], parentId: 'f1' },
            { op: 'move', ids: ['f1'], parentId: 'f1a' },
        ]);
        expect(problems).toEqual([
            { code: 'cycle', id: 'f1' },
            { code: 'cycle', id: 'f1' },
        ]);
        expect(inverse).toEqual([]);
        expect(plain(state)).toEqual(plain(start()));
    });

    it('refuses a target that is a document or missing', () => {
        const { problems } = run([
            { op: 'move', ids: ['a'], parentId: 'b' },
            { op: 'move', ids: ['a'], parentId: 'ghost' },
            { op: 'createFolder', name: 'x', parentId: 'b' },
        ]);
        expect(problems.map(({ code }) => code)).toEqual([
            'not-a-folder',
            'missing',
            'not-a-folder',
        ]);
    });

    it(`stops at the depth bound of ${MAX_TREE_DEPTH}`, () => {
        const chain: Folder[] = Array.from({ length: MAX_TREE_DEPTH }, (_, index) =>
            folder(`d${index}`, index === 0 ? null : `d${index - 1}`)
        );
        const state: TreeState = { folders: [...chain, folder('loose')], entries: [] };
        const deepest = `d${MAX_TREE_DEPTH - 1}`;
        expect(run([{ op: 'createFolder', name: 'x', parentId: deepest }], state).problems).toEqual(
            [{ code: 'depth' }]
        );
        expect(run([{ op: 'move', ids: ['loose'], parentId: deepest }], state).problems).toEqual([
            { code: 'depth', id: 'loose' },
        ]);
        expect(
            run([{ op: 'createFolder', name: 'x', parentId: `d${MAX_TREE_DEPTH - 2}` }], state)
                .problems
        ).toEqual([]);
    });

    it('lets rows inside a moved folder ride along', () => {
        const { state } = run([{ op: 'move', ids: ['f1', 'c', 'f1a'], parentId: 'f2' }]);
        expect(state.folders.find((x) => x.id === 'f1')!.parentId).toBe('f2');
        expect(state.entries.find((x) => x.id === 'c')!.parentId).toBe('f1');
        expect(state.folders.find((x) => x.id === 'f1a')!.parentId).toBe('f1');
    });

    it('deletes a folder with everything inside it, and lists what goes', () => {
        const { state, removed } = run([{ op: 'delete', ids: ['f1'] }]);
        expect(state.folders.map(({ id }) => id)).toEqual(['f2']);
        expect(state.entries.map(({ id }) => id)).toEqual(['a', 'b']);
        expect([...removed].sort()).toEqual(['c', 'd', 'f1', 'f1a']);
        expect(collectDeletion(start(), ['f1', 'a'])).toEqual({
            folderIds: ['f1', 'f1a'],
            documentIds: ['a', 'c', 'd'],
        });
    });

    it('undoes a whole batch exactly, and the undo can be undone', () => {
        const batch: TreeOperation[] = [
            { op: 'createFolder', id: 'n', name: 'New', parentId: 'f2' },
            { op: 'move', ids: ['a', 'b'], parentId: 'n' },
            { op: 'rename', id: 'f1', name: 'Other' },
            { op: 'delete', ids: ['f1a'] },
        ];
        const first = run(batch);
        expect(first.problems).toEqual([]);
        const undone = applyOperations(first.state, first.inverse, NOW + 1);
        expect(sorted(undone.state)).toEqual(sorted(start()));
        const redone = applyOperations(undone.state, undone.inverse, NOW + 2);
        expect(sorted(redone.state)).toEqual(sorted(first.state));
    });

    it('stamps what it changes so another tab merges it as newer', () => {
        const { state } = run([{ op: 'move', ids: ['a'], parentId: 'f2' }]);
        expect(state.entries.find((x) => x.id === 'a')!.updatedAt).toBe(NOW);
        expect(state.entries.find((x) => x.id === 'b')!.updatedAt).toBe(1);
    });

    it('describes each operation in one line', () => {
        const s = start();
        expect(describeOperation({ op: 'createFolder', name: 'Lore', parentId: 'f1' }, s)).toBe(
            'Create the folder "Lore" in "f1"'
        );
        expect(describeOperation({ op: 'rename', id: 'f1', name: 'X' }, s)).toBe(
            'Rename "f1" to "X"'
        );
        expect(
            describeOperation({ op: 'move', ids: ['a', 'b', 'c', 'd'], parentId: null }, s)
        ).toBe('Move "a", "b", "c" and 1 more into the top level');
        expect(describeOperation({ op: 'delete', ids: ['f1'] }, s)).toBe(
            'Delete 2 folders and 2 documents'
        );
    });

    it('rejects malformed operations', () => {
        expect(parseOperations([{ op: 'move', ids: [], parentId: null }]).ok).toBe(false);
        expect(parseOperations([{ op: 'rename', id: 'x', name: '   ' }]).ok).toBe(false);
        expect(parseOperations([{ op: 'explode' }]).ok).toBe(false);
        expect(parseOperations('nope').ok).toBe(false);
        expect(parseOperations([{ op: 'createFolder', name: 'ok', parentId: null }]).ok).toBe(true);
    });

    it('cuts a loop of stored folders', () => {
        const looped = [folder('x', 'y'), folder('y', 'x'), folder('z', null)];
        const { folders, repaired } = repairFolders(looped, NOW);
        expect(repaired).toBeGreaterThan(0);
        expect(folders.some((x) => x.parentId === null && x.id !== 'z')).toBe(true);
        expect(repairFolders([folder('z')], NOW).repaired).toBe(0);
    });
});

describe('the store applies operations (spec 032, T026)', () => {
    beforeEach(() => {
        useDocumentStore.setState({
            documents: [],
            entries: start().entries,
            folders: start().folders,
            pendingPurge: [],
            currentDocumentId: 'c',
        });
    });

    it('records deleted ids as tombstones, closes the open one, and undoes it', () => {
        const store = useDocumentStore.getState();
        const result = store.applyTreeOperations([{ op: 'delete', ids: ['f1'] }]);
        let state = useDocumentStore.getState();
        expect(state.pendingPurge.sort()).toEqual(['c', 'd', 'f1', 'f1a']);
        expect(state.currentDocumentId).toBeNull();
        expect(state.entries.map(({ id }) => id)).toEqual(['a', 'b']);

        state.applyTreeOperations(result.inverse);
        state = useDocumentStore.getState();
        expect(state.pendingPurge).toEqual([]);
        expect(state.entries).toHaveLength(4);
        expect(state.folders).toHaveLength(3);
    });

    it('writes nothing when the operations change nothing', () => {
        let writes = 0;
        const stop = useDocumentStore.subscribe(() => writes++);
        useDocumentStore.getState().applyTreeOperations([{ op: 'rename', id: 'a', name: 'x' }]);
        stop();
        expect(writes).toBe(0);
    });
});

describe('undo history (spec 032, FR-011)', () => {
    const forward = (state: TreeState, operations: TreeOperation[]) => {
        const result = applyOperations(state, operations, NOW);
        return result;
    };

    it('undoes and redoes in order, and a new change ends the redo line', () => {
        const history = new OperationHistory();
        let state = start();
        const run = (operations: readonly TreeOperation[]) => {
            const result = applyOperations(state, operations, NOW);
            state = result.state;
            return result;
        };
        const change = (label: string, operations: TreeOperation[]) => {
            history.push({ label, operations: run(operations).inverse });
        };
        change('Rename', [{ op: 'rename', id: 'f1', name: 'One' }]);
        change('Move', [{ op: 'move', ids: ['a'], parentId: 'f2' }]);
        expect(history.getSnapshot()).toEqual({ undoLabel: 'Move', redoLabel: null });

        history.undo(run);
        expect(history.getSnapshot()).toEqual({ undoLabel: 'Rename', redoLabel: 'Move' });
        expect(state.entries.find((x) => x.id === 'a')!.parentId).toBeNull();
        history.redo(run);
        expect(state.entries.find((x) => x.id === 'a')!.parentId).toBe('f2');

        history.undo(run);
        change('Delete', [{ op: 'delete', ids: ['b'] }]);
        expect(history.getSnapshot().redoLabel).toBeNull();
        expect(history.redo(run)).toBeNull();
    });

    it('keeps the last 50 steps only', () => {
        const history = new OperationHistory(3);
        for (let step = 0; step < 5; step++) {
            history.push({
                label: `step ${step}`,
                operations: forward(start(), [{ op: 'rename', id: 'f1', name: `n${step}` }])
                    .inverse,
            });
        }
        let undone = 0;
        while (history.undo(() => applyOperations(start(), [], NOW))) undone++;
        expect(undone).toBe(3);
    });

    it('does not push a step that changed nothing', () => {
        const history = new OperationHistory();
        history.push({ label: 'Nothing', operations: [] });
        expect(history.getSnapshot().undoLabel).toBeNull();
    });
});
