// @vitest-environment happy-dom

import { ImportConflictDialog } from '@site/src/sheet_manager/components/dialogs/ImportConflictDialog';
import { ImportSummaryDialog } from '@site/src/sheet_manager/components/dialogs/ImportSummaryDialog';
import type { BatchSummary } from '@site/src/sheet_manager/features/sheet/shell/importBatch';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setTestLocale } from '../stubs/testLocale';

afterEach(() => {
    cleanup();
    setTestLocale('en');
});

const summary: BatchSummary = {
    imported: 1,
    skipped: 0,
    rejected: 1,
    repaired: 1,
    outcomes: [
        {
            file: 'old.json',
            status: 'imported',
            title: 'Old',
            repairs: [{ kind: 'armor-name', path: 'armor.0.name' }],
        },
        {
            file: 'broken.json',
            status: 'rejected',
            repairs: [],
            reason: { code: 'not-json' },
        },
    ],
};

describe('import summary dialog', () => {
    it('names the repaired file, the repair, and the rejected file with its reason', () => {
        const onClose = vi.fn();
        render(createElement(ImportSummaryDialog, { summary, onClose }));

        const dialog = screen.getByRole('dialog', { name: 'Import finished' });
        expect(dialog.textContent).toContain('old.json');
        expect(dialog.textContent).toContain('An armor item had no name');
        expect(screen.getByRole('alert').textContent).toContain('broken.json');
        expect(screen.getByRole('alert').textContent).toContain('not valid JSON');

        fireEvent.keyDown(dialog, { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });

    it('renders nothing without a summary', () => {
        render(createElement(ImportSummaryDialog, { summary: null, onClose: () => {} }));
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});

describe('import conflict dialog', () => {
    it('offers to apply the choice to the rest only during a batch', () => {
        // The conflict dialog renders ids, so its text shows in a non-English test locale.
        setTestLocale('ru');
        const onResolve = vi.fn();
        const { rerender } = render(
            createElement(ImportConflictDialog, { open: true, onResolve, offerApplyToRest: false })
        );
        expect(screen.queryByRole('checkbox')).toBeNull();

        rerender(
            createElement(ImportConflictDialog, { open: true, onResolve, offerApplyToRest: true })
        );
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: 'Заменить' }));
        expect(onResolve).toHaveBeenCalledWith('replace', true);

        fireEvent.click(screen.getByRole('button', { name: 'Копировать' }));
        expect(onResolve).toHaveBeenLastCalledWith('duplicate', false);
    });
});
