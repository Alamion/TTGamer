// @vitest-environment jsdom
import { TrackerParity } from '@site/src/sheet_manager/features/docs/ElementStorybook';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/**
 * Spec 018, US7: the fodder group's built-in health tracker and its rebuild from the Tracker
 * field alone show the same levels, marks, totals, and "out" at every length, and fold marks the
 * same way when shortened.
 */

vi.setConfig({ testTimeout: 30_000 });

const BUILT_IN = 'Members (built-in)';
const OWN = 'Members (own tracker)';

interface Reading {
    levels: string[];
    marks: string[];
    totals: string[];
    out: boolean[];
}

/** Box names read "Member A — Hurt: Bashing" (built-in) or "Hurt (A): Bashing" (own). */
function normalizeBox(name: string): string {
    const builtIn = /^Member (\w) — (.+): (.+)$/.exec(name);
    if (builtIn) return `${builtIn[1]}|${builtIn[2]}|${builtIn[3]}`;
    const own = /^(.+) \((\w)\): (.+)$/.exec(name);
    return own ? `${own[2]}|${own[1]}|${own[3]}` : name;
}

function read(label: string): Reading {
    const table = screen.getByRole('table', { name: label });
    const rows = within(table).getAllByRole('row');
    const total = table.querySelector('[data-tracker-total]')!;
    return {
        levels: within(table)
            .getAllByRole('rowheader')
            .slice(0, -1)
            .map((header) => header.textContent ?? ''),
        marks: within(table)
            .getAllByRole('button')
            .map((button) => button.getAttribute('aria-label') ?? '')
            .filter((name) => name.includes(': '))
            .map(normalizeBox)
            .sort(),
        totals: within(total as HTMLElement)
            .getAllByRole('cell')
            .map((cell) => cell.textContent ?? '')
            .filter((text) => text !== '')
            .map((text) => (/^-?\d+$|^—$/.test(text) ? text : 'out')),
        out: within(rows[0]!)
            .getAllByRole('columnheader')
            .slice(2)
            .map((header) => header.querySelector('.line-through') !== null),
    };
}

function shorten(label: string) {
    fireEvent.click(screen.getByRole('button', { name: `Shorten ${label}` }));
    const dialog = screen.queryByRole('dialog');
    if (dialog) fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));
}

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
});

afterEach(() => {
    cleanup();
    takeSheetIssues();
});

describe('fodder-group parity (spec 018, US7)', () => {
    it('shows the same levels, marks, totals, and out at every length', () => {
        render(createElement(TrackerParity));
        const lengths: number[] = [];
        for (let step = 0; step < 3; step += 1) {
            const builtIn = read(BUILT_IN);
            const own = read(OWN);
            expect(own).toEqual(builtIn);
            lengths.push(builtIn.levels.length);
            if (step < 2) {
                shorten(BUILT_IN);
                shorten(OWN);
            }
        }
        expect(lengths).toEqual([7, 5, 3]);
    });

    it('marks the same way on both after folding', () => {
        render(createElement(TrackerParity));
        shorten(BUILT_IN);
        shorten(OWN);
        // A click on the same box of each tracker steps it to the same next mark.
        fireEvent.click(screen.getByRole('button', { name: 'Member A — Wounded: empty' }));
        fireEvent.click(screen.getByRole('button', { name: 'Wounded (A): empty' }));
        expect(read(OWN)).toEqual(read(BUILT_IN));
        fireEvent.click(screen.getByRole('button', { name: `Extend ${BUILT_IN}` }));
        fireEvent.click(screen.getByRole('button', { name: `Extend ${OWN}` }));
        expect(read(OWN)).toEqual(read(BUILT_IN));
    });
});
