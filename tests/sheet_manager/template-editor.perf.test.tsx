// @vitest-environment jsdom

import { PREVIEW_DWELL_MS } from '@site/src/sheet_manager/components/dialogs/template-editor/useEditorDrag';
import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { dragOver, releaseDrag, resetEditorStores, startDrag } from './helpers/editor';

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
        fireEvent.click(
            [...row.querySelectorAll('button')].find((b) => !b.hasAttribute('data-drag-handle'))!
        );
        const panel = document.querySelector(`[data-settings-for="${sectionId}"]`) as HTMLElement;
        const title = within(panel).getByLabelText('Title');

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

    it('renders a previewed move on the full sheet within budget (SC-003)', () => {
        // Real performance.now: only the dwell timer and the clock are faked.
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
        try {
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
            const frames = document.querySelectorAll('[data-editor-frame][data-node-id]');
            const moved = frames[1]!.getAttribute('data-node-id')!;
            const lastSlot = () => {
                const slots = document.querySelectorAll('[data-insert-slot]');
                return slots[slots.length - 1]!;
            };

            // Undo, then let the schema check that the change scheduled run outside the timings.
            const undo = () => {
                fireEvent.click(document.querySelector('button[aria-label="Undo"]')!);
                act(() => {
                    vi.advanceTimersByTime(1_000);
                });
            };
            // Single runs are noisy under a loaded test run: each cost is the best of two.
            const committed: number[] = [];
            const previewed: number[] = [];
            const released: number[] = [];
            act(() => {
                vi.advanceTimersByTime(1_000);
            });
            for (let run = 0; run < 2; run++) {
                // The same move committed at once, for reference: shifting root elements
                // re-renders what follows them (accent colours alternate by position).
                startDrag(moved);
                dragOver(lastSlot());
                let started = performance.now();
                releaseDrag();
                committed.push(performance.now() - started);
                undo();

                startDrag(moved);
                dragOver(lastSlot());
                started = performance.now();
                act(() => {
                    vi.advanceTimersByTime(PREVIEW_DWELL_MS);
                });
                previewed.push(performance.now() - started);
                expect(document.querySelector('[data-previewing]')).not.toBeNull();
                started = performance.now();
                releaseDrag();
                released.push(performance.now() - started);
                undo();
            }
            const [commit, preview, release] = [committed, previewed, released].map((runs) =>
                Math.min(...runs)
            ) as [number, number, number];
            console.info(
                `editor move: commit ${commit.toFixed(1)} ms, preview ${preview.toFixed(1)} ms, release after preview ${release.toFixed(1)} ms`
            );
            // A preview costs what the move itself costs, measured under the same load; the
            // browser budget (SC-003) is checked on the dev server (quickstart §4).
            // jsdom timings of one move vary by ±25 %, so the bound is generous; a preview that
            // re-rendered every frame (a changing drag context) cost over twice the move.
            expect(preview).toBeLessThan(commit * 2);
            expect(release).toBeLessThan(commit * 2);
        } finally {
            vi.useRealTimers();
        }
    }, 120_000);
});
