// @vitest-environment happy-dom

import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { cleanup, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    ASHEN_ID,
    POWER_COLUMN,
    RELICS_ID,
    resetLibraryStores,
    seedLibrary,
    userCatalog,
} from './helpers/library';
import { details, mustRow, openLibrary, select } from './helpers/libraryDialog';

// The heaviest library render (about 8 s alone): kept in the sequential perf group (spec 024).
vi.setConfig({ testTimeout: 60_000 });

describe('library dialog — a full catalog (spec 015, US1)', () => {
    beforeEach(seedLibrary);
    afterEach(() => {
        cleanup();
        resetLibraryStores();
    });

    const expand = (key: string) => fireEvent.click(within(mustRow(key)).getByLabelText(/Expand/));

    it('renders a 1000-entry catalog', () => {
        useDocumentTypeStore.getState().saveCatalog(
            userCatalog({
                entries: Array.from({ length: 1000 }, (_, i) => ({
                    id: `e-${String(i).padStart(8, '0')}`,
                    name: `Entry ${i}`,
                    values: { [POWER_COLUMN]: i },
                })),
            })
        );
        openLibrary();
        expand(`s:user:${ASHEN_ID}`);
        select(`c:user:${RELICS_ID}`);
        expect(document.querySelectorAll('[data-catalog-entry]')).toHaveLength(1000);
        expect(within(details()).getByRole('button', { name: 'Add entry' })).toHaveProperty(
            'disabled',
            true
        );
        expect(within(details()).getByText('A catalog holds at most 1000 entries.')).toBeTruthy();
    });
});
