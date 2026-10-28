import { expect, test } from '@playwright/test';

import { documentsTool } from '../tools';
import { best, recordTiming, RUNS } from './record';

const DOCUMENTS = 3000;
const PER_LEAF = 20;

/**
 * The slim stored state of 3,000 documents in nested folders (spec 032, D2): no records. Every
 * other document is a note (spec 043, SC-004), so the window is measured with both kinds.
 */
function slimState() {
    const stamp = '2026-10-01T10:00:00.000Z';
    const folders: unknown[] = [];
    const leaves: string[] = [];
    const campaigns = Math.ceil(DOCUMENTS / PER_LEAF / 25);
    for (let campaign = 0; campaign < campaigns; campaign++) {
        const folder = (id: string, parentId: string | null, rank: number) =>
            folders.push({
                id,
                name: `Folder ${id}`,
                parentId,
                rank,
                createdAt: stamp,
                changedAt: stamp,
                updatedAt: 1,
            });
        folder(`c${campaign}`, null, campaign);
        for (let session = 0; session < 5; session++) {
            folder(`c${campaign}s${session}`, `c${campaign}`, session);
            for (let group = 0; group < 5; group++) {
                folder(`c${campaign}s${session}g${group}`, `c${campaign}s${session}`, group);
                leaves.push(`c${campaign}s${session}g${group}`);
            }
        }
    }
    const entries = Array.from({ length: DOCUMENTS }, (_, index) => ({
        id: `d${index}`,
        name: `Doc ${String(index).padStart(4, '0')}`,
        ...(index % 2 === 0
            ? { kind: 'character', systemId: 'wod-v5', definitionId: 'hunter' }
            : { kind: 'note', systemId: 'general', definitionId: 'note' }),
        parentId: leaves[index % leaves.length],
        rank: Math.floor(index / leaves.length),
        createdAt: stamp,
        changedAt: stamp,
        updatedAt: 1,
    }));
    return {
        folders,
        entries,
        value: JSON.stringify({
            state: {
                entries,
                folders,
                pendingPurge: [],
                currentDocumentId: null,
                recoveryEntries: [],
            },
            version: 5,
        }),
    };
}

test('opening, scrolling, and searching 3,000 documents in nested folders', async ({ page }) => {
    const { folders, value } = slimState();
    await page.goto('/universal_sheet');
    await page.waitForLoadState('networkidle');
    // The page's own storage: the database localForage made when the page started.
    await page.evaluate(async (stored) => {
        await new Promise<void>((resolve, reject) => {
            const open = indexedDB.open('localforage');
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
                const database = open.result;
                const transaction = database.transaction('keyvaluepairs', 'readwrite');
                transaction.objectStore('keyvaluepairs').put(stored, 'universal-character-storage');
                transaction.oncomplete = () => {
                    database.close();
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            };
        });
    }, value);
    await page.evaluate(
        (open) => localStorage.setItem('documents-window-open-folders', JSON.stringify(open)),
        folders.map((folder) => `folder:${(folder as { id: string }).id}`)
    );

    const opens: number[] = [];
    const searches: number[] = [];
    let frames = 0;
    for (let run = 0; run <= RUNS; run++) {
        await page.reload({ waitUntil: 'networkidle' });
        const manage = page.getByRole('button', { name: 'Manage', exact: true });
        await expect(manage).toBeEnabled();
        const started = Date.now();
        await manage.click();
        const window = documentsTool(page);
        await expect(window.getByRole('treeitem').first()).toBeVisible();
        if (run > 0) opens.push(Date.now() - started);

        if (run === 1) {
            // Frames per second while the tree scrolls from top to bottom.
            frames = await page.evaluate(async () => {
                const tree = document.querySelector('[role="tree"]')!;
                const scroller = tree.parentElement!;
                const total = scroller.scrollHeight - scroller.clientHeight;
                return await new Promise<number>((resolve) => {
                    const begin = performance.now();
                    let count = 0;
                    const step = (now: number) => {
                        count += 1;
                        const progress = Math.min(1, (now - begin) / 1500);
                        scroller.scrollTop = total * progress;
                        if (progress < 1) requestAnimationFrame(step);
                        else resolve(count / ((now - begin) / 1000));
                    };
                    requestAnimationFrame(step);
                });
            });
        }

        const box = window.getByRole('searchbox', { name: 'Search names' });
        const typed = Date.now();
        await box.fill('Doc 2999');
        await expect(window.getByRole('treeitem', { name: /Doc 2999/ })).toBeVisible();
        if (run > 0) searches.push(Date.now() - typed);
    }
    recordTiming({
        name: 'documents window: open (3,000)',
        value: best(opens),
        unit: 'ms',
        budget: 500,
    });
    recordTiming({
        name: 'documents window: search (3,000)',
        value: best(searches),
        unit: 'ms',
        budget: 200,
    });
    recordTiming({
        name: 'documents window: scroll frames per second',
        value: frames,
        unit: 'fps',
    });
});

