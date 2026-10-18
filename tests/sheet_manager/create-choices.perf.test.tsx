// @vitest-environment happy-dom
import { DocumentCreateDialog } from '@site/src/sheet_manager/components/dialogs/DocumentCreateDialog';
import {
    createChoices,
    filterChoices,
    listChoices,
} from '@site/src/sheet_manager/features/documents/createChoices';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { currentTree, resetUserKinds, seedUserKinds } from './helpers/createDialog';

/** Best of several warm runs, in milliseconds. */
function best(runs: number, work: () => void): number {
    work();
    let fastest = Number.POSITIVE_INFINITY;
    for (let run = 0; run < runs; run += 1) {
        const started = performance.now();
        work();
        fastest = Math.min(fastest, performance.now() - started);
    }
    return fastest;
}

describe('create dialog at 100 kinds (spec 039, SC-002)', () => {
    // Eleven shipped kinds, three core kinds of the user setting, and 86 user types.
    beforeEach(() => seedUserKinds(86));
    afterEach(() => {
        cleanup();
        resetUserKinds();
    });

    it('builds and filters the choices well within a keystroke', () => {
        const tree = currentTree();
        expect(listChoices(createChoices(tree, systemRegistry))).toHaveLength(100);
        const groups = createChoices(tree, systemRegistry);
        expect(best(5, () => createChoices(tree, systemRegistry))).toBeLessThan(100);
        expect(best(5, () => filterChoices(groups, 'ledger 4'))).toBeLessThan(100);
    });

    it('opens and reacts to each keystroke within 100 ms', () => {
        const opening = best(3, () => {
            cleanup();
            render(createElement(DocumentCreateDialog, { open: true, onOpenChange: () => {} }));
        });
        const input = () => screen.getByRole('combobox', { name: 'Search kinds' });
        let toggle = false;
        const keystroke = best(5, () => {
            toggle = !toggle;
            act(() => {
                fireEvent.change(input(), { target: { value: toggle ? 'ledg' : 'ledge' } });
            });
        });
        expect(opening).toBeLessThan(100);
        expect(keystroke).toBeLessThan(100);
    });
});
