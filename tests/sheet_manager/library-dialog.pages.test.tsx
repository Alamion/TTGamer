// @vitest-environment happy-dom

import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    ASHEN_ID,
    ASHEN_MORTAL_PAGE_ID,
    CULT_ID,
    CULT_PAGE_ID,
    resetLibraryStores,
    seedLibrary,
} from './helpers/library';
import {
    action,
    addMistySetting,
    lastDialog,
    MIST_ID,
    mustRow,
    openLibrary,
    press,
    row,
    select,
} from './helpers/libraryDialog';

// The editor opens from the library; full renders are slow under a loaded run.
vi.setConfig({ testTimeout: 30_000 });

describe('library dialog — pages (spec 013, US2)', () => {
    beforeEach(seedLibrary);
    afterEach(() => {
        cleanup();
        resetLibraryStores();
    });

    const openCult = () => {
        openLibrary();
        fireEvent.click(within(mustRow(`s:user:${ASHEN_ID}`)).getByLabelText(/Expand/));
        fireEvent.click(within(mustRow(`t:user:${CULT_ID}`)).getByLabelText(/Expand/));
    };

    it('opens a page in the editor with Enter and shows the saved name', () => {
        openCult();
        const page = mustRow(`p:user:${CULT_PAGE_ID}`);
        select(`p:user:${CULT_PAGE_ID}`);
        page.focus();
        press('Enter');
        const name = screen.getByLabelText('Name') as HTMLInputElement;
        expect(name.value).toBe('Cult card');
        fireEvent.change(name, { target: { value: 'Cult sheet' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(within(mustRow(`p:user:${CULT_PAGE_ID}`)).getByText('Cult sheet')).toBeTruthy();
    });

    it('duplicates a page under a fresh identity', () => {
        openCult();
        select(`p:user:${CULT_PAGE_ID}`);
        fireEvent.click(action('duplicate')!);
        const pages = useTemplateStore
            .getState()
            .templates.filter(({ documentKind }) => documentKind === CULT_ID);
        expect(pages).toHaveLength(2);
        expect(new Set(pages.map(({ id }) => id)).size).toBe(2);
    });

    it('starts a new page as a copy and makes it the first default', () => {
        addMistySetting();
        openLibrary();
        fireEvent.click(within(mustRow(`s:user:${MIST_ID}`)).getByLabelText(/Expand/));
        select(`t:core:${MIST_ID}:wod2e-character`);
        fireEvent.click(action('newPage')!);
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Island sheet' } });
        const start = screen.getByLabelText('Start from') as HTMLSelectElement;
        expect([...start.options].map(({ value }) => value)).toEqual(['blank']);
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Island sheet');
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore
            .getState()
            .templates.find(({ name }) => name === 'Island sheet')!;
        expect(saved).toMatchObject({
            systemId: 'wod-2e',
            documentKind: 'character',
            settingId: MIST_ID,
        });
        expect(useDocumentTypeStore.getState().settings[MIST_ID]!.pages).toEqual({
            'wod2e-character': saved.id,
        });
    });

    it('copies a shipped page for a shipped type', () => {
        openLibrary();
        fireEvent.click(within(mustRow('s:module:wod-v5:hunter')).getByLabelText(/Expand/));
        select('t:wod-v5:hunter');
        fireEvent.click(action('newPage')!);
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Night watch' } });
        fireEvent.change(screen.getByLabelText('Start from'), {
            target: { value: 'p:wod-v5:v5-hunter-sheet' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore
            .getState()
            .templates.find(({ name }) => name === 'Night watch')!;
        expect(saved).toMatchObject({ systemId: 'wod-v5', documentKind: 'character' });
        expect(saved.settingId).toBeUndefined();
        expect(row(`p:user:${saved.id}`)).not.toBeNull();
    });

    it('resets an edited shipped page after confirmation', () => {
        openLibrary();
        fireEvent.click(within(mustRow('s:system:star-wars-wod')).getByLabelText(/Expand/));
        fireEvent.click(within(mustRow('t:star-wars-wod:character')).getByLabelText(/Expand/));
        select('p:star-wars-wod:full-sheet');
        expect(action('delete')).toBeNull();
        fireEvent.click(action('reset')!);
        fireEvent.click(within(lastDialog()).getByRole('button', { name: 'Reset to original' }));
        expect(useTemplateStore.getState().defaultOverrides).toEqual({});
    });

    it('returns documents to their default page when their page is deleted', () => {
        openLibrary();
        fireEvent.click(within(mustRow(`s:user:${ASHEN_ID}`)).getByLabelText(/Expand/));
        fireEvent.click(
            within(mustRow(`t:core:${ASHEN_ID}:v5-character`)).getByLabelText(/Expand/)
        );
        select(`p:user:${ASHEN_MORTAL_PAGE_ID}`);
        fireEvent.click(action('delete')!);
        fireEvent.click(within(lastDialog()).getByRole('button', { name: 'Delete' }));
        const mortal = useDocumentStore.getState().documents.find(({ id }) => id === 'mortal-3')!;
        expect(mortal.metadata.templateId).toBeUndefined();
        expect(useDocumentTypeStore.getState().settings[ASHEN_ID]!.pages).toEqual({});
    });
});
