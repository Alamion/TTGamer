// @vitest-environment jsdom

import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { resetEditorStores } from './helpers/editor';

/** SC-002: 100 ms per edit on a mid-range laptop; jsdom runs several times slower. */
const BROWSER_BUDGET_MS = 100;
const JSDOM_FACTOR = 3;
const KEYSTROKES = 20;

describe('template editor responsiveness (SC-002)', () => {
    afterEach(cleanup);

    it('reflects keystrokes and column changes on the full sheet within budget', () => {
        resetEditorStores();
        const template = systemRegistry
            .getSystem('star-wars-wod')!
            .defaultTemplates!.find(({ id }) => id === 'full-sheet')!;
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template },
                onClose: () => {},
            })
        );
        const row = document.querySelector('[data-outline-row][data-node-type="section"]')!;
        const sectionId = row.getAttribute('data-outline-row')!;
        fireEvent.click([...row.querySelectorAll('button')].find((b) => !b.draggable)!);
        const panel = document.querySelector(`[data-settings-for="${sectionId}"]`) as HTMLElement;
        const title = within(panel).getByLabelText('Section title');

        const timings: number[] = [];
        for (let stroke = 1; stroke <= KEYSTROKES; stroke++) {
            const started = performance.now();
            fireEvent.change(title, { target: { value: `Title ${'x'.repeat(stroke)}` } });
            timings.push(performance.now() - started);
        }
        const started = performance.now();
        fireEvent.change(within(panel).getByLabelText('Columns'), { target: { value: '3' } });
        timings.push(performance.now() - started);

        const sorted = [...timings].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)]!;
        console.info(
            `editor edit timings: median ${median.toFixed(1)} ms, max ${sorted.at(-1)!.toFixed(1)} ms`
        );
        expect(median).toBeLessThan(BROWSER_BUDGET_MS * JSDOM_FACTOR);
    }, 120_000);
});
