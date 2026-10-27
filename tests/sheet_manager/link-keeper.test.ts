// @vitest-environment happy-dom
import { OperationHistory } from '@site/src/sheet_manager/features/documents/history';
import {
    RENAME_SETTLE_MS,
    startLinkKeeper,
    useLinksKeptMessage,
} from '@site/src/sheet_manager/features/documents/linkKeeperRuntime';
import {
    documentsHistory,
    redoTreeChange,
    runTreeChange,
    undoTreeChange,
} from '@site/src/sheet_manager/features/documents/treeActions';
import type { Folder } from '@site/src/sheet_manager/store/documentIndex';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { saveDocumentLinks, useLinkIndex } from '@site/src/sheet_manager/store/linkIndexStore';
import { noteEnvelope } from '@site/src/sheet_manager/systems/general/note';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** Links keep their targets when documents are renamed or moved (spec 044, US4). */

const folder = (id: string, name: string, parentId: string | null): Folder => ({
    id,
    name,
    parentId,
    rank: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    changedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: 0,
});

// World/Characters, World/Items, World 2/Items
const FOLDERS = [
    folder('w', 'World', null),
    folder('wc', 'Characters', 'w'),
    folder('wi', 'Items', 'w'),
    folder('w2', 'World 2', null),
    folder('w2i', 'Items', 'w2'),
];

type Seed = [id: string, name: string, body: string, parentId: string | null];

async function seed(rows: readonly Seed[]) {
    const documents = rows.map(([id, name, body]) => noteEnvelope(id, name, body));
    useDocumentStore.setState({ documents, folders: FOLDERS, currentDocumentId: rows[0]![0] });
    const places = new Map(rows.map(([id, , , parentId], index) => [id, { parentId, index }]));
    useDocumentStore.setState((state) => ({
        entries: state.entries.map((entry) => ({
            ...entry,
            parentId: places.get(entry.id)?.parentId ?? null,
            createdAt: new Date(
                Date.UTC(2026, 0, 1 + (places.get(entry.id)?.index ?? 0))
            ).toISOString(),
        })),
    }));
    for (const document of documents) await saveDocumentLinks(document);
    useLinkIndex.setState({ ready: true });
    documentsHistory.clear();
}

const textOf = (id: string) =>
    (
        useDocumentStore.getState().documents.find((document) => document.id === id)?.templateValues
            .body as { text: string } | undefined
    )?.text;

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

let stop: (() => void) | undefined;

beforeEach(() => {
    useLinksKeptMessage.setState({ message: null });
});

afterEach(() => {
    stop?.();
    stop = undefined;
    vi.useRealTimers();
});

describe('renaming and moving in the documents window', () => {
    it('rewrites links to the renamed document only, keeping alias, section, and embed', async () => {
        await seed([
            ['ines', 'Ines', '', 'wc'],
            ['other', 'Ines', '', 'w2i'],
            ['n1', 'Session', '[[Ines]] met [[Ines|her]] at ![[Ines#Bio]]', 'wc'],
            ['n2', 'Far note', 'Far: [[Ines]]', 'w2i'],
        ]);
        runTreeChange('Rename', [{ op: 'rename', id: 'ines', name: 'Ines Ruiz' }]);
        await vi.waitFor(() =>
            expect(textOf('n1')).toBe('[[Ines Ruiz]] met [[Ines Ruiz|her]] at ![[Ines Ruiz#Bio]]')
        );
        expect(textOf('n2')).toBe('Far: [[Ines]]');
        await vi.waitFor(() =>
            expect(useLinksKeptMessage.getState().message).toBe(
                'Links kept: 3 in 1 other documents.'
            )
        );
        expect(takeSheetIssues().map(({ code }) => code)).toContain('links-kept');
    });

    it('writes a folder path when the new name is taken nearer to the link', async () => {
        await seed([
            ['far', 'Sword', '', 'w2i'],
            ['near', 'Old sword', '', 'wc'],
            ['n1', 'Session', '[[Sword]]', 'wc'],
        ]);
        runTreeChange('Rename', [{ op: 'rename', id: 'near', name: 'Sword' }]);
        await settled();
        expect(textOf('n1')).toBe('[[World 2/Items/Sword]]');
        await settled();
        takeSheetIssues();
    });

    it('rewrites only where a move changes which document is nearest', async () => {
        await seed([
            ['far', 'Sword', '', 'w2i'],
            ['near', 'Sword', '', 'wi'],
            ['n1', 'In World', '[[Sword]]', 'wc'],
            ['n2', 'In World 2', '[[Sword]]', 'w2'],
        ]);
        // Out of World, the moved sword ties with the older one, which would win.
        runTreeChange('Move', [{ op: 'move', ids: ['near'], parentId: 'w2' }]);
        await vi.waitFor(() => expect(textOf('n1')).toBe('[[World 2/Sword]]'));
        expect(textOf('n2')).toBe('[[Sword]]');
        await settled();
        takeSheetIssues();
    });

    it('keeps links between documents moved together inside a folder', async () => {
        await seed([
            ['sword', 'Sword', '', 'wi'],
            ['n1', 'Inventory', '[[Sword]]', 'wi'],
        ]);
        runTreeChange('Move', [{ op: 'move', ids: ['wi'], parentId: 'w2' }]);
        await settled();
        expect(textOf('n1')).toBe('[[Sword]]');
        expect(takeSheetIssues()).toEqual([]);
    });

    it('rewrites nothing when a document is deleted', async () => {
        await seed([
            ['ines', 'Ines', '', null],
            ['n1', 'Session', '[[Ines]]', null],
        ]);
        runTreeChange('Delete', [{ op: 'delete', ids: ['ines'] }]);
        await settled();
        expect(textOf('n1')).toBe('[[Ines]]');
        expect(documentsHistory.latest()?.links).toBeUndefined();
    });
});

