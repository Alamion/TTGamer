import type { Page } from '@playwright/test';

import { createDocument, showView } from '../brief';
import { expect, test } from '../fixtures';

interface StoredDocument {
    data: Record<string, unknown>;
    templateValues?: Record<string, unknown>;
}

/** Uses the app's actual IndexedDB boundary; reload parses the seeded document normally. */
async function documentRecord(page: Page, fixture = false): Promise<StoredDocument | null> {
    const id = await page.locator('[data-template-root]').getAttribute('data-document-id');
    return page.evaluate(
        ({ documentId, seed }) =>
            new Promise<StoredDocument | null>((resolve, reject) => {
                const open = indexedDB.open('localforage');
                open.onerror = () => reject(open.error);
                open.onsuccess = () => {
                    const db = open.result;
                    const tx = db.transaction('keyvaluepairs', seed ? 'readwrite' : 'readonly');
                    const store = tx.objectStore('keyvaluepairs');
                    const read = store.get(`doc:${documentId}`);
                    let record: StoredDocument | null = null;
                    read.onsuccess = () => {
                        const stored: unknown = read.result;
                        const parsed: unknown =
                            typeof stored === 'string' ? JSON.parse(stored) : stored;
                        if (parsed !== undefined && parsed !== null) {
                            if (
                                typeof parsed !== 'object' ||
                                Array.isArray(parsed) ||
                                !('data' in parsed) ||
                                !parsed.data ||
                                typeof parsed.data !== 'object' ||
                                Array.isArray(parsed.data)
                            ) {
                                tx.abort();
                                reject(new Error('The persisted document has no object data'));
                                return;
                            }
                            record = parsed as StoredDocument;
                        }
                        if (seed && record) {
                            record = {
                                ...record,
                                data: {
                                    ...record.data,
                                    hunger: 2,
                                    stains: 0,
                                    disciplines: [
                                        { id: 'test-presence', name: 'Presence', value: 1 },
                                    ],
                                    powers: [
                                        {
                                            id: 'costly',
                                            name: 'Costly power',
                                            discipline: 'Presence',
                                            level: '1',
                                            note: '',
                                            entry: '',
                                            rouse: '1',
                                        },
                                        {
                                            id: 'free',
                                            name: 'Free power',
                                            discipline: 'Presence',
                                            level: '1',
                                            note: '',
                                            entry: '',
                                            rouse: '0',
                                        },
                                    ],
                                },
                            };
                            store.put(JSON.stringify(record), `doc:${documentId}`);
                        }
                    };
                    tx.onerror = () => {
                        db.close();
                        reject(tx.error);
                    };
                    tx.oncomplete = () => {
                        db.close();
                        resolve(record);
                    };
                };
            }),
        { documentId: id, seed: fixture }
    );
}

async function savedState(page: Page) {
    const document = await documentRecord(page);
    if (!document) throw new Error('The fixture document is not persisted');
    const history = await page.evaluate(() => {
        const raw = localStorage.getItem('dice-roller-storage');
        return raw ? (JSON.parse(raw) as { state: { history: unknown[] } }).state.history : [];
    });
    return { data: document.data, values: document.templateValues ?? {}, history };
}

for (const locale of ['en', 'ru'] as const) {
    test(`${locale}: action help opens real rules without rolling or changing the character`, async ({
        page,
    }) => {
        await createDocument(page, 'wod-v5/vampire');
        await expect.poll(() => documentRecord(page)).not.toBeNull();
        expect((await documentRecord(page, true))?.data).toMatchObject({ hunger: 2, stains: 0 });
        await page.reload();
        if (locale === 'ru') await page.goto('/ru/universal_sheet');
        const root = page.locator('[data-template-root="v5-vampire-sheet"]');
        await expect(root).toBeVisible();
        const before = await savedState(page);
        const foldState = () =>
            root
                .locator('button[aria-expanded]')
                .evaluateAll((buttons) =>
                    buttons.map((button) => [
                        button.getAttribute('aria-label'),
                        button.getAttribute('aria-expanded'),
                    ])
                );
        const folds = await foldState();
        const rouse = locale === 'ru' ? 'Проверка жажды' : 'Rouse check';
        const remorse = locale === 'ru' ? 'Проверка раскаяния' : 'Remorse check';
        const row = (name: string) =>
            locale === 'ru' ? `${rouse}: ${name}` : `${rouse} for ${name}`;
        for (const [name, heading, disabled] of [
            [rouse, locale === 'ru' ? 'Проверки жажды' : 'Rouse checks', false],
            [remorse, locale === 'ru' ? 'Проверка раскаяния' : 'The Remorse check', true],
            [row('Costly power'), locale === 'ru' ? 'Проверки жажды' : 'Rouse checks', false],
            [row('Free power'), locale === 'ru' ? 'Проверки жажды' : 'Rouse checks', true],
        ] as const) {
            const action = root.getByRole('button', { name, exact: true });
            if (disabled) await expect(action).toBeDisabled();
            else await expect(action).toBeEnabled();
            const help = root.getByRole('link', {
                name: locale === 'ru' ? `Документация: ${name}` : `Documentation for ${name}`,
                exact: true,
            });
            expect(await help.evaluate((link) => link.closest('button') === null)).toBe(true);
            for (const mode of ['pointer', 'keyboard'] as const) {
                if (mode === 'pointer') await help.click();
                else {
                    await help.focus();
                    await page.keyboard.press('Enter');
                }
                const card = page.locator('[data-docs-card]');
                await expect(
                    card.getByRole('heading', { name: heading, exact: true })
                ).toBeVisible();
                await page.keyboard.press('Escape');
                await expect(card).toBeHidden();
                expect(await savedState(page)).toEqual(before);
                expect(await foldState()).toEqual(folds);
            }
        }
        // The same help survives the brief presentation; Remorse remains unavailable.
        if (locale === 'ru') {
            await page
                .getByRole('combobox', { name: 'Режим отображения', exact: true })
                .selectOption('v5-vampire-brief');
        } else await showView(page, 'brief');
        const help = page.getByRole('link', {
            name: locale === 'ru' ? `Документация: ${remorse}` : `Documentation for ${remorse}`,
            exact: true,
        });
        await help.focus();
        await page.keyboard.press('Enter');
        await expect(
            page.locator('[data-docs-card]').getByRole('heading', {
                name: locale === 'ru' ? 'Проверка раскаяния' : 'The Remorse check',
                exact: true,
            })
        ).toBeVisible();
        await page.keyboard.press('Escape');
        expect(await savedState(page)).toEqual(before);
    });
}
