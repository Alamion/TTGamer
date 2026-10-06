// @vitest-environment jsdom

import { PREVIEW_DWELL_MS } from '@site/src/sheet_manager/features/template-editor/components/useEditorDrag';
import { TemplateEditorDialog } from '@site/src/sheet_manager/features/template-editor/TemplateEditorDialog';
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
            // A one-off cost (GC, a first render of a branch) lands in one phase or another:
            // the first run is a warm-up, and each cost is the best of the four after it.
            const committed: number[] = [];
            const previewed: number[] = [];
            const released: number[] = [];
            act(() => {
                vi.advanceTimersByTime(1_000);
            });
            for (let run = 0; run < 5; run++) {
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
                Math.min(...runs.slice(1))
            ) as [number, number, number];
            console.info(
                `editor move: commit ${commit.toFixed(1)} ms, preview ${preview.toFixed(1)} ms, release after preview ${release.toFixed(1)} ms`
            );
            // Warm, a preview costs about 2.3× the committed move (it renders the moved element
            // and the slot it leaves); the bound leaves room for jsdom noise. The browser budget
            // (SC-003) is checked on the dev server (quickstart §4). Calibrated in spec 024:
            // the earlier 2× held only while cold first-render costs inflated the commit.
            expect(preview).toBeLessThan(commit * 3);
            expect(release).toBeLessThan(commit * 2);
        } finally {
            vi.useRealTimers();
        }
    }, 120_000);

    it('copies, pastes, removes, and changes a shared setting of the whole sheet within budget (spec 023, SC-005)', () => {
        resetEditorStores();
        const template = systemRegistry
            .getSystem('star-wars-wod')!
            .defaultTemplates!.find(({ id }) => id === 'full-sheet')!;
        const opened = performance.now();
        const view = render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template },
                onClose: () => {},
            })
        );
        const open = performance.now() - opened;
        const rootRows = () => [
            ...document.querySelectorAll('[data-children-of="root"] > li > [data-outline-row]'),
        ];
        const rowButton = (row: Element) =>
            [...row.querySelectorAll('button')].find((b) => !b.hasAttribute('data-drag-handle'))!;
        // The first and last root element with Shift: every element, once normalized.
        fireEvent.click(rowButton(rootRows()[0]!));
        fireEvent.click(rowButton(rootRows().at(-1)!), { shiftKey: true });
        const timed = (run: () => void) => {
            const started = performance.now();
            run();
            return performance.now() - started;
        };
        const clipboard = (type: string, text?: string) => {
            const store = new Map<string, string>(text ? [['text/plain', text]] : []);
            const event = new Event(type, { bubbles: true, cancelable: true });
            Object.defineProperty(event, 'clipboardData', {
                value: {
                    getData: (format: string) => store.get(format) ?? '',
                    setData: (format: string, value: string) => store.set(format, value),
                },
            });
            act(() => {
                rootRows()[0]!.dispatchEvent(event);
            });
            return store.get('text/plain');
        };
        let copied: string | undefined;
        const timings: Record<string, number> = {};
        timings.copy = timed(() => {
            copied = clipboard('copy');
        });
        const folded = document.querySelector<HTMLInputElement>(
            '[data-settings-for="multiple"] [data-setting="defaultCollapsed"]'
        )!;
        timings.shared = timed(() => fireEvent.click(folded));
        timings.remove = timed(() =>
            fireEvent.keyDown(rootRows()[0]!, { code: 'Delete', key: 'Delete' })
        );
        view.unmount();
        resetEditorStores();
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'empty' },
                onClose: () => {},
            })
        );
        const before = rootRows().length;
        timings.paste = timed(() => clipboard('paste', copied));
        expect(rootRows().length).toBeGreaterThan(before);
        console.info(
            `editor selection actions: ${Object.entries(timings)
                .map(([name, ms]) => `${name} ${ms.toFixed(0)} ms`)
                .join(', ')} (opening the sheet ${open.toFixed(0)} ms)`
        );
        const { paste, ...rest } = timings;
        for (const ms of Object.values(rest)) {
            expect(ms).toBeLessThan(1000 * JSDOM_FACTOR);
        }
        // Pasting the whole sheet onto a blank page is a first render of it: measured against
        // opening the sheet in the same run, since a loaded test runner slows both alike.
        expect(paste).toBeLessThan(open * 2);
    }, 120_000);
});
