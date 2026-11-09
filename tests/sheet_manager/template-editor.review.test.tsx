// @vitest-environment happy-dom

import {
    revisionOf,
    shippedPageFor,
} from '@site/src/sheet_manager/features/sheet/data/shippedRevision';
import { mergePages } from '@site/src/sheet_manager/features/template-editor/merge/merge';
import {
    EditorSessionContext,
    useReviewMark,
} from '@site/src/sheet_manager/features/template-editor/session/context';
import { createEditorSession } from '@site/src/sheet_manager/features/template-editor/session/store';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { overrideKey, useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import type { CustomTemplate, TemplateNode } from '@site/src/sheet_manager/types/template';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { renderReview, resetEditorStores } from './helpers/editor';
import { libraryDocument } from './helpers/library';

const field = (id: string, label: string): TemplateNode => ({
    id,
    type: 'text',
    label,
    required: false,
    multiline: false,
});
function page(children: TemplateNode[]): CustomTemplate {
    return {
        ...shippedPageFor('general', 'general-note')!,
        children: [{ id: 'section', type: 'section', title: 'Details', children }],
    };
}
function fixture() {
    const baseline = page([field('conflict', 'Original'), field('changed', 'Before')]);
    const copy = page([field('conflict', 'My label'), field('changed', 'Before')]);
    const shipped = page([field('conflict', 'Shipped label'), field('changed', 'After')]);
    const key = overrideKey(copy.systemId, copy.id);
    useTemplateStore.getState().setDefaultOverride(copy, { base: baseline });
    return { kind: 'review' as const, mode: 'merge' as const, baseline, copy, shipped, key };
}
const stored = () => JSON.stringify(useTemplateStore.getState());
const row = (id: string) => document.querySelector(`[data-review-item="${id}"]`)! as HTMLElement;
const outline = (id: string) => document.querySelector(`[data-outline-row="${id}"]`)!;

describe('shipped-page review in the editor', () => {
    beforeEach(() => {
        resetEditorStores();
        useTemplateStore.setState({ overrideBases: {} });
        useDocumentStore.setState({ entries: [] });
    });
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('opens and cancels without any store action or stored change', () => {
        const base = fixture();
        const before = stored();
        const writes = [
            vi.spyOn(useTemplateStore.getState(), 'setDefaultOverride'),
            vi.spyOn(useTemplateStore.getState(), 'saveTemplate'),
            vi.spyOn(useTemplateStore.getState(), 'clearDefaultOverride'),
            vi.spyOn(useTemplateStore.getState(), 'dismissUpdate'),
        ];
        const onClose = vi.fn();
        renderReview(base, onClose);
        expect(stored()).toBe(before);
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalledOnce();
        expect(stored()).toBe(before);
        for (const write of writes) expect(write).not.toHaveBeenCalled();
    });

    it('saves the merged copy and the exact compared shipped base', async () => {
        const base = fixture();
        const onClose = vi.fn();
        renderReview(base, onClose);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
        const store = useTemplateStore.getState();
        expect(store.overrideBases[base.key]).toEqual({
            base: base.shipped,
            revision: revisionOf(base.shipped),
        });
        expect(store.defaultOverrides[base.key]).toEqual(
            page([field('conflict', 'My label'), field('changed', 'After')])
        );
    });

    it('blocks saving a merged draft with an issue reported by the editor', () => {
        const base = fixture();
        base.shipped = page([field('conflict', 'Shipped label'), field('changed', '')]);
        const before = stored();
        renderReview(base);
        expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(true);
        expect(screen.getByRole('alert')?.textContent).toMatch(/label/i);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(stored()).toBe(before);
    });

    it('reports a merge failure and opens the unchanged copy with an explanation', () => {
        const base = fixture();
        base.baseline = page([field('duplicate', 'One'), field('duplicate', 'Two')]);
        const before = stored();
        renderReview(base);
        expect(takeSheetIssues()).toEqual([
            expect.objectContaining({
                code: 'template-merge-failed',
                details: expect.objectContaining({ stage: 'merge', templateId: base.copy.id }),
            }),
        ]);
        expect(
            screen.getByText('This page could not be merged; your copy is unchanged.')
        ).toBeTruthy();
        expect(outline('changed')?.textContent).toContain('Before');
        expect(outline('conflict')?.textContent).toContain('My label');
        expect(stored()).toBe(before);
    });

    it('keeps document data and template values on opening and saving', async () => {
        const base = fixture();
        const document = {
            ...libraryDocument('review-note', { systemId: 'general', definitionId: 'note' }),
            templateValues: { conflict: 'Stored text', orphan: 23 },
        };
        useDocumentStore.setState({ documents: [document] });
        const before = JSON.stringify(useDocumentStore.getState().documents);
        renderReview(base);
        expect(JSON.stringify(useDocumentStore.getState().documents)).toBe(before);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() =>
            expect(useTemplateStore.getState().overrideBases[base.key]?.base).toEqual(base.shipped)
        );
        expect(JSON.stringify(useDocumentStore.getState().documents)).toBe(before);
    });

    it('switches conflicts in either direction with one undo step and an announcement', () => {
        renderReview(fixture());
        const conflict = row('conflict:label');
        expect(conflict?.textContent).toContain('My label');
        expect(conflict?.textContent).toContain('Shipped label');
        const toggle = within(conflict).getByRole('switch', {
            name: /Use shipped.*Details.*My label/,
        });
        toggle.focus();
        expect(document.activeElement).toBe(toggle);
        expect((toggle as HTMLInputElement).checked).toBe(false);
        fireEvent.click(toggle);
        expect((toggle as HTMLInputElement).checked).toBe(true);
        expect(outline('conflict')?.textContent).toContain('Shipped label');
        expect(document.querySelector('[data-editor-announcer]')?.textContent).toMatch(
            /now uses the shipped version/
        );
        fireEvent.click(toggle);
        expect(outline('conflict')?.textContent).toContain('My label');
        expect(document.querySelector('[data-editor-announcer]')?.textContent).toMatch(
            /now uses your version/
        );
        fireEvent.click(screen.getByRole('button', { name: /^Undo/ }));
        expect(outline('conflict')?.textContent).toContain('Shipped label');
        fireEvent.click(screen.getByRole('button', { name: /^Undo/ }));
        expect(outline('conflict')?.textContent).toContain('My label');
        expect(screen.getByRole('button', { name: /^Undo/ }).hasAttribute('disabled')).toBe(true);
    });

    it('names the review region and its controls and marks frames and outline with text', () => {
        renderReview(fixture());
        const panel = screen.getByRole('region', { name: 'Review shipped changes' });
        expect(panel?.textContent).toContain('Values stored in your documents are kept.');
        expect(panel?.textContent).toContain('Conflict — you kept yours');
        expect(panel?.textContent).toContain('Changed by the shipped page');
        expect(outline('conflict')?.getAttribute('data-review-origin')).toBe('conflict');
        expect(
            within(outline('conflict') as HTMLElement).getByRole('button', {
                name: /My label.*Conflict/,
            })
        ).toBeTruthy();
        expect(
            document
                .querySelector('[data-editor-frame][data-node-id="conflict"]')
                ?.getAttribute('data-review-origin')
        ).toBe('conflict');
        const toggle = within(row('changed:label')).getByRole('switch', {
            name: /Undo this change.*Details.*After/,
        });
        expect((toggle as HTMLInputElement).checked).toBe(true);
        fireEvent.click(toggle);
        expect(outline('changed')?.textContent).toContain('Before');
        expect(
            (
                within(row('changed:label')).getByRole('switch', {
                    name: /Take it again.*Details.*Before/,
                }) as HTMLInputElement
            ).checked
        ).toBe(false);
        fireEvent.click(toggle);
        expect(outline('changed')?.textContent).toContain('After');
    });

    it('shows text marks for added, removed, and moved items', () => {
        const baseline = page([field('a', 'A'), field('b', 'B'), field('removed', 'Gone')]);
        const shipped = page([field('b', 'B'), field('a', 'A'), field('added', 'New')]);
        renderReview({ kind: 'review', mode: 'merge', baseline, copy: baseline, shipped });
        const panel = screen.getByRole('region', { name: 'Review shipped changes' });
        expect(panel?.textContent).toContain('Added by the shipped page');
        expect(panel?.textContent).toContain('Removed by the shipped page');
        expect(panel?.textContent).toContain('Moved');
        for (const toggle of within(panel).getAllByRole('switch')) {
            expect(toggle.getAttribute('aria-label')).toMatch(/.+: .+/);
            expect(toggle.tagName).toBe('INPUT');
            toggle.focus();
            expect(document.activeElement).toBe(toggle);
        }
    });

    it('gives conflicts priority and keeps mark subscriptions stable on unrelated edits', () => {
        const base = fixture();
        const result = mergePages(base.baseline, base.shipped, base.copy);
        if ('error' in result) throw new Error(result.error);
        const conflict = result.items.find((item) => item.origin === 'conflict')!;
        const session = createEditorSession(result.draft, (message) => message.message, {
            mode: 'merge',
            shipped: base.shipped,
            failed: false,
            items: [{ ...conflict, origin: 'shipped' }, ...result.items],
        });
        const renders = vi.fn();
        function Mark({ id }: { id: string }) {
            const mark = useReviewMark(id);
            renders(id, mark?.origin);
            return null;
        }
        render(
            <EditorSessionContext.Provider value={session}>
                <Mark id="conflict" />
                <Mark id="section" />
            </EditorSessionContext.Provider>
        );
        expect(renders.mock.calls).toEqual([
            ['conflict', 'conflict'],
            ['section', undefined],
        ]);
        renders.mockClear();
        act(() => session.change((draft) => ({ ...draft, description: 'Unrelated edit' })));
        expect(renders).not.toHaveBeenCalled();
    });
});
