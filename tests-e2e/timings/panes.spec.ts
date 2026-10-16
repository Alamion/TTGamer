import { expect, test } from '@playwright/test';

import { createDocument } from '../brief';
import { documentsTool } from '../tools';
import { best, recordTiming, RUNS } from './record';

const FILLER = 3000;
const KEY = 'universal-character-storage';

/** Reads or writes the page's own database: the one localForage made when the page started. */
async function storedValue(page: import('@playwright/test').Page, write?: string) {
    return page.evaluate(
        async ({ key, text }) =>
            new Promise<string | null>((resolve, reject) => {
                const open = indexedDB.open('localforage');
                open.onerror = () => reject(open.error);
                open.onsuccess = () => {
                    const database = open.result;
                    const transaction = database.transaction(
                        'keyvaluepairs',
                        text === undefined ? 'readonly' : 'readwrite'
                    );
                    const store = transaction.objectStore('keyvaluepairs');
                    const request = text === undefined ? store.get(key) : store.put(text, key);
                    transaction.oncomplete = () => {
                        database.close();
                        resolve(text === undefined ? (request.result as string | null) : null);
                    };
                    transaction.onerror = () => reject(transaction.error);
                };
            }),
        { key: KEY, text: write }
    );
}

test('opening a second document beside the first with 3,000 documents in the collection', async ({
    page,
}) => {
    for (const name of ['Real A', 'Real B']) {
        await createDocument(page, 'wod-v5/hunter');
        const field = page.getByRole('textbox', { name: 'Name', exact: true });
        await field.fill(name);
        await field.blur();
    }
    await page.reload({ waitUntil: 'networkidle' });

    const stored = JSON.parse((await storedValue(page))!) as {
        state: { entries: Array<Record<string, unknown>>; currentDocumentId: string };
    };
    const stamp = '2026-10-01T10:00:00.000Z';
    const real = stored.state.entries.slice(0, 2);
    stored.state.entries = [
        ...real,
        ...Array.from({ length: FILLER }, (_, index) => ({
            id: `filler${index}`,
            name: `Doc ${String(index).padStart(4, '0')}`,
            kind: 'character',
            systemId: 'wod-v5',
            definitionId: 'hunter',
            parentId: null,
            rank: index + 10,
            createdAt: stamp,
            changedAt: stamp,
            updatedAt: 1,
        })),
    ];
    await storedValue(page, JSON.stringify(stored));

    const times: number[] = [];
    for (let run = 0; run <= RUNS; run++) {
        await page.evaluate(() => localStorage.removeItem('ttgamer:panes:v2'));
        await page.reload({ waitUntil: 'networkidle' });
        // The first document is shown before a second one opens beside it.
        const shown = page.getByRole('textbox', { name: 'Name', exact: true });
        await expect(shown).toHaveValue(/^Real [AB]$/);
        const other = (await shown.inputValue()) === 'Real A' ? 'Real B' : 'Real A';
        await page.getByRole('button', { name: 'Manage', exact: true }).click();
        const window = documentsTool(page);
        await window.getByRole('searchbox', { name: 'Search names' }).fill(other);
        await window.getByRole('button', { name: `Actions for ${other}` }).click();
        const started = Date.now();
        await page.getByRole('menuitem', { name: 'Open beside' }).click();
        await expect(page.locator('section[data-pane]')).toHaveCount(2);
        if (run > 0) times.push(Date.now() - started);
    }
    recordTiming({
        name: 'panes: open a second document beside (3,000)',
        value: best(times),
        unit: 'ms',
        budget: 200,
    });

    // SC-006: the longest frame while a divider and a window are dragged.
    const divider = page.getByRole('separator').last();
    const bar = (await divider.boundingBox())!;
    recordTiming({
        name: 'panes: longest frame of a divider drag (3,000)',
        value: await longestFrame(page, { x: bar.x + 3, y: bar.y + 200 }, { x: -120, y: 0 }),
        unit: 'ms',
        budget: 50,
    });
    const documentsTab = page
        .locator('[data-group-strip]')
        .getByRole('tab', { name: 'Documents', exact: true });
    await documentsTab.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Float' }).click();
    const title = (await page.locator('[data-window-titlebar]').first().boundingBox())!;
    recordTiming({
        name: 'panes: longest frame of a window drag (3,000)',
        value: await longestFrame(
            page,
            { x: title.x + 60, y: title.y + title.height / 2 },
            { x: 200, y: 120 }
        ),
        unit: 'ms',
        budget: 50,
    });

    // SC-006: moving a tab into the other group, then showing the hidden one.
    const firstTab = page.locator('[data-group-strip]').first().getByRole('tab').first();
    const moved = (await firstTab.textContent())!;
    await firstTab.click({ button: 'right' });
    const started = Date.now();
    await page.getByRole('menuitem', { name: 'Move to next group' }).click();
    await expect(page.locator('section[data-pane]')).toHaveCount(1);
    recordTiming({
        name: 'panes: move a tab to the next group (3,000)',
        value: Date.now() - started,
        unit: 'ms',
        budget: 200,
    });
    const shows: number[] = [];
    const names = await page.getByRole('tab').allTextContents();
    const other = names.find((name) => name !== moved && /^Real/.test(name))!;
    for (let run = 0; run <= RUNS; run++) {
        const name = run % 2 === 0 ? moved : other;
        const begin = Date.now();
        await page.getByRole('tab', { name, exact: true }).click();
        await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
        if (run > 0) shows.push(Date.now() - begin);
    }
    recordTiming({
        name: 'panes: show a hidden tab (3,000)',
        value: best(shows),
        unit: 'ms',
        budget: 200,
    });
});

/** Drags with the mouse from `from` by `by` in 20 steps; returns the longest frame meanwhile. */
async function longestFrame(
    page: import('@playwright/test').Page,
    from: { x: number; y: number },
    by: { x: number; y: number }
): Promise<number> {
    await page.evaluate(() => {
        const frames: number[] = [];
        const state = window as unknown as { frames_: number[]; framing: boolean };
        state.frames_ = frames;
        state.framing = true;
        let last = performance.now();
        const tick = (now: number) => {
            frames.push(now - last);
            last = now;
            if (state.framing) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let step = 1; step <= 20; step++) {
        await page.mouse.move(from.x + (by.x * step) / 20, from.y + (by.y * step) / 20);
    }
    await page.mouse.up();
    return page.evaluate(() => {
        const state = window as unknown as { frames_: number[]; framing: boolean };
        state.framing = false;
        // The first frame waited for the drag to start.
        return Math.max(...state.frames_.slice(1));
    });
}