describe('undo and redo', () => {
    it('puts back only the rewritten links, keeps later edits, and leaves hand-made changes', async () => {
        await seed([
            ['ines', 'Ines', '', null],
            ['n1', 'Session', '[[Ines]] and [[Ines|her]]', null],
            ['n2', 'Plan', 'Ask [[Ines]]', null],
        ]);
        runTreeChange('Rename', [{ op: 'rename', id: 'ines', name: 'Ines Ruiz' }]);
        await vi.waitFor(() => expect(textOf('n2')).toBe('Ask [[Ines Ruiz]]'));
        // Edited after the rename: a new line in one note, the link itself in the other.
        useDocumentStore.setState((state) => ({
            documents: state.documents.map((document) =>
                document.id === 'n1'
                    ? {
                          ...document,
                          templateValues: {
                              body: { text: '[[Ines Ruiz]] and [[Ines Ruiz|her]]\nNew line' },
                          },
                      }
                    : document.id === 'n2'
                      ? { ...document, templateValues: { body: { text: 'Ask [[Bruno]]' } } }
                      : document
            ),
        }));
        undoTreeChange();
        await vi.waitFor(() => expect(textOf('n1')).toBe('[[Ines]] and [[Ines|her]]\nNew line'));
        expect(textOf('n2')).toBe('Ask [[Bruno]]');
        expect(useDocumentStore.getState().entries.find(({ id }) => id === 'ines')?.name).toBe(
            'Ines'
        );
        await vi.waitFor(() =>
            expect(useLinksKeptMessage.getState().message).toContain('stay as they are')
        );
        redoTreeChange();
        await vi.waitFor(() =>
            expect(textOf('n1')).toBe('[[Ines Ruiz]] and [[Ines Ruiz|her]]\nNew line')
        );
        await settled();
        takeSheetIssues();
    });
});

describe('changes outside the documents window', () => {
    it('keeps links when a document of the same name is created nearer', async () => {
        await seed([
            ['far', 'Sword', '', 'wi'],
            ['n1', 'Inventory', '[[Sword]]', 'wc'],
        ]);
        stop = startLinkKeeper(new OperationHistory());
        const created = useDocumentStore.getState().createDocument('general', 'note', {
            activate: false,
            title: 'Sword',
            parentId: 'wc',
        });
        expect(created).toBeTruthy();
        await vi.waitFor(() => expect(textOf('n1')).toBe('[[World/Items/Sword]]'));
        await settled();
        takeSheetIssues();
    });

    it('takes a name typed on a sheet once it settles, as one undoable rename with its links', async () => {
        await seed([
            ['ines', 'Ines', '', null],
            ['n1', 'Session', 'Meet [[Ines]]', null],
        ]);
        const steps = new OperationHistory();
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        stop = startLinkKeeper(steps);
        const { updateDocumentMetadata } = useDocumentStore.getState();
        for (const title of ['Ines R', 'Ines Ru', 'Ines Ruiz']) {
            updateDocumentMetadata('ines', { title });
            vi.advanceTimersByTime(RENAME_SETTLE_MS - 100);
        }
        expect(textOf('n1')).toBe('Meet [[Ines]]');
        vi.advanceTimersByTime(200);
        vi.useRealTimers();
        await vi.waitFor(() => expect(textOf('n1')).toBe('Meet [[Ines Ruiz]]'));
        expect(steps.getSnapshot().undoLabel).toBe('Rename to Ines Ruiz');
        steps.undo((operations, step) => {
            const result = useDocumentStore.getState().applyTreeOperations(operations);
            void import('@site/src/sheet_manager/features/documents/linkKeeper').then(
                ({ applyLinkEdits }) => applyLinkEdits(step.links!.edits, step.links!.applied)
            );
            return result;
        });
        await vi.waitFor(() => expect(textOf('n1')).toBe('Meet [[Ines]]'));
        await settled();
        takeSheetIssues();
    });

    it('takes a waiting name when the field is left, and a window rename only once', async () => {
        await seed([
            ['ines', 'Ines', '', null],
            ['bruno', 'Bruno', '', null],
            ['n1', 'Session', '[[Ines]] [[Bruno]]', null],
        ]);
        stop = startLinkKeeper(documentsHistory);
        useDocumentStore.getState().updateDocumentMetadata('ines', { title: 'Ines Ruiz' });
        document.dispatchEvent(new FocusEvent('focusout'));
        await vi.waitFor(() => expect(textOf('n1')).toBe('[[Ines Ruiz]] [[Bruno]]'));
        runTreeChange('Rename', [{ op: 'rename', id: 'bruno', name: 'Bruno Kessel' }]);
        await vi.waitFor(() => expect(textOf('n1')).toBe('[[Ines Ruiz]] [[Bruno Kessel]]'));
        await settled();
        undoTreeChange();
        await vi.waitFor(() => expect(textOf('n1')).toBe('[[Ines Ruiz]] [[Bruno]]'));
        undoTreeChange();
        await vi.waitFor(() => expect(textOf('n1')).toBe('[[Ines]] [[Bruno]]'));
        expect(documentsHistory.getSnapshot().undoLabel).toBeNull();
        await settled();
        takeSheetIssues();
    });
});
