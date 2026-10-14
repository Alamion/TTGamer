// @vitest-environment happy-dom

import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ASHEN_ID, resetLibraryStores, seedLibrary, userSetting } from './helpers/library';
import {
    action,
    addMistySetting,
    lastDialog,
    MIST_ID,
    mustRow,
    openLibrary,
} from './helpers/libraryDialog';

vi.setConfig({ testTimeout: 30_000 });

const DUSK_ID = 'user-setting-dusk0001';
const ashen = `s:user:${ASHEN_ID}`;
const dusk = `s:user:${DUSK_ID}`;
const mist = `s:user:${MIST_ID}`;

const selected = () =>
    [...document.querySelectorAll('[data-tree-row][aria-selected="true"]')].map((row) =>
        row.getAttribute('data-tree-row')
    );

describe('library dialog — several selected rows', () => {
    beforeEach(() => {
        seedLibrary();
        addMistySetting();
        useDocumentTypeStore.setState((state) => ({
            settings: {
                ...state.settings,
                [DUSK_ID]: userSetting({ id: DUSK_ID, name: 'Dusk', pages: {} }),
            },
        }));
    });
    afterEach(() => {
        cleanup();
        resetLibraryStores();
    });

    it('adds and removes rows with Ctrl or Cmd click and shows them together', () => {
        openLibrary();
        fireEvent.click(mustRow(ashen));
        fireEvent.click(mustRow(mist), { ctrlKey: true });
        expect(selected().sort()).toEqual([ashen, mist].sort());
        expect(screen.getByRole('tree').getAttribute('aria-multiselectable')).toBe('true');
        const panel = screen.getByRole('region', { name: '2 items selected' });
        expect(
            within(panel)
                .getAllByRole('listitem')
                .map((item) => item.textContent)
        ).toEqual([
            expect.stringContaining('Ashen Realms'),
            expect.stringContaining('Misty Archipelago'),
        ]);

        fireEvent.click(mustRow(mist), { metaKey: true });
        expect(selected()).toEqual([ashen]);
        expect(screen.queryByRole('region', { name: /items selected/ })).toBeNull();
    });

    it('selects a range with Shift click and with Shift and the arrows', () => {
        openLibrary();
        fireEvent.click(mustRow(ashen));
        mustRow(ashen).focus();
        fireEvent.keyDown(mustRow(ashen), { key: 'ArrowDown', shiftKey: true });
        expect(selected()).toHaveLength(2);
        fireEvent.click(mustRow(dusk), { shiftKey: true });
        expect(selected().length).toBeGreaterThanOrEqual(2);
        expect(selected()).toContain(ashen);
        expect(selected()).toContain(dusk);
    });

    it('a plain click goes back to one row', () => {
        openLibrary();
        fireEvent.click(mustRow(ashen));
        fireEvent.click(mustRow(dusk), { ctrlKey: true });
        fireEvent.click(mustRow(mist));
        expect(selected()).toEqual([mist]);
    });

    it('deletes all selected rows after one confirmation', () => {
        openLibrary();
        fireEvent.click(mustRow(ashen));
        fireEvent.click(mustRow(dusk), { ctrlKey: true });
        fireEvent.click(action('delete')!);
        const dialog = lastDialog();
        expect(within(dialog).getByText('Delete the selected items?')).toBeTruthy();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
        const { settings } = useDocumentTypeStore.getState();
        expect(Object.keys(settings)).toEqual([MIST_ID]);
        expect(selected()).toEqual([]);
    });

    it('keeps Delete back while a selected row cannot be deleted', () => {
        openLibrary();
        fireEvent.click(mustRow('s:system:star-wars-wod'));
        fireEvent.click(mustRow(ashen), { ctrlKey: true });
        expect(action('delete')!.hasAttribute('disabled')).toBe(true);
        expect(screen.getByRole('note').textContent).toContain('1 selected row cannot be deleted');
    });

    it('moves rows of one kind together to a place both can go to', () => {
        openLibrary();
        fireEvent.click(mustRow(ashen));
        fireEvent.click(mustRow(dusk), { ctrlKey: true });
        fireEvent.click(action('move')!);
        const targets = screen.getByRole('group', { name: 'Destinations' });
        const choices = within(targets).getAllByRole('button');
        expect(choices.length).toBeGreaterThan(0);
        fireEvent.click(choices[0]!);
        fireEvent.click(screen.getByRole('button', { name: 'Move' }));
        const { settings } = useDocumentTypeStore.getState();
        expect(settings[ASHEN_ID]!.systemId).toBe(settings[DUSK_ID]!.systemId);
        expect(settings[ASHEN_ID]!.systemId).not.toBe('wod-v5');
        expect(selected()).toHaveLength(1);
    });

    it('lets a row ride along with its selected parent', () => {
        openLibrary();
        fireEvent.click(within(mustRow(ashen)).getByLabelText(/Expand|Collapse/));
        fireEvent.click(mustRow(ashen));
        fireEvent.click(mustRow('t:user:user-cult0001'), { ctrlKey: true });
        expect(screen.getByRole('region', { name: '1 item selected' })).toBeTruthy();
        expect(action('move')!.hasAttribute('disabled')).toBe(false);
    });

    it('cannot move rows of different kinds together', () => {
        openLibrary();
        fireEvent.click(within(mustRow(ashen)).getByLabelText(/Expand|Collapse/));
        fireEvent.click(mustRow(mist));
        fireEvent.click(mustRow('t:user:user-cult0001'), { ctrlKey: true });
        expect(action('move')!.hasAttribute('disabled')).toBe(true);
    });

    it('does not select several rows in the export mode', () => {
        openLibrary();
        fireEvent.click(screen.getByRole('button', { name: 'Export' }));
        fireEvent.click(mustRow(ashen));
        fireEvent.click(mustRow(mist), { ctrlKey: true });
        expect(screen.queryByRole('region', { name: /items selected/ })).toBeNull();
    });
});
