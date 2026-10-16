import type { Locator, Page } from '@playwright/test';

import { createDocument } from '../brief';
import { expect, test } from '../fixtures';
import { tool } from '../tools';

/** Hunters named as given, made one after another (the last stays open). Setup, not counted. */
async function namedDocuments(page: Page, names: readonly string[]): Promise<void> {
    for (const name of names) {
        await createDocument(page, 'wod-v5/hunter');
        const field = page.getByRole('textbox', { name: 'Name', exact: true });
        await field.fill(name);
        await field.blur();
    }
}

/** The page of a document in the layout: where rows and tabs are dropped. */
const pageOf = (page: Page, name: string) =>
    page.getByRole('region', { name, exact: true }).locator('..');

type Edge = 'left' | 'right' | 'top' | 'bottom';

/**
 * Drags a document row of the documents window onto an edge of a document's page, with the mouse
 * (a lone document's drop layer appears only once the drag starts, over its page).
 */
async function dropRowOn(
    page: Page,
    documents: Locator,
    name: string,
    target: Locator,
    edge: Edge
) {
    // Only the part in the window can be pointed at (one document's page runs far below it).
    const whole = (await target.boundingBox())!;
    const view = page.viewportSize()!;
    const top = Math.max(whole.y, 0);
    const goal = {
        x: whole.x,
        y: top,
        width: whole.width,
        height: Math.min(whole.y + whole.height, view.height) - top,
    };
    const at = {
        left: { x: goal.x + 12, y: goal.y + goal.height / 2 },
        right: { x: goal.x + goal.width - 12, y: goal.y + goal.height / 2 },
        top: { x: goal.x + goal.width / 2, y: goal.y + 12 },
        bottom: { x: goal.x + goal.width / 2, y: goal.y + goal.height - 12 },
    }[edge];
    const row = (await documents
        .getByRole('treeitem', { name: new RegExp(`^${name}`) })
        .boundingBox())!;
    await page.mouse.move(row.x + row.width / 2, row.y + row.height / 2);
    await page.mouse.down();
    await page.mouse.move(at.x, at.y, { steps: 8 });
    await page.mouse.up();
}

const box = async (locator: Locator) => (await locator.boundingBox())!;
const pageScrolls = (page: Page) =>
    page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollHeight > root.clientHeight || root.scrollWidth > root.clientWidth;
    });

test('the four-part layout from a first visit in at most 8 actions (spec 036, SC-001)', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await namedDocuments(page, ['Upper', 'Lower']);
    let actions = 0;

    await page.getByRole('button', { name: 'Manage', exact: true }).click();
    actions += 1;
    await page.getByRole('button', { name: 'Toggle dice roller' }).click();
    actions += 1;
    const documents = tool(page, 'Documents');
    await dropRowOn(page, documents, 'Upper', pageOf(page, 'Lower'), 'top');
    actions += 1;

    await expect(page.locator('section[data-pane]')).toHaveCount(2);
    const left = await box(documents);
    const right = await box(tool(page, 'Dice Roller'));
    const upper = await box(page.getByRole('region', { name: 'Upper', exact: true }));
    const lower = await box(page.getByRole('region', { name: 'Lower', exact: true }));
    expect(left.x + left.width).toBeLessThanOrEqual(upper.x);
    expect(upper.x + upper.width).toBeLessThanOrEqual(right.x);
    expect(Math.abs(upper.x - lower.x)).toBeLessThan(2);
    expect(upper.y + upper.height).toBeLessThanOrEqual(lower.y);
    expect(actions).toBeLessThanOrEqual(8);
});

