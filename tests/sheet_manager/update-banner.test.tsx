// @vitest-environment happy-dom

import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import {
    reviewBaseFor,
    useSilentAdvance,
} from '@site/src/sheet_manager/features/sheet/data/pendingUpdate';
import {
    pendingUpdate,
    revisionOf,
    shippedPageFor,
} from '@site/src/sheet_manager/features/sheet/data/shippedRevision';
import { openBeside } from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { overrideKey, useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems/index';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { resetDocuments } from './helpers/documentsWindow';
import { renderEditor } from './helpers/editor';
import { libraryDocument, resetLibraryStores } from './helpers/library';
import { resetLayout, roomyArea } from './helpers/panes';

const shipped = shippedPageFor('general', 'general-note')!;
const key = overrideKey(shipped.systemId, shipped.id);
const banner = () => screen.queryByRole('region', { name: 'Shipped page update' });
const base = {
    ...shipped,
    children: [
        { ...shipped.children[0]!, label: 'Earlier name', labelMessage: undefined },
        ...shipped.children.slice(1),
    ],
};
function edited(): CustomTemplate {
    return {
        ...shipped,
        children: [
            ...base.children,
            { id: 'mine', type: 'text', label: 'My own field', required: false, multiline: false },
        ],
    };
}
function seed(withBase = true) {
    const copy = edited();
    useTemplateStore.getState().setDefaultOverride(copy, withBase ? { base } : undefined);
    const document = {
        ...libraryDocument('note', { systemId: 'general', definitionId: 'note' }),
        metadata: { title: 'note', tags: [], seededPresets: [shipped.id] },
        templateValues: { mine: 'Kept value', orphan: 42 },
    };
    useDocumentStore.setState({ documents: [document], currentDocumentId: document.id });
    return copy;
}
function SilentHost() {
    useSilentAdvance(shipped.systemId, shipped.id);
    return null;
}

beforeEach(() => {
    resetLibraryStores();
    resetDocuments();
    resetLayout();
    useTemplateStore.setState({ overrideBases: {} });
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('shipped page update banner', () => {
    it.each([true, false])(
        'shows a labelled region above the unchanged copy (base: %s)',
        (withBase) => {
            seed(withBase);
            const before = JSON.stringify(useDocumentStore.getState().documents);
            const { container } = render(<CharacterSheet />);
            expect(banner()).toBeTruthy();
            expect(banner()?.textContent).toContain('Note');
            expect(banner()?.textContent).toContain(
                withBase
                    ? 'You edited this page.'
                    : 'Your copy was made before updates were tracked.'
            );
            expect(screen.queryByRole('alert')).toBeNull();
            expect(screen.getByLabelText('My own field')).toBeTruthy();
            expect(container.querySelector('[data-template-root]')?.previousElementSibling).toBe(
                banner()
            );
            expect(JSON.stringify(useDocumentStore.getState().documents)).toBe(before);
        }
    );

    it('does not show for an unedited page', () => {
        seed();
        useTemplateStore.getState().clearDefaultOverride(shipped.systemId, shipped.id);
        render(<CharacterSheet />);
        expect(banner()).toBeNull();
    });

    it.each([true, false])(
        'remembers Not now, and shows again for another revision (base: %s)',
        (withBase) => {
            seed(withBase);
            render(<CharacterSheet />);
            fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
            expect(useTemplateStore.getState().overrideBases[key]?.dismissed).toBe(
                revisionOf(shipped)
            );
            expect(banner()).toBeNull();
            act(() =>
                useTemplateStore
                    .getState()
                    .dismissUpdate(shipped.systemId, shipped.id, 'older-revision')
            );
            expect(banner()).toBeTruthy();
        }
    );

    it('starts hidden for a dismissed revision', () => {
        seed();
        useTemplateStore
            .getState()
            .dismissUpdate(shipped.systemId, shipped.id, revisionOf(shipped));
        render(<CharacterSheet />);
        expect(banner()).toBeNull();
    });

    it.each([true, false])(
        'opens the review without changing any document (base: %s)',
        async (withBase) => {
            seed(withBase);
            const before = JSON.stringify(useDocumentStore.getState().documents);
            render(<CharacterSheet />);
            fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
            const review = await screen.findByRole('region', { name: 'Review shipped changes' });
            expect(
                withBase
                    ? within(review).getAllByRole('switch').length
                    : within(review).getAllByRole('radiogroup').length
            ).toBeGreaterThan(0);
            expect(JSON.stringify(useDocumentStore.getState().documents)).toBe(before);
            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(screen.getByLabelText('My own field')).toBeTruthy();
            expect(JSON.stringify(useDocumentStore.getState().documents)).toBe(before);
        }
    );

    it('shows the banner even when the merge fails, then opens differences', async () => {
        seed();
        useTemplateStore.setState({
            overrideBases: {
                [key]: {
                    base: { ...base, children: [shipped.children[0]!, shipped.children[0]!] },
                    revision: 'old',
                },
            },
        });
        render(<CharacterSheet />);
        expect(banner()).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
        await screen.findByText('This page could not be merged; your copy is unchanged.');
        expect(screen.getAllByRole('radiogroup').length).toBeGreaterThan(0);
        expect(takeSheetIssues()).toEqual([
            expect.objectContaining({ code: 'template-merge-failed' }),
        ]);
    });

    it('puts each edited page’s own banner in its pane', async () => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280);
        seed();
        const other = shippedPageFor('wod-v5', 'v5-hunter-brief')!;
        useTemplateStore.getState().setDefaultOverride({ ...other, name: 'My hunter brief' });
        const hunter = libraryDocument('hunter', { systemId: 'wod-v5', definitionId: 'hunter' });
        useDocumentStore.setState((state) => ({ documents: [...state.documents, hunter] }));
        render(<CharacterSheet />);
        roomyArea();
        act(() => void openBeside(hunter.id));
        await waitFor(() =>
            expect(screen.getAllByRole('region', { name: 'Shipped page update' })).toHaveLength(2)
        );
        for (const id of ['note', 'hunter']) {
            expect(
                within(screen.getByRole('region', { name: id })).getByRole('region', {
                    name: 'Shipped page update',
                })
            ).toBeTruthy();
        }
        expect(
            screen
                .getAllByRole('region', { name: 'Shipped page update' })
                .map((node) => node.textContent)
                .join(' ')
        ).toContain('My hunter brief');
    });

    it.each(['merge', 'identical'] as const)(
        'silently records the base exactly once (%s)',
        async (mode) => {
            seed();
            // A changed base with a copy already equal to shipped has nothing left to apply.
            useTemplateStore
                .getState()
                .setDefaultOverride(shipped, mode === 'merge' ? { base } : undefined);
            if (mode === 'identical') useTemplateStore.setState({ overrideBases: {} });
            let saves = 0;
            const unsubscribe = useTemplateStore.subscribe((state, previous) => {
                if (state.defaultOverrides !== previous.defaultOverrides) saves++;
            });
            try {
                render(
                    <StrictMode>
                        <CharacterSheet />
                    </StrictMode>
                );
                await waitFor(() =>
                    expect(useTemplateStore.getState().overrideBases[key]?.base).toEqual(shipped)
                );
                expect(banner()).toBeNull();
                expect(saves).toBe(1);
            } finally {
                unsubscribe();
            }
        }
    );

    it('does not advance a base while that page has an editor session', () => {
        useTemplateStore.getState().setDefaultOverride(shipped, { base });
        const editor = renderEditor(shipped);
        const before = useTemplateStore.getState().overrideBases[key];
        const host = render(<SilentHost />);
        expect(useTemplateStore.getState().overrideBases[key]).toBe(before);
        editor.unmount();
        expect(useTemplateStore.getState().overrideBases[key]?.base).toEqual(shipped);
        host.unmount();
    });

    it('does not write when there is no override', () => {
        render(<SilentHost />);
        expect(useTemplateStore.getState().overrideBases).toEqual({});
    });
});

it('finds a changed base for every edited shipped page and none without a copy (SC-001)', () => {
    for (const system of systemRegistry.getSystems()) {
        for (const shipped of system.defaultTemplates ?? []) {
            const base = { ...shipped, name: `${shipped.name} previously` };
            const record = { base, revision: revisionOf(base) };
            expect(
                pendingUpdate({ shipped, copy: shipped, record }),
                `${system.id}:${shipped.id}`
            ).toBe('base-differs');
            expect(pendingUpdate({ shipped, copy: undefined, record })).toBe('none');
        }
    }
});

it('builds the same review base for banner and editor, including dismissal-only copies', () => {
    const copy = edited();
    const pending = {
        state: 'base-differs' as const,
        copy,
        shipped,
        record: { base, revision: revisionOf(base) },
    };
    expect(reviewBaseFor(pending)).toEqual({
        kind: 'review',
        copy,
        shipped,
        mode: 'merge',
        baseline: base,
    });
    expect(reviewBaseFor({ ...pending, record: { dismissed: 'earlier' } })).toEqual({
        kind: 'review',
        copy,
        shipped,
        mode: 'differences',
    });
    expect(reviewBaseFor({ ...pending, copy: undefined })).toBeUndefined();
    expect(reviewBaseFor({ ...pending, shipped: undefined })).toBeUndefined();
});
