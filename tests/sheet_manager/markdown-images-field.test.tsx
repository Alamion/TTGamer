// @vitest-environment happy-dom
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** Pasting, picking, and freeing pictures in a markdown field (spec 043, US4). */

const blobs = vi.hoisted(() => ({ saved: [] as string[], deleted: [] as string[], fail: false }));

vi.mock('@site/src/sheet_manager/persistence/portraitStorage', async (original) => ({
    ...(await original<object>()),
    savePortrait: vi.fn(async () => {
        if (blobs.fail) throw new Error('not an image');
        const id = `blob-${String(blobs.saved.length + 1)}`;
        blobs.saved.push(id);
        return id;
    }),
    loadPortrait: vi.fn(async () => new Blob(['x'], { type: 'image/png' })),
    deletePortrait: vi.fn(async (id: string) => void blobs.deleted.push(id)),
}));

vi.setConfig({ testTimeout: 20_000 });

const template = CustomTemplateSchema.parse({
    id: 'markdown-images',
    name: 'Markdown Images',
    documentKind: 'character',
    schemaVersion: 4,
    children: [{ id: 'body', type: 'markdown', label: 'Body' }],
});

function mount(body: unknown) {
    useTemplateStore.setState({ templates: [template], quarantine: [] });
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-img',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'star-wars-wod-character',
                schemaVersion: 1,
                metadata: { title: 'Map', tags: [] },
                templateValues: { body },
                data: { metadata: { name: 'Map', type: 'sentient' } },
            } as never,
        ],
        currentDocumentId: 'doc-img',
    });
    return render(createElement(DeclarativeSheetView, { template }));
}

const stored = () =>
    useDocumentStore.getState().documents[0]?.templateValues.body as {
        text: string;
        images?: Record<string, unknown>;
    };
const textarea = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Body' });

function paste(file: File) {
    fireEvent.paste(textarea(), { clipboardData: { files: [file] } });
}

beforeEach(() => {
    blobs.saved = [];
    blobs.deleted = [];
    blobs.fail = false;
    globalThis.URL.createObjectURL ??= () => 'blob:test';
    globalThis.URL.revokeObjectURL ??= () => undefined;
});

afterEach(cleanup);

describe('pictures in a markdown field', () => {
    it('stores a pasted picture and puts its reference at the cursor', async () => {
        mount({ text: '' });
        fireEvent.change(textarea(), { target: { value: 'Map: ' } });
        textarea().setSelectionRange(5, 5);
        paste(new File(['x'], 'docks.png', { type: 'image/png' }));
        await waitFor(() =>
            expect(stored()).toEqual({
                text: 'Map: ![[docks.png]]',
                images: { 'docks.png': { source: 'device', blobId: 'blob-1' } },
            })
        );
    });

    it('keeps a picture whose reference was deleted until the text is left, so undo restores it', async () => {
        mount({
            text: 'a ![[docks.png]]',
            images: { 'docks.png': { source: 'device', blobId: 'blob-9' } },
        });
        fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
        fireEvent.change(textarea(), { target: { value: 'a ' } });
        expect(stored().images).toEqual({ 'docks.png': { source: 'device', blobId: 'blob-9' } });
        // Undo puts the reference back while the field still has the focus.
        fireEvent.change(textarea(), { target: { value: 'a ![[docks.png]]' } });
        fireEvent.blur(textarea());
        expect(stored().images).toEqual({ 'docks.png': { source: 'device', blobId: 'blob-9' } });
        fireEvent.change(textarea(), { target: { value: 'a ' } });
        fireEvent.blur(textarea());
        expect(stored()).toEqual({ text: 'a ' });
    });

    it('frees unused pictures when editing ends with Done', () => {
        mount({ text: 'x', images: { 'old.png': { source: 'device', blobId: 'blob-8' } } });
        fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
        fireEvent.click(screen.getByRole('button', { name: /Done/ }));
        expect(stored()).toEqual({ text: 'x' });
    });

    it('shows a stored picture where the text names it', async () => {
        mount({
            text: '![[docks.png]] and ![[unknown.png]]',
            images: { 'docks.png': { source: 'device', blobId: 'blob-7' } },
        });
        await waitFor(() => expect(screen.getByRole('img').getAttribute('alt')).toBe('docks.png'));
        expect(screen.getByText('![[unknown.png]]')).toBeTruthy();
    });

    it('says when a picture could not be added, and reports it', async () => {
        mount({ text: '' });
        blobs.fail = true;
        await act(async () => {
            paste(new File(['x'], 'huge.png', { type: 'image/png' }));
        });
        await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/could not/));
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['markdown-image-rejected']);
        expect(stored()).toEqual({ text: '' });
    });
});