test('a 3 × 2 grid in at most 12 actions, all in view, and back after a reload (spec 036, SC-002)', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const names = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];
    await namedDocuments(page, [...names.slice(1), names[0]!]);
    let actions = 0;

    // Docked, the documents window would take one of the six groups: it floats.
    await page.getByRole('button', { name: 'Manage', exact: true }).click();
    actions += 1;
    await page
        .locator('[data-group-strip]')
        .getByRole('tab', { name: 'Documents', exact: true })
        .click({ button: 'right' });
    actions += 1;
    await page.getByRole('menuitem', { name: 'Float' }).click();
    actions += 1;
    const documents = page.getByRole('dialog', { name: 'Documents', exact: true });

    // The window floats over the left of the page: every drop lands right of it or below it.
    // One is alone: its sheet is the place to drop on.
    await dropRowOn(page, documents, 'Two', page.locator('[data-template-root]'), 'right');
    actions += 1;
    await dropRowOn(page, documents, 'Three', pageOf(page, 'Two'), 'right');
    actions += 1;
    for (const [name, above] of [
        ['Four', 'One'],
        ['Five', 'Two'],
        ['Six', 'Three'],
    ] as const) {
        await dropRowOn(page, documents, name, pageOf(page, above), 'bottom');
        actions += 1;
    }
    expect(actions).toBeLessThanOrEqual(12);

    const panes = page.locator('section[data-pane]');
    await expect(panes).toHaveCount(6);
    const frames = page.locator('[data-group-frame]');
    const rects = await Promise.all((await frames.all()).map(box));
    for (const rect of rects) {
        expect(rect.width).toBeGreaterThanOrEqual(320);
        expect(rect.height).toBeGreaterThanOrEqual(200);
    }
    expect(new Set(rects.map((rect) => Math.round(rect.y))).size).toBe(2);
    expect(await pageScrolls(page)).toBe(false);

    const order = () =>
        panes.evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.pane));
    const before = await order();
    await page.reload();
    await expect(panes).toHaveCount(6);
    expect(await order()).toEqual(before);
    await expect(page.getByRole('dialog', { name: 'Documents', exact: true })).toBeVisible();
});

test('three spec 034 panes load as three groups with the same widths (spec 036, SC-003)', async ({
    page,
}) => {
    // Wide enough that 2 : 1 : 1 keeps every group over its 320 px minimum.
    await page.setViewportSize({ width: 1600, height: 900 });
    await namedDocuments(page, ['Ana', 'Bruno', 'Cleo']);
    const entries = await page.evaluate(
        () =>
            new Promise<string[]>((resolve, reject) => {
                const open = indexedDB.open('localforage');
                open.onerror = () => reject(open.error);
                open.onsuccess = () => {
                    const request = open.result
                        .transaction('keyvaluepairs')
                        .objectStore('keyvaluepairs')
                        .get('universal-character-storage');
                    request.onsuccess = () => {
                        const value = JSON.parse(request.result as string) as {
                            state: { entries: { id: string }[] };
                        };
                        open.result.close();
                        resolve(value.state.entries.map((entry) => entry.id));
                    };
                };
            })
    );
    expect(entries).toHaveLength(3);
    await page.evaluate((list) => {
        localStorage.removeItem('ttgamer:panes:v2');
        localStorage.setItem(
            'ttgamer:panes:v1',
            JSON.stringify({
                state: {
                    ids: list,
                    recent: [list[0]],
                    weights: { [list[0]!]: 2, [list[1]!]: 1, [list[2]!]: 1 },
                    views: {},
                    maximized: null,
                },
                version: 1,
            })
        );
    }, entries);
    await page.reload();

    const frames = page.locator('[data-group-frame]');
    await expect(frames).toHaveCount(3);
    const widths = (await Promise.all((await frames.all()).map(box))).map((rect) => rect.width);
    expect(Math.abs(widths[0]! / widths[1]! - 2)).toBeLessThan(0.02);
    expect(Math.abs(widths[1]! / widths[2]! - 1)).toBeLessThan(0.01);
    expect(await page.evaluate(() => localStorage.getItem('ttgamer:panes:v1'))).toBeNull();
    const order = await page
        .locator('section[data-pane]')
        .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.pane));
    expect(order).toEqual(entries);
});
