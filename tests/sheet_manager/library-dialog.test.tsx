// @vitest-environment jsdom

import { LibraryDialog } from '@site/src/sheet_manager/components/dialogs/LibraryDialog';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import type { UserSetting } from '@site/src/sheet_manager/systems/userTypes';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    ASHEN_ID,
    ASHEN_MORTAL_PAGE_ID,
    CULT_ID,
    CULT_PAGE_ID,
    ORG_ID,
    ORG_PAGE_ID,
    resetLibraryStores,
    seedLibrary,
    userSetting,
} from './helpers/library';

// The editor opens from the library; full renders are slow under a loaded run.
vi.setConfig({ testTimeout: 30_000 });

const MIST_ID = 'user-setting-mist0001';

function openLibrary() {
    return render(createElement(LibraryDialog, { open: true, onOpenChange: () => undefined }));
}

const row = (key: string) =>
    document.querySelector<HTMLElement>(`[data-library-row="${key}"]`) ?? null;
const mustRow = (key: string) => {
    const found = row(key);
    if (!found) throw new Error(`No row ${key}`);
    return found;
};
const select = (key: string) => fireEvent.click(mustRow(key));
const details = () => screen.getByRole('region', { name: /./ });
const action = (id: string) =>
    document.querySelector<HTMLButtonElement>(`[data-library-action="${id}"]`);
const press = (key: string, options: Partial<KeyboardEventInit> = {}) =>
    fireEvent.keyDown(document.activeElement!, { key, ...options });
const lastDialog = () => screen.getAllByRole('dialog').at(-1)!;

function transfer() {
    const data = new Map<string, string>();
    return {
        types: [] as string[],
        getData: (type: string) => data.get(type) ?? '',
        setData: (type: string, value: string) => void data.set(type, value),
        dropEffect: 'none',
        effectAllowed: 'move',
    };
}

function drag(fromKey: string, toKey: string) {
    const dataTransfer = transfer();
    fireEvent.dragStart(mustRow(fromKey), { dataTransfer });
    fireEvent.dragOver(mustRow(toKey), { dataTransfer });
    fireEvent.drop(mustRow(toKey), { dataTransfer });
}

function addMistySetting() {
    useDocumentTypeStore.setState((state) => ({
        settings: {
            ...state.settings,
            [MIST_ID]: userSetting({
                id: MIST_ID,
                name: 'Misty Archipelago',
                systemId: 'wod-2e' as UserSetting['systemId'],
                pages: {},
            }),
        },
    }));
}

