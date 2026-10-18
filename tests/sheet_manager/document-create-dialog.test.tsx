// @vitest-environment happy-dom
import { DocumentCreateDialog } from '@site/src/sheet_manager/components/dialogs/DocumentCreateDialog';
import { CREATE_DIALOG_STORAGE_KEY } from '@site/src/sheet_manager/features/documents/createChoices';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetUserKinds, seedUserKinds } from './helpers/createDialog';

const open = (props: Partial<Parameters<typeof DocumentCreateDialog>[0]> = {}) =>
    render(createElement(DocumentCreateDialog, { open: true, onOpenChange: () => {}, ...props }));

const search = () => screen.getByRole('combobox', { name: 'Search kinds' });
const options = () =>
    within(screen.getByRole('listbox', { name: 'Document kinds' })).queryAllByRole('option');
const kinds = () => options().map((option) => option.getAttribute('data-kind'));
const type = (text: string) => fireEvent.change(search(), { target: { value: text } });

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
        expect(kinds()).toHaveLength(9 + 20 + 1);
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
        expect(kinds().length).toBeGreaterThan(9);
    });

    it('folds a group and remembers it on the device', () => {
        open();
        const heading = screen.getByRole('button', { name: 'World of Darkness 2nd Edition' });
        expect(heading.getAttribute('aria-expanded')).toBe('true');
        fireEvent.click(heading);
        expect(kinds()).not.toContain('star-wars-wod/droid');
        cleanup();

        open();
        expect(
            screen
                .getByRole('button', { name: 'World of Darkness 2nd Edition' })
                .getAttribute('aria-expanded')
        ).toBe('false');
        expect(kinds()).not.toContain('star-wars-wod/droid');
        // A search shows folded matches.
        type('droid');
        expect(kinds()).toEqual(['star-wars-wod/droid']);
        expect(JSON.parse(window.localStorage.getItem(CREATE_DIALOG_STORAGE_KEY)!).folded).toEqual([
            'r:wod-2e',
        ]);
    });

    it('shows the kinds created last under Recent, newest first', () => {
        const create = (key: string) => {
            const onOpenChange = vi.fn();
            open({ onOpenChange });
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
