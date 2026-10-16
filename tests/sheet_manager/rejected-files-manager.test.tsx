// @vitest-environment happy-dom

import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { DocumentsWindow } from './helpers/toolWindows';

const open = () => render(createElement(DocumentsWindow, { open: true, onOpenChange: () => {} }));

beforeEach(() => useDocumentStore.setState({ documents: [], recoveryEntries: [] }));
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    takeSheetIssues();
});

describe('rejected files in the documents window', () => {
    it('shows nothing when no file was rejected', () => {
        open();
        expect(screen.queryByRole('button', { name: 'Download rejected files' })).toBeNull();
    });

    it('shows the count, downloads the recovery file, and clears after confirmation', async () => {
        useDocumentStore.getState().retainImportForRecovery('{ broken', 'cut off');
        const blobs: Blob[] = [];
        URL.createObjectURL = vi.fn((blob: Blob) => (blobs.push(blob), 'blob:test'));
        URL.revokeObjectURL = vi.fn();
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        open();

        expect(screen.getByText('Rejected files kept for recovery: 1')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Download rejected files' }));
        const file = JSON.parse(await blobs[0]!.text());
        expect(file.records).toHaveLength(1);
        expect(file.records[0]).toMatchObject({ content: '{ broken', reason: 'cut off' });

        fireEvent.click(screen.getByRole('button', { name: 'Clear rejected files' }));
        expect(useDocumentStore.getState().recoveryEntries).toHaveLength(1);
        const dialog = screen.getAllByRole('dialog').at(-1)!;
        fireEvent.click(
            Array.from(dialog.querySelectorAll('button')).find(
                (button) => button.textContent === 'Clear rejected files'
            )!
        );
        expect(useDocumentStore.getState().recoveryEntries).toEqual([]);
        expect(screen.queryByText(/Rejected files kept/)).toBeNull();
    });
});