describe('library dialog — browse (spec 013, US1)', () => {
    beforeEach(seedLibrary);
    afterEach(() => {
        cleanup();
        resetLibraryStores();
    });

    it('shows the four-level tree with ARIA levels and states', () => {
        openLibrary();
        const tree = screen.getByRole('tree', { name: 'Library' });
        const wod2e = mustRow('r:wod-2e');
        expect(wod2e.getAttribute('role')).toBe('treeitem');
        expect(wod2e.getAttribute('aria-level')).toBe('1');
        expect(wod2e.getAttribute('aria-expanded')).toBe('true');
        expect(mustRow('s:system:star-wars-wod').getAttribute('aria-level')).toBe('2');
        expect(within(tree).getByText('Ashen Realms')).toBeTruthy();
        expect(row(`t:user:${CULT_ID}`)).toBeNull();
        fireEvent.click(within(mustRow(`s:user:${ASHEN_ID}`)).getByLabelText(/Expand/));
        expect(mustRow(`t:user:${CULT_ID}`).getAttribute('aria-level')).toBe('3');
        expect(within(mustRow(`s:user:${ASHEN_ID}`)).getByText('yours')).toBeTruthy();
    });

    it('moves and expands with the keyboard', () => {
        openLibrary();
        mustRow('r:wod-2e').focus();
        select('r:wod-2e');
        press('ArrowDown');
        expect(document.activeElement).toBe(mustRow('s:rules:wod-2e'));
        press('ArrowRight');
        expect(mustRow('s:rules:wod-2e').getAttribute('aria-expanded')).toBe('true');
        press('ArrowRight');
        expect(document.activeElement).toBe(mustRow('t:wod-2e:wod2e-character'));
        press('ArrowLeft');
        expect(document.activeElement).toBe(mustRow('s:rules:wod-2e'));
        press('ArrowLeft');
        expect(mustRow('s:rules:wod-2e').getAttribute('aria-expanded')).toBe('false');
        press('End');
        expect(document.activeElement).toBe(mustRow(`s:user:${ASHEN_ID}`));
        press('Home');
        expect(document.activeElement).toBe(mustRow('r:wod-2e'));
        press('h');
        expect(document.activeElement).toBe(mustRow('s:module:wod-v5:hunter'));
        expect(mustRow('s:module:wod-v5:hunter').getAttribute('tabindex')).toBe('0');
    });

    it('shows details of the selected row and filters by search', () => {
        openLibrary();
        select('s:system:star-wars-wod');
        expect(within(details()).getByRole('heading', { name: /Star Wars/ })).toBeTruthy();
        expect(action('newType')).not.toBeNull();
        expect(action('edit')).toBeNull();
        expect(action('delete')).toBeNull();

        fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'cult' } });
        expect(row(`t:user:${CULT_ID}`)).not.toBeNull();
        expect(row('r:wod-2e')).toBeNull();
        fireEvent.change(screen.getByPlaceholderText('Search…'), {
            target: { value: 'nothing like it' },
        });
        expect(screen.getByText('Nothing matches "nothing like it".')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
        expect(row('r:wod-2e')).not.toBeNull();
    });

    it('creates a setting and a type without creating pages', () => {
        openLibrary();
        select('r:wod-2e');
        fireEvent.click(action('newSetting')!);
        fireEvent.change(screen.getByLabelText('Name'), {
            target: { value: 'Misty Archipelago' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        const [created] = Object.values(useDocumentTypeStore.getState().settings).filter(
            ({ name }) => name === 'Misty Archipelago'
        );
        expect(created).toMatchObject({ systemId: 'wod-2e', pages: {} });
        const settingKey = `s:user:${created!.id}`;
        expect(mustRow(settingKey).getAttribute('aria-selected')).toBe('true');

        select(`t:core:${created!.id}:wod2e-character`);
        expect(
            within(details()).getByText(
                'No page of its own yet — its documents open on the "Rules only" page.'
            )
        ).toBeTruthy();

        select(settingKey);
        fireEvent.click(action('newType')!);
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        expect(screen.getByRole('alert').textContent).toBe('Enter a name.');
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ship' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        const ship = Object.values(useDocumentTypeStore.getState().types).find(
            ({ name }) => name === 'Ship'
        )!;
        expect(ship.owner).toEqual({ settingId: created!.id });
        expect(ship.defaultTemplateId).toBeUndefined();
        expect(useTemplateStore.getState().templates).toHaveLength(3);
        expect(
            within(details()).getByText(
                'No pages yet — its documents show their stored values until you add one.'
            )
        ).toBeTruthy();
    });

    it('makes a page the default and marks it with a star', () => {
        openLibrary();
        fireEvent.click(within(mustRow('s:system:star-wars-wod')).getByLabelText(/Expand/));
        fireEvent.click(within(mustRow('t:star-wars-wod:character')).getByLabelText(/Expand/));
        select('p:star-wars-wod:brief');
        fireEvent.click(action('makeDefault')!);
        expect(useDocumentTypeStore.getState().defaultPages).toEqual({
            'star-wars-wod:character': 'brief',
        });
        expect(
            within(mustRow('p:star-wars-wod:brief')).getByLabelText('Default page')
        ).toBeTruthy();
        expect(action('makeDefault')).toBeNull();
        select('t:star-wars-wod:character');
        expect(within(details()).getByText(/applies to new documents/)).toBeTruthy();
    });

    it('deletes a setting after naming its documents and keeps them', () => {
        openLibrary();
        select(`s:user:${ASHEN_ID}`);
        fireEvent.click(action('delete')!);
        expect(lastDialog().textContent).toContain('4 documents belong to it');
        fireEvent.click(within(lastDialog()).getByRole('button', { name: 'Delete' }));
        expect(useDocumentTypeStore.getState().settings).toEqual({});
        expect(useDocumentTypeStore.getState().types[CULT_ID]).toBeUndefined();
        const documents = useDocumentStore.getState().documents;
        expect(documents).toHaveLength(5);
        expect(documents.filter(({ metadata }) => metadata.settingId === ASHEN_ID)).toEqual([]);
        expect(row(`s:user:${ASHEN_ID}`)).toBeNull();
    });

    it('keeps shipped items read-only and edits user items in place', () => {
        openLibrary();
        select('r:wod-v5');
        expect(action('delete')).toBeNull();
        select(`s:user:${ASHEN_ID}`);
        fireEvent.click(action('edit')!);
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ashen Lands' } });
        fireEvent.change(screen.getByLabelText('Description (optional)'), {
            target: { value: 'After the fire' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(useDocumentTypeStore.getState().settings[ASHEN_ID]).toMatchObject({
            name: 'Ashen Lands',
            description: 'After the fire',
        });
        expect(within(details()).getByText('After the fire')).toBeTruthy();
    });

    it('closes an open form before the dialog on Escape', () => {
        const onOpenChange = vi.fn();
        render(createElement(LibraryDialog, { open: true, onOpenChange }));
        select('r:wod-2e');
        fireEvent.click(action('newSetting')!);
        fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'Escape' });
        expect(screen.queryByLabelText('Name')).toBeNull();
        expect(onOpenChange).not.toHaveBeenCalled();
        fireEvent.keyDown(mustRow('r:wod-2e'), { key: 'Escape' });
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});

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

describe('library dialog — moving (spec 013, US3)', () => {
    beforeEach(() => {
        seedLibrary();
        addMistySetting();
    });
    afterEach(() => {
        cleanup();
        resetLibraryStores();
    });

    it('moves a type by dropping it on a setting of the same system', () => {
        useDocumentTypeStore.setState((state) => ({
            settings: {
                ...state.settings,
                'user-setting-dusk0001': userSetting({
                    id: 'user-setting-dusk0001',
                    name: 'Dusk',
                    pages: {},
                }),
            },
        }));
        openLibrary();
        fireEvent.click(within(mustRow(`s:user:${ASHEN_ID}`)).getByLabelText(/Expand/));
        drag(`t:user:${CULT_ID}`, 's:user:user-setting-dusk0001');
        expect(useDocumentTypeStore.getState().types[CULT_ID]!.owner).toEqual({
            settingId: 'user-setting-dusk0001',
        });
    });

    it('refuses invalid drops and never picks up shipped rows', () => {
        openLibrary();
        expect(mustRow('s:system:star-wars-wod').getAttribute('draggable')).toBe('false');
        fireEvent.click(within(mustRow(`s:user:${ASHEN_ID}`)).getByLabelText(/Expand/));
        expect(mustRow(`t:core:${ASHEN_ID}:v5-character`).getAttribute('draggable')).toBe('false');
        drag(`t:user:${CULT_ID}`, 's:rules:wod-v5');
        expect(useDocumentTypeStore.getState().types[CULT_ID]!.owner).toEqual({
            settingId: ASHEN_ID,
        });
    });

    it('confirms a drop that changes the system before anything moves', () => {
        openLibrary();
        drag(`s:user:${ASHEN_ID}`, 'r:wod-2e');
        expect(useDocumentTypeStore.getState().settings[ASHEN_ID]!.systemId).toBe('wod-v5');
        const panel = screen.getByTestId('library-move-panel');
        expect(panel.textContent).toContain('Other rules');
        expect(panel.textContent).toContain('3 documents of the rules character stay');
        expect(panel.textContent).toContain('1 page of the rules character stays');
        fireEvent.click(within(panel).getByRole('button', { name: 'Move' }));
        expect(useDocumentTypeStore.getState().settings[ASHEN_ID]!.systemId).toBe('wod-2e');
    });

    it('moves through the context menu and the destination picker', () => {
        openLibrary();
        fireEvent.contextMenu(mustRow(`s:system:star-wars-wod`));
        console.log(
            'MENU',
            document.querySelectorAll('[role="menu"]').length,
            document.body.innerHTML.includes('menuitem')
        );
        expect(screen.queryByRole('menuitem', { name: 'Move…' })).toBeNull();
        fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

        fireEvent.click(within(mustRow('s:system:star-wars-wod')).getByLabelText(/Expand/));
        fireEvent.contextMenu(mustRow(`t:user:${ORG_ID}`));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Move…' }));
        const panel = screen.getByTestId('library-move-panel');
        expect(within(panel).getByRole('button', { name: 'Move' })).toHaveProperty(
            'disabled',
            true
        );
        fireEvent.click(within(panel).getByRole('button', { name: /Misty Archipelago/ }));
        expect(panel.textContent).toContain('Other rules');
        act(() => {
            fireEvent.click(within(panel).getByRole('button', { name: 'Move' }));
        });
        expect(useDocumentTypeStore.getState().types[ORG_ID]!.owner).toEqual({
            settingId: MIST_ID,
        });
        expect(
            useTemplateStore.getState().templates.find(({ id }) => id === ORG_PAGE_ID)
        ).toMatchObject({ systemId: 'wod-2e' });
    });
});

function jsonFile(content: string, name = 'library.json') {
    // jsdom's File has no text(); the import reads files through it.
    return Object.assign(new File([content], name, { type: 'application/json' }), {
        text: async () => content,
    });
}

const tick = (key: string) => within(mustRow(key)).getByRole('checkbox') as HTMLButtonElement;

describe('library dialog — export (spec 013, US4)', () => {
    beforeEach(seedLibrary);
    afterEach(() => {
        cleanup();
        resetLibraryStores();
    });

    it('ticks branches with partial states and adds parents in tertiary', () => {
        openLibrary();
        fireEvent.click(screen.getByRole('button', { name: 'Export' }));
        expect(screen.getByRole('button', { name: 'Save file' })).toHaveProperty('disabled', true);
        fireEvent.click(within(mustRow(`s:user:${ASHEN_ID}`)).getByLabelText(/Expand/));
        fireEvent.click(within(mustRow(`t:user:${CULT_ID}`)).getByLabelText(/Expand/));
        fireEvent.click(tick(`p:user:${CULT_PAGE_ID}`));

        expect(tick(`p:user:${CULT_PAGE_ID}`).getAttribute('aria-checked')).toBe('true');
        const settingBox = tick(`s:user:${ASHEN_ID}`);
        expect(settingBox.getAttribute('data-auto')).toBe('true');
        expect(settingBox.className).toContain('bg-tertiary');
        expect(
            within(mustRow(`t:user:${CULT_ID}`)).getByText('added for "Cult card"')
        ).toBeTruthy();
        expect(tick('r:wod-v5').getAttribute('aria-checked')).toBe('mixed');
        expect(row('r:wod-2e')!.querySelector('[role="checkbox"]')).not.toBeNull();
        fireEvent.click(within(mustRow('r:wod-2e')).getByLabelText(/Collapse/));
        expect(screen.getByTestId('library-export-counts').textContent).toBe(
            'In the file: 1 setting, 1 type, 1 page.'
        );
        const preview = JSON.parse(screen.getByTestId('library-export-preview').textContent!);
        expect(preview.format).toBe('ttgamer-library');
        expect(preview.included[ASHEN_ID]).toBe('auto');
        expect(screen.getByRole('button', { name: 'Save file' })).toHaveProperty('disabled', false);
    });

    it('opens export with the item of the Export action picked', () => {
        openLibrary();
        select(`s:user:${ASHEN_ID}`);
        fireEvent.click(action('export')!);
        expect(screen.getByRole('button', { name: 'Export', pressed: true })).toBeTruthy();
        expect(tick(`s:user:${ASHEN_ID}`).getAttribute('aria-checked')).toBe('true');
        // Tertiary appears only for parts added automatically.
        expect(document.querySelectorAll('.bg-tertiary')).toHaveLength(0);
    });
});

describe('library dialog — import (spec 013, US5)', () => {
    beforeEach(seedLibrary);
    afterEach(() => {
        cleanup();
        resetLibraryStores();
    });

    const chooseFile = async (content: string) => {
        fireEvent.click(screen.getByRole('button', { name: 'Import' }));
        fireEvent.change(screen.getByLabelText('Library file'), {
            target: { files: [jsonFile(content)] },
        });
    };

    it('rejects a broken file without changing anything', async () => {
        openLibrary();
        const before = JSON.stringify(useDocumentTypeStore.getState().types);
        await chooseFile('{"format":"x"}');
        expect((await screen.findByRole('alert')).textContent).toBe(
            'This is not a library, type, or page file.'
        );
        expect(JSON.stringify(useDocumentTypeStore.getState().types)).toBe(before);
    });

    it('previews conflicts and keeps both on request', async () => {
        const cultPage = useTemplateStore
            .getState()
            .templates.find(({ id }) => id === CULT_PAGE_ID)!;
        const content = JSON.stringify({
            format: 'ttgamer-library',
            version: 1,
            templates: [{ ...cultPage, name: 'Cult card v2' }],
        });
        openLibrary();
        await chooseFile(content);
        const conflict = await screen.findByText('conflict');
        const pageRow = conflict.closest('[data-import-row]') as HTMLElement;
        fireEvent.click(within(pageRow).getByRole('button', { name: 'Keep both' }));
        fireEvent.click(screen.getByRole('button', { name: 'Import selected' }));
        const pages = useTemplateStore
            .getState()
            .templates.filter(({ documentKind }) => documentKind === CULT_ID);
        expect(pages.map(({ name }) => name).sort()).toEqual([
            'Cult card',
            'Cult card v2 (imported)',
        ]);
        expect(screen.getByRole('button', { name: 'Browse', pressed: true })).toBeTruthy();
    });

    it('imports a page file named like a shipped view under a fresh id', async () => {
        const content = JSON.stringify({
            format: 'ttgamer-template',
            formatVersion: 3,
            template: libraryPageLike('full-sheet', 'Look-alike'),
        });
        openLibrary();
        await chooseFile(content);
        await screen.findByText('new');
        fireEvent.click(screen.getByRole('button', { name: 'Import selected' }));
        const imported = useTemplateStore
            .getState()
            .templates.find(({ name }) => name === 'Look-alike')!;
        expect(imported.id).not.toBe('full-sheet');
        expect(imported.id).toMatch(/^tpl-/);
    });
});

function libraryPageLike(id: string, name: string) {
    return {
        id,
        name,
        systemId: 'star-wars-wod',
        documentKind: 'character',
        schemaVersion: 3,
        children: [{ id: 'notes', type: 'text', label: 'Notes' }],
    };
}
