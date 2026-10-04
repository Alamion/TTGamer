// @vitest-environment jsdom

import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    ASHEN_ID,
    POWER_COLUMN,
    RELICS_ID,
    resetLibraryStores,
    seedLibrary,
} from './helpers/library';
import { action, details, lastDialog, mustRow, openLibrary, select } from './helpers/libraryDialog';

// The editor opens from the library; full renders are slow under a loaded run.
vi.setConfig({ testTimeout: 30_000 });

describe('library dialog — catalogs (spec 015, US1)', () => {
    beforeEach(seedLibrary);
    afterEach(() => {
        cleanup();
        resetLibraryStores();
    });

    const relics = () => useDocumentTypeStore.getState().catalogs[RELICS_ID]!;
    const expand = (key: string) => fireEvent.click(within(mustRow(key)).getByLabelText(/Expand/));

    it('creates catalogs on a setting and on a ruleset', () => {
        openLibrary();
        select(`s:user:${ASHEN_ID}`);
        fireEvent.click(action('newCatalog')!);
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Omens' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        const omens = Object.values(useDocumentTypeStore.getState().catalogs).find(
            ({ name }) => name === 'Omens'
        )!;
        expect(omens).toMatchObject({ owner: { settingId: ASHEN_ID }, columns: [], entries: [] });
        expect(mustRow(`c:user:${omens.id}`).getAttribute('aria-selected')).toBe('true');
        expect(within(details()).getByText(/No entries yet/)).toBeTruthy();

        select('r:wod-v5');
        fireEvent.click(action('newCatalog')!);
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Vehicles' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        const vehicles = Object.values(useDocumentTypeStore.getState().catalogs).find(
            ({ name }) => name === 'Vehicles'
        )!;
        expect(vehicles.owner).toEqual({ rulesetId: 'wod-v5' });
    });

    it('edits columns and entries, pastes rows, and confirms a lossy retype', () => {
        openLibrary();
        expand(`s:user:${ASHEN_ID}`);
        select(`c:user:${RELICS_ID}`);
        const table = within(details()).getByRole('table', { name: 'Entries of Relics' });
        expect(within(details()).getByText('Used by 0 templates.')).toBeTruthy();

        fireEvent.click(within(details()).getByRole('button', { name: 'Add column' }));
        expect(relics().columns.map(({ name }) => name)).toEqual(['Power', 'Cursed', 'Column 3']);
        fireEvent.click(within(details()).getByRole('button', { name: 'Add entry' }));
        expect(relics().entries.at(-1)!.name).toBe('New entry');
        fireEvent.change(within(table).getByLabelText('Name of entry 3'), {
            target: { value: 'Skull Cup' },
        });
        expect(relics().entries.at(-1)!.name).toBe('Skull Cup');
        fireEvent.change(within(table).getByLabelText('Power of Skull Cup'), {
            target: { value: '5' },
        });
        expect(relics().entries.at(-1)!.values).toMatchObject({ [POWER_COLUMN]: 5 });

        fireEvent.click(within(details()).getByRole('button', { name: 'Paste rows' }));
        fireEvent.change(within(details()).getByLabelText('Rows to add'), {
            target: { value: 'Horn\t3\tyes\nBell\t1\nBroken\tx' },
        });
        expect(within(details()).getByText('Line 3: a value does not fit its column')).toBeTruthy();
        fireEvent.click(within(details()).getByRole('button', { name: 'Add 2 entries' }));
        expect(relics().entries.map(({ name }) => name)).toEqual([
            'Bone Flute',
            'Black Mirror',
            'Skull Cup',
            'Horn',
            'Bell',
        ]);

        // Number → toggle converts every value; text → number empties words, after a warning.
        fireEvent.change(within(table).getByLabelText('Type of Power'), {
            target: { value: 'toggle' },
        });
        expect(relics().columns[0]!.type).toBe('toggle');
        fireEvent.change(within(table).getByLabelText('Column 3 of Skull Cup'), {
            target: { value: 'strong' },
        });
        fireEvent.change(within(table).getByLabelText('Type of Column 3'), {
            target: { value: 'number' },
        });
        const dialog = lastDialog();
        expect(
            within(dialog).getByText('1 value does not fit the new type and will be emptied.')
        ).toBeTruthy();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
        expect(relics().columns[2]!.type).toBe('number');
        expect(relics().entries[2]!.values[relics().columns[2]!.id]).toBeUndefined();
    });

    it('shows shipped catalogs read-only', () => {
        openLibrary();
        expand('s:system:star-wars-wod');
        select('c:star-wars-wod:melee-weapons');
        expect(within(details()).getByText('Shipped catalogs cannot be changed.')).toBeTruthy();
        expect(within(details()).queryByRole('button', { name: 'Add entry' })).toBeNull();
        expect(action('delete')).toBeNull();
    });
});
