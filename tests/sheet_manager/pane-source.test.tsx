// @vitest-environment happy-dom
import { getCharacterName, getRollSource } from '@site/src/dice_roller/utils/sessionStorage';
import { getShownDocument } from '@site/src/integrations/sheet-dice/shownDocument';
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { openBeside, setPaneView } from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetDocuments, seedDocuments } from './helpers/documentsWindow';
import { openDocumentIds, resetLayout } from './helpers/panes';

vi.setConfig({ testTimeout: 40_000 });

const region = (name: string) => screen.getByRole('region', { name });
const titleOf = (id: string) =>
    useDocumentStore.getState().documents.find((document) => document.id === id)?.metadata.title;

beforeEach(async () => {
    sessionStorage.clear();
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280);
    resetLayout();
    seedDocuments(['Ana', 'Bruno'], { current: 'Ana' });
    for (const name of ['Ana', 'Bruno']) {
        useDocumentStore
            .getState()
            .updateDocumentData(name, (data) => ({ ...(data as object), name }));
    }
    render(createElement(CharacterSheet));
    act(() => void openBeside('Bruno'));
    await waitFor(() => expect(screen.getAllByRole('region')).toHaveLength(2));
    act(() => setPaneView('Bruno', 'v5-hunter-sheet'));
});
afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    resetDocuments();
});

describe('rolls and the dice panel follow the pane (spec 034, US5)', () => {
    it('writes a value only into the document of the pane it was typed in', async () => {
        const field = await within(region('Bruno')).findAllByRole('textbox', { name: 'Name' });
        fireEvent.change(field[0]!, { target: { value: 'Bruno the Bold' } });

        await waitFor(() => expect(titleOf('Bruno')).toBe('Bruno the Bold'));
        expect(titleOf('Ana')).toBe('Ana');
    });

    it('queues a roll under the name of the pane it came from', async () => {
        for (const name of ['Bruno', 'Ana']) {
            const roll = (
                await within(region(name)).findAllByRole('button', { name: /^Roll / })
            )[0]!;
            fireEvent.click(roll);
            expect(getCharacterName(), name).toBe(name);
            expect(getRollSource()).toMatchObject({ systemId: 'wod-v5', definitionId: 'hunter' });
        }
    });

    it('makes the pane that is clicked or typed in the current document, and the shown one', async () => {
        fireEvent.pointerDown(region('Ana'));
        expect(useDocumentStore.getState().currentDocumentId).toBe('Ana');
        expect(getShownDocument()).toMatchObject({ definitionId: 'hunter' });

        const field = await within(region('Bruno')).findAllByRole('textbox', { name: 'Name' });
        fireEvent.focus(field[0]!);
        expect(useDocumentStore.getState().currentDocumentId).toBe('Bruno');
    });

    it('keeps every pane document loaded while up to six are open', async () => {
        const names = ['C', 'D', 'E', 'F'];
        seedMore(names);
        for (const name of names) act(() => void openBeside(name));
        await waitFor(() => expect(openDocumentIds()).toHaveLength(6));
        const loaded = useDocumentStore.getState().documents.map(({ id }) => id);
        for (const id of openDocumentIds()) expect(loaded).toContain(id);
    });
});

function seedMore(names: string[]) {
    const { documents, entries, currentDocumentId } = useDocumentStore.getState();
    const template = documents[0]!;
    const added = names.map((id) => ({
        ...template,
        id,
        metadata: { ...template.metadata, title: id },
    }));
    useDocumentStore.setState({
        documents: [...documents, ...added],
        entries: [
            ...entries,
            ...added.map((document, index) => ({
                ...entries[0]!,
                id: document.id,
                name: document.id,
                rank: entries.length + index + 1,
            })),
        ],
        currentDocumentId,
    });
}
