// @vitest-environment happy-dom
import { DocumentCreateDialog } from '@site/src/sheet_manager/components/dialogs/DocumentCreateDialog';
import { CREATE_DIALOG_STORAGE_KEY } from '@site/src/sheet_manager/features/documents/createChoices';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { resetUserKinds, seedUserKinds } from './helpers/createDialog';

const open = (props: Partial<Parameters<typeof DocumentCreateDialog>[0]> = {}) =>
    render(createElement(DocumentCreateDialog, { open: true, onOpenChange: () => {}, ...props }));

const search = () => screen.getByRole('combobox', { name: 'Search kinds' });
const options = () =>
    within(screen.getByRole('listbox', { name: 'Document kinds' })).queryAllByRole('option');
const kinds = () => options().map((option) => option.getAttribute('data-kind'));
const type = (text: string) => fireEvent.change(search(), { target: { value: text } });
/** Opens every folded heading (the settings inside a ruleset start folded). */
const openAll = () => {
    for (let heading = document.querySelector('button[aria-expanded="false"]'); heading;) {
        fireEvent.click(heading);
        heading = document.querySelector('button[aria-expanded="false"]');
    }
};

beforeEach(() => {
    useDocumentStore.setState({ documents: [], entries: [], folders: [], currentDocumentId: null });
    seedUserKinds();
});

afterEach(() => {
    cleanup();
    resetUserKinds();
});

