// @vitest-environment happy-dom
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { MIRELA_VOSS_DATA } from '@site/src/sheet_manager/systems/v5/modules/vampire/example';
import { beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

beforeEach(() => {
    useDocumentStore.setState({
        documents: [],
        entries: [],
        folders: [],
        currentDocumentId: null,
    });
});

const folder = {
    id: 'f1',
    name: 'Campaign',
    parentId: null,
    rank: 1,
    createdAt: '2026-10-18T00:00:00.000Z',
    changedAt: '2026-10-18T00:00:00.000Z',
    updatedAt: 0,
};

const entryOf = (id: string) =>
    useDocumentStore.getState().entries.find((entry) => entry.id === id);

describe('createDocument options (spec 039)', () => {
    it('starts blank and untitled without options', () => {
        const created = useDocumentStore.getState().createDocument('wod-v5', 'vampire');
        expect(created.metadata.title).toBe('');
        expect(created.templateValues).toEqual({});
        expect((created.data as { name: string }).name).toBe('');
    });

    it('takes a title, starting data, and template values', () => {
        const created = useDocumentStore.getState().createDocument('wod-v5', 'vampire', {
            title: 'Copy',
            data: MIRELA_VOSS_DATA,
            templateValues: { 'night-notes': 'kept' },
        });
        expect(created.metadata.title).toBe('Copy');
        expect(created.data).toEqual(MIRELA_VOSS_DATA);
        expect(created.data).not.toBe(MIRELA_VOSS_DATA);
        expect(created.templateValues).toEqual({ 'night-notes': 'kept' });
        expect(entryOf(created.id)?.name).toBe('Copy');
    });

    it('refuses starting data its schema rejects', () => {
        expect(() =>
            useDocumentStore
                .getState()
                .createDocument('wod-v5', 'vampire', { data: { generation: 'old' } })
        ).toThrow();
        expect(useDocumentStore.getState().entries).toHaveLength(0);
    });

    it('puts the document into an existing folder', () => {
        useDocumentStore.setState({
            folders: [folder],
        });
        const created = useDocumentStore
            .getState()
            .createDocument('wod-v5', 'vampire', { parentId: 'f1' });
        expect(entryOf(created.id)?.parentId).toBe('f1');
    });

    it('reports a deleted folder and creates at the top level', () => {
        const created = useDocumentStore
            .getState()
            .createDocument('wod-v5', 'vampire', { parentId: 'gone' });
        expect(entryOf(created.id)?.parentId).toBeNull();
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['document-folder-missing']);
    });
});
