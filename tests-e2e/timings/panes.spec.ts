import { expect, test } from '@playwright/test';

import { createDocument } from '../brief';
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
        await page.evaluate(() => localStorage.removeItem('ttgamer:panes:v1'));
        await page.reload({ waitUntil: 'networkidle' });
        // The first document is shown before a second one opens beside it.
        const shown = page.getByRole('textbox', { name: 'Name', exact: true });
        await expect(shown).toHaveValue(/^Real [AB]$/);
        const other = (await shown.inputValue()) === 'Real A' ? 'Real B' : 'Real A';
        await page.getByRole('button', { name: 'Manage', exact: true }).click();
        const window = page.getByRole('dialog', { name: 'Documents', exact: true });
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
});
