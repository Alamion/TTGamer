// @vitest-environment jsdom

import { LibraryDialog } from '@site/src/sheet_manager/components/dialogs/LibraryDialog';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ASHEN_ID, CULT_ID, resetLibraryStores, seedLibrary } from './helpers/library';
import {
    action,
    details,
    lastDialog,
    mustRow,
    openLibrary,
    press,
    row,
    select,
} from './helpers/libraryDialog';

// The editor opens from the library; full renders are slow under a loaded run.
vi.setConfig({ testTimeout: 30_000 });

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
