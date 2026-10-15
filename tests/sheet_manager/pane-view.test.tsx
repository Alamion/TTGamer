// @vitest-environment happy-dom
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { openBeside, usePaneStore } from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { briefViewOf } from '@site/src/sheet_manager/features/sheet/panes/views';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetDocuments, seedDocuments } from './helpers/documentsWindow';
import { resetLayout } from './helpers/panes';

vi.setConfig({ testTimeout: 30_000 });

const SHIPPED_BRIEFS: ReadonlyArray<[string, string]> = [
    ['star-wars-wod', 'character'],
    ['star-wars-wod', 'droid'],
    ['star-wars-wod', 'creature'],
    ['star-wars-wod', 'vehicle'],
    ['star-wars-wod', 'fodder-group'],
    ['wod-2e', 'wod2e-character'],
    ['wod-v5', 'v5-character'],
    ['wod-v5', 'hunter'],
];

const views = () => usePaneStore.getState().views;
const preferred = (id: string) =>
    useDocumentStore.getState().documents.find((document) => document.id === id)?.metadata
        .preferredViewId;
const selectIn = (name: string) =>
    within(screen.getByRole('region', { name })).getByRole('combobox') as HTMLSelectElement;

describe('which view a pane starts in (spec 034, FR-008)', () => {
    it.each(SHIPPED_BRIEFS)('finds the brief of %s %s by the naming rule', (system, id) => {
        const definition = systemRegistry.getDocumentDefinition(system, id)!;
        const brief = briefViewOf(definition);
        expect(brief, `${system}/${id}`).toBeDefined();
        expect(definition.views.map(({ id: viewId }) => viewId)).toContain(brief);
        expect(brief === 'brief' || brief!.endsWith('-brief')).toBe(true);
    });

    it('finds none for a definition without a brief', () => {
        expect(briefViewOf({ views: [{ id: 'sheet' }] } as never)).toBeUndefined();
    });
});

describe('a pane has its own view', () => {
    beforeEach(() => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280);
        resetLayout();
        seedDocuments(['Ana', 'Bruno'], { current: 'Ana' });
        render(createElement(CharacterSheet));
    });
    afterEach(() => {
        vi.restoreAllMocks();
        cleanup();
        resetDocuments();
    });

    it('starts the document opened beside in its brief, and leaves the first one as it was', async () => {
        act(() => void openBeside('Bruno'));
        await waitFor(() => expect(screen.getAllByRole('region')).toHaveLength(2));

        expect(views()).toEqual({ Bruno: 'v5-hunter-brief' });
        expect(selectIn('Bruno').value).toBe('v5-hunter-brief');
        expect(selectIn('Ana').value).not.toBe('v5-hunter-brief');
        const page = (name: string) =>
            screen
                .getByRole('region', { name })
                .querySelector('[data-template-root]')
                ?.getAttribute('data-template-root');
        expect(page('Bruno')).toBe('v5-hunter-brief');
        expect(page('Ana')).not.toBe('v5-hunter-brief');
    });

    it('changes only that pane, never what the document prefers', async () => {
        act(() => void openBeside('Bruno'));
        await waitFor(() => expect(screen.getAllByRole('region')).toHaveLength(2));
        const before = selectIn('Ana').value;

        fireEvent.change(selectIn('Bruno'), { target: { value: 'v5-hunter-sheet' } });

        await waitFor(() => expect(views().Bruno).toBe('v5-hunter-sheet'));
        await waitFor(() =>
            expect(
                screen
                    .getByRole('region', { name: 'Bruno' })
                    .querySelector('[data-template-root]')
                    ?.getAttribute('data-template-root')
            ).toBe('v5-hunter-sheet')
        );
        expect(selectIn('Ana').value).toBe(before);
        expect(preferred('Bruno')).toBeUndefined();
        expect(preferred('Ana')).toBeUndefined();
    });

    it('has one view selector per pane and none in the toolbar', async () => {
        act(() => void openBeside('Bruno'));
        await waitFor(() => expect(screen.getAllByRole('region')).toHaveLength(2));
        expect(screen.getAllByRole('combobox')).toHaveLength(2);
    });

    it('forgets the view of a pane that is closed', async () => {
        act(() => void openBeside('Bruno'));
        await waitFor(() => expect(screen.getAllByRole('region')).toHaveLength(2));
        fireEvent.click(
            within(screen.getByRole('region', { name: 'Bruno' })).getByRole('button', {
                name: 'Close Bruno',
            })
        );
        await waitFor(() => expect(screen.queryByRole('tablist')).toBeNull());
        expect(views()).toEqual({});
    });
});