describe('finding the kind (spec 039, US1)', () => {
    it('opens with the focus in the search and every kind under its ruleset', () => {
        open();
        expect(document.activeElement).toBe(search());
        // Rulesets start open, the settings inside them folded.
        const expanded = (name: string) =>
            screen.getByRole('button', { name }).getAttribute('aria-expanded');
        expect(expanded('World of Darkness 2nd Edition')).toBe('true');
        expect(expanded('World of Darkness 5th Edition')).toBe('true');
        expect(expanded('Star Wars (World of Darkness 2e)')).toBe('false');
        expect(expanded('Lunar Colony')).toBe('false');
        expect(kinds()).toEqual(['wod-v5/hunter', 'wod-v5/vampire']);
        openAll();
        expect(kinds()).toHaveLength(10 + 20 + 2);
        const v5 = screen.getByRole('group', { name: 'World of Darkness 5th Edition' });
        expect(within(v5).getByRole('group', { name: 'Lunar Colony' })).toBeTruthy();
        expect(within(v5).getAllByRole('option', { name: /^Habitat/ })).toHaveLength(2);
        expect(screen.getByText('Mining outpost')).toBeTruthy();
    });

    it('narrows the list as the player types and keeps the headings', () => {
        open();
        type('vamp');
        expect(kinds()).toEqual(['wod-v5/vampire']);
        expect(screen.getByText('World of Darkness 5th Edition')).toBeTruthy();
        expect(screen.getByRole('option', { name: /Vampire/ }).getAttribute('aria-selected')).toBe(
            'true'
        );
        fireEvent.keyDown(search(), { key: 'Enter' });
        expect(screen.getByRole('heading', { name: 'Character' })).toBeTruthy();
    });

    it('says when nothing matches and offers to clear the search', () => {
        open();
        type('zzzz');
        expect(kinds()).toEqual([]);
        expect(screen.getByText('No kind matches "zzzz".')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
        expect((search() as HTMLInputElement).value).toBe('');
        expect(kinds().length).toBeGreaterThan(0);
    });

    it('remembers folded rulesets and opened settings on the device', () => {
        open();
        fireEvent.click(screen.getByRole('button', { name: 'Star Wars (World of Darkness 2e)' }));
        expect(kinds()).toContain('star-wars-wod/droid');
        fireEvent.click(screen.getByRole('button', { name: 'World of Darkness 5th Edition' }));
        expect(kinds()).not.toContain('wod-v5/vampire');
        cleanup();

        open();
        const expanded = (name: string) =>
            screen.getByRole('button', { name }).getAttribute('aria-expanded');
        expect(expanded('Star Wars (World of Darkness 2e)')).toBe('true');
        expect(expanded('World of Darkness 5th Edition')).toBe('false');
        expect(kinds()).toContain('star-wars-wod/droid');
        expect(kinds()).not.toContain('wod-v5/vampire');
        // A search shows folded matches.
        type('vamp');
        expect(kinds()).toEqual(['wod-v5/vampire']);
        expect(JSON.parse(window.localStorage.getItem(CREATE_DIALOG_STORAGE_KEY)!).toggled).toEqual(
            ['s:system:star-wars-wod', 'r:wod-v5']
        );
    });

    it('shows the kinds created last under Recent, newest first', () => {
        const create = (key: string) => {
            const onOpenChange = vi.fn();
            open({ onOpenChange });
            openAll();
            fireEvent.click(document.querySelector(`[data-kind="${key}"]`)!);
            fireEvent.click(screen.getByRole('button', { name: 'Create' }));
            expect(onOpenChange).toHaveBeenCalledWith(false);
            cleanup();
        };
        create('wod-v5/vampire');
        create('star-wars-wod/vehicle');
        open();
        const recent = screen.getByRole('group', { name: 'Recent' });
        expect(
            within(recent)
                .getAllByRole('option')
                .map((option) => option.getAttribute('data-recent-kind'))
        ).toEqual(['star-wars-wod/vehicle', 'wod-v5/vampire']);
        // The newest kind is chosen.
        expect(screen.getByRole('heading', { name: 'Vehicle' })).toBeTruthy();
        expect(useDocumentStore.getState().entries).toHaveLength(2);
    });
});

describe('naming and placing it (spec 039, US2)', () => {
    const folder = (id: string, name: string, parentId: string | null = null) => ({
        id,
        name,
        parentId,
        rank: 1,
        createdAt: '2026-10-18T00:00:00.000Z',
        changedAt: '2026-10-18T00:00:00.000Z',
        updatedAt: 0,
    });

    beforeEach(() => {
        useDocumentStore.setState({
            folders: [
                folder('f1', 'Campaign'),
                folder('f2', 'Session 3', 'f1'),
                folder('f3', 'Archive'),
            ],
        });
    });

    it('creates a named document with Enter in the name field', () => {
        const onCreated = vi.fn();
        open({ onCreated });
        type('vamp');
        fireEvent.keyDown(search(), { key: 'Enter' });
        const name = screen.getByRole('textbox', { name: 'Name' });
        expect(document.activeElement).toBe(name);
        fireEvent.change(name, { target: { value: 'Night watch' } });
        fireEvent.keyDown(name, { key: 'Enter' });
        const [entry] = useDocumentStore.getState().entries;
        expect(entry).toMatchObject({
            name: 'Night watch',
            definitionId: 'vampire',
            parentId: null,
        });
        expect(onCreated).toHaveBeenCalledWith(entry!.id, { named: true, parentId: null });
    });

    it('starts in the folder it was opened from and moves the document to another one', () => {
        const onCreated = vi.fn();
        open({ parentId: 'f2', onCreated });
        const place = screen.getByRole('button', { name: 'Folder Campaign / Session 3' });
        fireEvent.click(place);
        const picker = screen.getByRole('dialog', { name: 'Choose a folder' });
        fireEvent.click(within(picker).getByRole('treeitem', { name: /Archive/ }));
        fireEvent.click(within(picker).getByRole('button', { name: 'Put it here' }));
        expect(screen.getByRole('button', { name: 'Folder Archive' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        const [entry] = useDocumentStore.getState().entries;
        expect(entry!.parentId).toBe('f3');
        expect(onCreated).toHaveBeenCalledWith(entry!.id, { named: false, parentId: 'f3' });
    });

    it('shows a deleted folder as the top level', () => {
        open({ parentId: 'gone' });
        expect(screen.getByRole('button', { name: 'Folder Top level' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        expect(useDocumentStore.getState().entries[0]!.parentId).toBeNull();
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['document-folder-missing']);
    });
});

describe('starting from an example (spec 039, US3)', () => {
    it('offers Blank and the examples only for kinds that ship them', () => {
        open();
        openAll();
        fireEvent.click(document.querySelector('[data-kind="star-wars-wod/droid"]')!);
        expect(screen.queryByRole('group', { name: 'Start from' })).toBeNull();
        fireEvent.click(document.querySelector('[data-kind="star-wars-wod/vehicle"]')!);
        const start = screen.getByRole('group', { name: 'Start from' });
        expect(
            within(start)
                .getAllByRole('radio')
                .map((radio) => radio.parentElement?.textContent)
        ).toEqual([
            'Blank',
            'Red Five (example)',
            "Luke's landspeeder (example)",
            'Millennium Falcon (example)',
        ]);
        expect(within(start).getByRole('radio', { name: 'Blank' })).toHaveProperty('checked', true);
    });

    it('creates a copy of the chosen example, named after it', () => {
        open();
        type('vamp');
        fireEvent.click(screen.getByRole('radio', { name: 'Mirela Voss (example)' }));
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        const [created] = useDocumentStore.getState().documents;
        expect(created!.metadata.title).toBe('Mirela Voss');
        expect((created!.data as { clan: string }).clan).toBe('Toreador');
    });

    it('starts blank again when another kind is chosen', () => {
        open();
        type('vamp');
        fireEvent.click(screen.getByRole('radio', { name: 'Mirela Voss (example)' }));
        type('hunter');
        expect(screen.getByRole('radio', { name: 'Blank' })).toHaveProperty('checked', true);
    });
});

describe('keyboard and phone (spec 039, US4)', () => {
    it('walks the visible kinds with the arrows and creates with Enter, Enter', () => {
        open();
        openAll();
        fireEvent.keyDown(search(), { key: 'ArrowDown' });
        fireEvent.keyDown(search(), { key: 'ArrowDown' });
        const active = search().getAttribute('aria-activedescendant')!;
        expect(document.getElementById(active)?.getAttribute('data-kind')).toBe(kinds()[1]);
        fireEvent.keyDown(search(), { key: 'ArrowUp' });
        fireEvent.keyDown(search(), { key: 'ArrowUp' });
        // Up from the first row wraps to the last.
        expect(
            document.getElementById(search().getAttribute('aria-activedescendant')!)?.textContent
        ).toMatch(/^Habitat|^Ledger/);
        fireEvent.keyDown(search(), { key: 'ArrowDown' });
        fireEvent.keyDown(search(), { key: 'Enter' });
        expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Name' }));
        fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
        expect(useDocumentStore.getState().entries[0]!.definitionId).toBe('wod2e-character');
    });

    it('clears the search with the first Escape and closes with the second', () => {
        const onOpenChange = vi.fn();
        open({ onOpenChange });
        type('vamp');
        fireEvent.keyDown(search(), { key: 'Escape' });
        expect((search() as HTMLInputElement).value).toBe('');
        expect(onOpenChange).not.toHaveBeenCalled();
        fireEvent.keyDown(search(), { key: 'Escape' });
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('announces the number of matching kinds', () => {
        open();
        const live = document.querySelector('[aria-live="polite"]')!;
        expect(live.textContent).toBe('');
        type('habitat');
        expect(live.textContent).toBe('2 kinds');
        type('vamp');
        expect(live.textContent).toBe('1 kind');
    });

    it('creates a kind with a unique three-letter prefix in five keystrokes at 50 kinds (SC-001)', () => {
        resetUserKinds();
        seedUserKinds(38);
        open();
        openAll();
        expect(kinds()).toHaveLength(50);
        type('v');
        type('va');
        type('vam');
        fireEvent.keyDown(search(), { key: 'Enter' });
        fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
        expect(useDocumentStore.getState().entries[0]!.definitionId).toBe('vampire');
    });

    it('clears a chosen user type deleted while the dialog is open', () => {
        open();
        openAll();
        fireEvent.click(screen.getByRole('option', { name: /Ledger 3/ }));
        expect(screen.getByRole('heading', { name: 'Ledger 3' })).toBeTruthy();
        act(() => resetUserKinds());
        expect(screen.queryByRole('option', { name: /Ledger 3/ })).toBeNull();
        expect(screen.getByText('Choose a kind of document first.')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Create' })).toHaveProperty('disabled', true);
    });

    it('shows the kinds, then the details with a way back, as two steps on a phone', () => {
        open();
        const kindsStep = () => document.querySelector('[data-step="kinds"]')!;
        const detailsStep = () => document.querySelector('[data-step="details"]')!;
        expect(kindsStep().className).toMatch(/(^| )flex( |$)/);
        expect(detailsStep().className).toMatch(/(^| )hidden( |$)/);
        fireEvent.click(document.querySelector('[data-kind="wod-v5/hunter"]')!);
        expect(kindsStep().className).toMatch(/(^| )hidden( |$)/);
        expect(detailsStep().className).toMatch(/(^| )flex( |$)/);
        fireEvent.click(screen.getByRole('button', { name: 'Back to kinds' }));
        expect(kindsStep().className).toMatch(/(^| )flex( |$)/);
        expect(document.activeElement).toBe(search());
    });
});
