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
import { renderEditor, renderReview, resetEditorStores } from './helpers/editor';
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
function differencesFixture() {
    const { copy, shipped, key } = fixture();
    useTemplateStore.setState({ overrideBases: {} });
    return { kind: 'review' as const, mode: 'differences' as const, copy, shipped, key };
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

    it('reports a merge failure and opens differences on the unchanged copy with an explanation', () => {
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
        expect(screen.getAllByRole('radiogroup')).toHaveLength(2);
        for (const radio of screen.getAllByRole('radio', { name: 'Keep mine' })) {
            expect((radio as HTMLInputElement).checked).toBe(true);
        }
        expect(stored()).toBe(before);
    });

    it('lists every difference on keep with named radios and text marks', () => {
        const base = differencesFixture();
        const before = stored();
        renderReview(base);
        const panel = screen.getByRole('region', { name: 'Review shipped changes' });
        expect(panel.textContent).toContain(
            'Your copy was made before updates were tracked, so every difference is listed, including your own edits. Each stays yours unless you take the shipped version.'
        );
        const groups = within(panel).getAllByRole('radiogroup');
        expect(groups).toHaveLength(2);
        for (const group of groups) {
            expect(group.getAttribute('aria-label')).toMatch(/Details.*(My label|Before)/);
            const keep = within(group).getByRole('radio', { name: 'Keep mine' });
            const take = within(group).getByRole('radio', { name: 'Take shipped' });
            expect(keep.tagName).toBe('INPUT');
            expect((keep as HTMLInputElement).checked).toBe(true);
            expect((take as HTMLInputElement).checked).toBe(false);
            take.focus();
            expect(document.activeElement).toBe(take);
        }
        expect(outline('changed').getAttribute('data-review-origin')).toBe('difference');
        expect(outline('changed').textContent).toContain('Differs from the shipped page');
        expect(
            document
                .querySelector('[data-editor-frame][data-node-id="changed"]')
                ?.getAttribute('data-review-origin')
        ).toBe('difference');
        expect(stored()).toBe(before);
    });

    it('saves taken rows and kept rows with the compared shipped page as the base', async () => {
        const base = differencesFixture();
        const before = stored();
        const onClose = vi.fn();
        renderReview(base, onClose);
        const changed = row('changed:label');
        fireEvent.click(within(changed).getByRole('radio', { name: 'Take shipped' }));
        expect(outline('changed').textContent).toContain('After');
        expect(
            (within(changed).getByRole('radio', { name: 'Take shipped' }) as HTMLInputElement)
                .checked
        ).toBe(true);
        fireEvent.click(within(changed).getByRole('radio', { name: 'Keep mine' }));
        expect(outline('changed').textContent).toContain('Before');
        fireEvent.click(within(changed).getByRole('radio', { name: 'Take shipped' }));
        expect(stored()).toBe(before);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
        expect(useTemplateStore.getState().defaultOverrides[base.key]).toEqual(
            page([field('conflict', 'My label'), field('changed', 'After')])
        );
        expect(useTemplateStore.getState().overrideBases[base.key]).toEqual({
            base: base.shipped,
            revision: revisionOf(base.shipped),
        });
    });

    it.each([false, true])(
        'records the base when all rows stay on keep (identical: %s)',
        async (identical) => {
            const base = differencesFixture();
            if (identical) base.shipped = structuredClone(base.copy);
            const before = stored();
            const onClose = vi.fn();
            renderReview(base, onClose);
            if (identical) {
                expect(screen.getByText('Your copy matches the shipped page.')).toBeTruthy();
                expect(screen.queryByRole('radiogroup')).toBeNull();
            }
            expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(
                false
            );
            expect(stored()).toBe(before);
            fireEvent.click(screen.getByRole('button', { name: 'Save' }));
            await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
            expect(useTemplateStore.getState().defaultOverrides[base.key]).toEqual(base.copy);
            expect(useTemplateStore.getState().overrideBases[base.key]).toEqual({
                base: base.shipped,
                revision: revisionOf(base.shipped),
            });
        }
    );

    it('cancels a difference list without writing anything', () => {
        const base = differencesFixture();
        const before = stored();
        const onClose = vi.fn();
        renderReview(base, onClose);
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalledOnce();
        expect(stored()).toBe(before);
    });

    it('reports a difference failure and opens the plain editor on the copy', () => {
        const base = differencesFixture();
        base.shipped = page([field('duplicate', 'One'), field('duplicate', 'Two')]);
        const before = stored();
        renderReview(base);
        expect(takeSheetIssues()).toEqual([
            expect.objectContaining({
                code: 'template-merge-failed',
                details: expect.objectContaining({
                    stage: 'differences',
                    templateId: base.copy.id,
                }),
            }),
        ]);
        expect(
            screen.getByText('This page could not be merged; your copy is unchanged.')
        ).toBeTruthy();
        expect(outline('changed').textContent).toContain('Before');
        expect(screen.queryByRole('radio')).toBeNull();
        expect(stored()).toBe(before);
    });

    it.each(['merge', 'differences', 'dismissed'] as const)(
        'opens %s from the header of the same editor',
        (mode) => {
            const shipped = shippedPageFor('general', 'general-note')!;
            const copy = { ...shipped, name: 'My page' };
            const baseline = { ...shipped, name: 'Old shipped page' };
            const store = useTemplateStore.getState();
            store.setDefaultOverride(copy, mode === 'differences' ? undefined : { base: baseline });
            if (mode === 'dismissed')
                store.dismissUpdate(copy.systemId, copy.id, revisionOf(shipped));
            const before = stored();
            renderEditor(copy);
            const button = screen.getByRole('button', { name: 'Review shipped changes' });
            expect(button.hasAttribute('disabled')).toBe(false);
            fireEvent.click(button);
            expect(screen.getAllByRole('dialog')).toHaveLength(1);
            expect(screen.queryByRole('button', { name: 'Review shipped changes' })).toBeNull();
            const panel = screen.getByRole('region', { name: 'Review shipped changes' });
            if (mode === 'differences') {
                expect(within(panel).getByRole('radiogroup', { name: 'My page' })).toBeTruthy();
            } else {
                expect(
                    within(panel).getByRole('switch', { name: /Use shipped: My page/ })
                ).toBeTruthy();
            }
            expect(stored()).toBe(before);
        }
    );

    it.each(['unedited', 'up-to-date', 'identical'] as const)(
        'hides header review for %s pages',
        (state) => {
            const shipped = shippedPageFor('general', 'general-note')!;
            const copy = state === 'identical' ? shipped : { ...shipped, name: 'My page' };
            if (state !== 'unedited') {
                useTemplateStore
                    .getState()
                    .setDefaultOverride(
                        copy,
                        state === 'up-to-date' ? { base: shipped } : undefined
                    );
            }
            renderEditor(state === 'unedited' ? shipped : copy);
            expect(screen.queryByRole('button', { name: 'Review shipped changes' })).toBeNull();
        }
    );

    it('disables header review after an edit and explains why, then enables it after undo', () => {
        const shipped = shippedPageFor('general', 'general-note')!;
        const copy = { ...shipped, name: 'My page' };
        useTemplateStore.getState().setDefaultOverride(copy);
        const before = stored();
        renderEditor(copy);
        fireEvent.change(screen.getByPlaceholderText('Template name'), {
            target: { value: 'Unsaved name' },
        });
        const button = screen.getByRole('button', { name: 'Review shipped changes' });
        expect(button.hasAttribute('disabled')).toBe(true);
        expect(document.getElementById(button.getAttribute('aria-describedby')!)?.textContent).toBe(
            'Save or close your changes before reviewing.'
        );
        fireEvent.click(button);
        expect(screen.queryByRole('region', { name: 'Review shipped changes' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /^Undo/ }));
        expect(button.hasAttribute('disabled')).toBe(false);
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

    it('selects a change card and its field without changing the draft or undo history', () => {
        renderReview(fixture());
        const before = stored();
        const card = row('conflict:label');
        const select = within(card).getByRole('button', { name: 'Details / My label' });
        expect(select.getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(select);
        expect(card.hasAttribute('data-selected')).toBe(true);
        expect(select.getAttribute('aria-pressed')).toBe('true');
        expect(
            within(outline('conflict') as HTMLElement).getByRole('button', { pressed: true })
        ).toBeTruthy();
        expect(
            document
                .querySelector('[data-editor-frame][data-node-id="conflict"]')
                ?.hasAttribute('data-selected')
        ).toBe(true);
        expect(row('changed:label').hasAttribute('data-selected')).toBe(false);
        expect(screen.getByRole('button', { name: /^Undo/ }).hasAttribute('disabled')).toBe(true);
        expect(stored()).toBe(before);
    });

    it('highlights the corresponding cards when selecting a field or outline row', () => {
        renderReview(fixture());
        const frame = document.querySelector('[data-editor-frame][data-node-id="changed"]')!;
        fireEvent.click(frame);
        expect(row('changed:label').hasAttribute('data-selected')).toBe(true);
        expect(row('conflict:label').hasAttribute('data-selected')).toBe(false);
        fireEvent.click(
            within(outline('conflict') as HTMLElement).getByRole('button', {
                name: /Text.*My label.*Conflict/,
            })
        );
        expect(row('conflict:label').hasAttribute('data-selected')).toBe(true);
        expect(row('changed:label').hasAttribute('data-selected')).toBe(false);
    });

    it.each(['switch', 'radio'] as const)(
        'keeps selection when using a review %s or its label',
        (controlRole) => {
            renderReview(controlRole === 'switch' ? fixture() : differencesFixture());
            fireEvent.click(within(row('changed:label')).getByRole('button'));
            const conflict = row('conflict:label');
            const control = within(conflict).getByRole(controlRole, {
                name: controlRole === 'switch' ? /Use shipped/ : 'Take shipped',
            });
            fireEvent.click(control);
            expect((control as HTMLInputElement).checked).toBe(true);
            expect(row('changed:label').hasAttribute('data-selected')).toBe(true);
            expect(conflict.hasAttribute('data-selected')).toBe(false);
            const keep =
                controlRole === 'switch'
                    ? control
                    : within(conflict).getByRole('radio', { name: 'Keep mine' });
            fireEvent.click(keep.closest('label')!);
            expect((control as HTMLInputElement).checked).toBe(false);
            expect(row('changed:label').hasAttribute('data-selected')).toBe(true);
            expect(conflict.hasAttribute('data-selected')).toBe(false);
        }
    );

    it('disables field selection for removed nodes but keeps their review switch usable', () => {
        const baseline = page([field('gone', 'Removed'), field('kept', 'Kept')]);
        const shipped = page([field('kept', 'Kept')]);
        renderReview({ kind: 'review', mode: 'merge', baseline, copy: baseline, shipped });
        const card = row('gone:$removed');
        expect(within(card).getByRole('button').hasAttribute('disabled')).toBe(true);
        fireEvent.click(within(card).getByRole('switch'));
        expect(within(card).getByRole('button').hasAttribute('disabled')).toBe(false);
        fireEvent.click(within(card).getByRole('button'));
        expect(card.hasAttribute('data-selected')).toBe(true);
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