/** Ten links per document, and every thirtieth document links to the opened note (spec 044). */
function linkRecords(): Array<[string, unknown]> {
    return Array.from({ length: DOCUMENTS }, (_, index) => {
        const links = Array.from({ length: 10 }, (_, link) => {
            const target = index % 30 === 0 && link === 0 ? 1 : (index * 7 + link) % DOCUMENTS;
            const reference = `Doc ${String(target).padStart(4, '0')}`;
            return {
                reference,
                embed: false,
                key: 'body',
                line: link,
                context: `[[${reference}]]`,
            };
        });
        return [`d${index}`, { v: 1, links }];
    });
}

test('"Mentioned in" over 3,000 documents with 10 links each', async ({ page }) => {
    const { value } = slimState();
    const state = JSON.parse(value) as { state: { currentDocumentId: string | null } };
    state.state.currentDocumentId = 'd1';
    const note = {
        id: 'd1',
        kind: 'note',
        systemId: 'general',
        definitionId: 'note',
        schemaVersion: 1,
        metadata: { title: 'Doc 0001', tags: [] },
        templateValues: { body: { text: 'The opened note.' } },
        data: { name: 'Doc 0001' },
    };
    await page.goto('/universal_sheet');
    await page.waitForLoadState('networkidle');
    await page.evaluate(
        async ({ stored, record, links }) => {
            const put = (name: string, store: string, rows: Array<[string, unknown]>) =>
                new Promise<void>((resolve, reject) => {
                    const open = indexedDB.open(name);
                    open.onupgradeneeded = () => open.result.createObjectStore(store);
                    open.onerror = () => reject(open.error);
                    open.onsuccess = () => {
                        const database = open.result;
                        const transaction = database.transaction(store, 'readwrite');
                        for (const [key, row] of rows) transaction.objectStore(store).put(row, key);
                        transaction.oncomplete = () => {
                            database.close();
                            resolve();
                        };
                        transaction.onerror = () => reject(transaction.error);
                    };
                });
            await put('localforage', 'keyvaluepairs', [
                ['universal-character-storage', stored],
                ['doc:d1', record],
            ]);
            await put('ttgamer-links', 'links', links);
        },
        { stored: JSON.stringify(state), record: JSON.stringify(note), links: linkRecords() }
    );

    const shown: number[] = [];
    for (let run = 0; run <= RUNS; run++) {
        await page.reload({ waitUntil: 'domcontentloaded' });
        const name = page.getByRole('textbox', { name: 'Name' });
        await expect(name).toHaveValue('Doc 0001');
        const drawn = Date.now();
        const list = page.getByRole('list', { name: 'Mentioned in' });
        await expect(list.getByRole('listitem').first()).toBeVisible({ timeout: 15_000 });
        if (run > 0) shown.push(Date.now() - drawn);
    }
    recordTiming({
        name: '"Mentioned in": list after the note is drawn (3,000 × 10 links)',
        value: best(shown),
        unit: 'ms',
        budget: 500,
    });
});
