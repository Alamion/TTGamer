import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { createDocument } from '../brief';
import { type StoredTemplates, templateStorage } from '../shipped-updates';
import { tool } from '../tools';
import { best, recordTiming, RUNS } from './record';

const KEY = 'wod-v5:v5-vampire-sheet';
const NAME = 'Vampire: the Masquerade 5e — Full sheet';

async function openVampireLibrary(page: Page) {
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    const library = tool(page, 'Library');
    const ruleset = library.getByRole('button', {
        name: 'Expand World of Darkness 5th Edition',
        exact: true,
    });
    if (await ruleset.count()) await ruleset.click();
    await library
        .getByRole('button', { name: 'Expand Vampire: the Masquerade 5e', exact: true })
        .click();
    await library.getByRole('button', { name: 'Expand Character', exact: true }).click();
    return library;
}

test('largest shipped page: review and plain editor, sheet with and without a pending copy', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await createDocument(page, 'wod-v5/vampire');
    const library = await openVampireLibrary(page);
    await library.getByRole('button', { name: `Actions for ${NAME}`, exact: true }).click();
    await page.getByRole('menuitem', { name: 'Open in editor', exact: true }).click();
    const editor = page.getByRole('dialog', { name: NAME, exact: true });
    // Keep the page's shipped identity, but save an edited description as an old, no-base copy.
    await editor.getByRole('textbox', { name: 'Description', exact: true }).fill('My vampire page');
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(editor).toHaveCount(0);
    await expect
        .poll(async () => {
            const raw = await templateStorage(page);
            return raw
                ? (JSON.parse(raw) as StoredTemplates).state.defaultOverrides[KEY]?.description
                : undefined;
        })
        .toBe('My vampire page');
    const persisted = JSON.parse((await templateStorage(page))!) as StoredTemplates;
    delete persisted.state.overrideBases[KEY];
    await templateStorage(page, JSON.stringify(persisted));
    await page.reload();
    await expect(
        page.getByRole('region', { name: 'Shipped page update', exact: true })
    ).toBeVisible();
    const pendingLibrary = await openVampireLibrary(page);
    const plain: number[] = [];
    const review: number[] = [];
    for (let run = 0; run <= RUNS; run++) {
        const tree = pendingLibrary.getByRole('tab', { name: 'Tree', exact: true });
        if (await tree.isVisible()) await tree.click();
        await pendingLibrary
            .getByRole('button', { name: `Actions for ${NAME}`, exact: true })
            .click();
        const open = page.getByRole('menuitem', { name: 'Open in editor', exact: true });
        const started = await page.evaluate(() => performance.now());
        await open.click();
        await editor.getByRole('region', { name: 'Outline', exact: true }).waitFor();
        const elapsed = (await page.evaluate(() => performance.now())) - started;
        if (run > 0) plain.push(elapsed);
        await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(editor).toHaveCount(0);
    }
    await page.getByRole('button', { name: /^Close (Library|the library)$/ }).click();
    for (let run = 0; run <= RUNS; run++) {
        const open = page.getByRole('button', { name: 'Review changes', exact: true });
        const started = await page.evaluate(() => performance.now());
        await open.click();
        await editor.getByRole('region', { name: 'Review shipped changes', exact: true }).waitFor();
        const elapsed = (await page.evaluate(() => performance.now())) - started;
        if (run > 0) review.push(elapsed);
        await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(editor).toHaveCount(0);
    }
    recordTiming({ name: 'largest page plain editor open', value: best(plain), unit: 'ms' });
    recordTiming({ name: 'largest page review open', value: best(review), unit: 'ms' });

    // Same navigation-start → first sheet field measurement as timings/sheet.spec.ts.
    await page.addInitScript(() => {
        const state = window as unknown as { sheetReady?: number };
        new MutationObserver((_, observer) => {
            if (document.querySelector('#character-sheet-root input:not([type="file"])')) {
                state.sheetReady = performance.now();
                observer.disconnect();
            }
        }).observe(document, { childList: true, subtree: true });
    });
    for (const pending of [false, true]) {
        const stored = structuredClone(persisted);
        if (!pending) delete stored.state.defaultOverrides[KEY];
        await templateStorage(page, JSON.stringify(stored));
        const runs: number[] = [];
        for (let run = 0; run <= RUNS; run++) {
            await page.reload({ waitUntil: 'networkidle' });
            const ready = await page.waitForFunction(
                () => (window as unknown as { sheetReady?: number }).sheetReady
            );
            await expect(
                page.getByRole('region', { name: 'Shipped page update', exact: true })
            ).toHaveCount(pending ? 1 : 0);
            if (run > 0) runs.push((await ready.jsonValue()) as number);
        }
        recordTiming({
            name: `sheet open ${pending ? 'with' : 'without'} pending copy`,
            value: best(runs),
            unit: 'ms',
        });
    }
});
