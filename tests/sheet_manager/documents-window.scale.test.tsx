// @vitest-environment happy-dom
import {
    configureRecordStorage,
    createMemoryRecordStorage,
} from '@site/src/sheet_manager/store/documentContent';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement, Profiler } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeScaleTree } from './helpers/documentsScale';
import { resetDocuments } from './helpers/documentsWindow';
import { DocumentsWindow } from './helpers/toolWindows';

vi.setConfig({ testTimeout: 30_000 });

function seed(count: number) {
    const tree = makeScaleTree(count);
    useDocumentStore.setState({ documents: [], currentDocumentId: null, ...tree });
    return tree;
}

describe('the documents window with thousands of documents (spec 032, FR-017, FR-022)', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.matchMedia = ((query: string) => ({
            matches: false,
            media: query,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
        })) as unknown as typeof window.matchMedia;
    });
    afterEach(() => {
        cleanup();
        resetDocuments();
    });

    it('does nothing while it is closed: the store changing does not render it', () => {
        seed(3000);
        let renders = 0;
        render(
            createElement(
                Profiler,
                { id: 'closed', onRender: () => renders++ },
                createElement(DocumentsWindow, { open: false, onOpenChange: () => undefined })
            )
        );
        const mounted = renders;
        for (let change = 0; change < 5; change++) {
            act(() =>
                useDocumentStore.setState((state) => ({
                    entries: state.entries.map((entry, index) =>
                        index === 0 ? { ...entry, name: `Renamed ${change}` } : entry
                    ),
                }))
            );
        }
        expect(renders).toBe(mounted);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('draws only the rows in view, and a name search reads no record', async () => {
        const tree = seed(3000);
        useDocumentStore.setState({ folders: tree.folders });
        localStorage.setItem(
            'documents-window-open-folders',
            JSON.stringify(tree.folders.map(({ id }) => `folder:${id}`))
        );
        const storage = createMemoryRecordStorage();
        const get = vi.spyOn(storage, 'get');
        configureRecordStorage(storage);

        render(createElement(DocumentsWindow, { open: true, onOpenChange: () => undefined }));
        const drawn = screen.getAllByRole('treeitem').length;
        expect(drawn).toBeGreaterThan(5);
        expect(drawn).toBeLessThan(100);
        expect(screen.getByRole('tree').firstElementChild?.getAttribute('aria-posinset')).toBe('1');

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search names' }), {
            target: { value: 'doc 0042' },
        });
        await waitFor(() =>
            expect(
                screen
                    .getAllByRole('treeitem')
                    .some((item) => /Doc 0042/.test(item.textContent ?? ''))
            ).toBe(true)
        );
        expect(get).not.toHaveBeenCalled();
    });
});
