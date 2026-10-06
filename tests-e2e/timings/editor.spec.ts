import { expect, test } from '@playwright/test';

import { openFullSheetEditor, rootOutlineIds } from '../editor';
import { best, recordTiming, RUNS } from './record';

/** Template editor budgets (specs 021 and 022): 100 ms per edit and per move preview. */
const BUDGET_MS = 100;
/** The editor's User Timing mark at the end of a drag's dwell (`PREVIEW_MARK`). */
const PREVIEW_MARK = 'template-editor:preview';

test('an edit on the full shipped sheet', async ({ page }) => {
    await openFullSheetEditor(page);
    const [first] = await rootOutlineIds(page);
    await page
        .locator(`[data-outline-row="${first}"] button:not([data-drag-handle])`)
        .first()
        .click();
    const title = page
        .locator(`[data-settings-for="${first}"]`)
        .getByLabel('Title', { exact: true });
    await expect(title).toBeVisible();

    const runs: number[] = [];
    for (let run = 0; run <= RUNS; run++) {
        // From the input event to the frame after React has committed the change.
        const ms = await title.evaluate(
            (input: HTMLInputElement, value) =>
                new Promise<number>((resolve) => {
                    const setValue = Object.getOwnPropertyDescriptor(
                        HTMLInputElement.prototype,
                        'value'
                    )!.set!;
                    const started = performance.now();
                    setValue.call(input, value);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    requestAnimationFrame(() =>
                        setTimeout(() => resolve(performance.now() - started), 0)
                    );
                }),
            `Base ${'x'.repeat(run + 1)}`
        );
        if (run > 0) runs.push(ms);
    }
    recordTiming({ name: 'editor edit', value: best(runs), unit: 'ms', budget: BUDGET_MS });
});

test('a move preview on the full shipped sheet', async ({ page }) => {
    await openFullSheetEditor(page);
    // The second root element, moved into the first: its grip shows once it is selected.
    const [target, moved] = await rootOutlineIds(page);
    await page
        .locator(`[data-outline-row="${moved}"] button:not([data-drag-handle])`)
        .first()
        .click();
    const grip = page
        .locator(`[data-editor-frame][data-node-id="${moved}"] [data-drag-handle]`)
        .first();

    // The editor marks the end of the dwell; the preview is ready at the frame after it.
    await page.evaluate((mark) => {
        const state = window as unknown as { previews: number[] };
        state.previews = [];
        new PerformanceObserver((list) => {
            for (const entry of list.getEntriesByName(mark)) {
                requestAnimationFrame(() =>
                    setTimeout(() => state.previews.push(performance.now() - entry.startTime), 0)
                );
            }
        }).observe({ type: 'mark' });
    }, PREVIEW_MARK);

    const runs: number[] = [];
    for (let run = 0; run <= RUNS; run++) {
        await grip.scrollIntoViewIfNeeded();
        const from = (await grip.boundingBox())!;
        await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
        await page.mouse.down();
        await page.mouse.move(from.x + 30, from.y + 40, { steps: 5 });
        const to = (await page.locator(`[data-insert-slot^="${target}:"]`).last().boundingBox())!;
        await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 5 });
        await expect(page.locator('[data-previewing]')).not.toHaveCount(0);
        const ms = await page.evaluate(async () => {
            const state = window as unknown as { previews: number[] };
            // The frame after the last mark: let it land before reading.
            await new Promise((resolve) => setTimeout(resolve, 500));
            return state.previews.splice(0).at(-1)!;
        });
        await page.keyboard.press('Escape');
        await page.mouse.up();
        await expect(page.locator('[data-previewing]')).toHaveCount(0);
        if (run > 0) runs.push(ms);
    }
    recordTiming({ name: 'move preview', value: best(runs), unit: 'ms', budget: BUDGET_MS });
});
