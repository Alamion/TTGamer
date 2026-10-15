import type { Page } from '@playwright/test';

import { createDocument, measureView, showView } from '../brief';
import { expect, test } from '../fixtures';
import { SINGLE_DOCUMENT_BASELINE } from './panes-baseline';

test('with one document the page keeps its height (spec 034, SC-005)', async ({ page }) => {
    await createDocument(page, 'star-wars-wod/character');
    for (const view of ['sheet', 'brief'] as const) {
        await showView(page, view);
        for (const width of [375, 1280] as const) {
            await page.setViewportSize({ width, height: 800 });
            const { height } = await measureView(page);
            const expected = SINGLE_DOCUMENT_BASELINE[view][width];
            expect(Math.abs(height - expected) / expected, `${view} at ${width} px`).toBeLessThan(
                0.01
            );
        }
    }
    await expect(page.getByRole('tablist')).toHaveCount(0);
});

/** Makes `count` characters (the last stays open), then opens the others beside it. */
async function openSeveralBeside(page: Page, count: number): Promise<void> {
    for (let index = 0; index < count; index += 1)
        await createDocument(page, 'star-wars-wod/character');
    for (let index = 0; index < count - 1; index += 1) {
        await page.getByRole('button', { name: 'Manage', exact: true }).click();
        const window = page.getByRole('dialog', { name: 'Documents', exact: true });
        // A click on a row opens the document, so the row's own menu is the way to open beside.
        await window
            .getByRole('button', { name: /^Actions for / })
            .nth(index)
            .click();
        await page.getByRole('menuitem', { name: 'Open beside' }).click();
        if (page.viewportSize()!.width < 768) continue;
        await window.getByRole('button', { name: 'Close the documents window' }).click();
    }
}

const panes = (page: Page) => page.locator('section[data-pane]');
const noSideways = (page: Page) =>
    page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );

test('three documents share a 1280 px window, each at least 320 px, with no sideways scroll', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openSeveralBeside(page, 3);
    await expect(panes(page)).toHaveCount(3);
    await expect(page.getByRole('tab')).toHaveCount(3);
    for (const box of await Promise.all(
        (await panes(page).all()).map((pane) => pane.boundingBox())
    )) {
        expect(box!.width).toBeGreaterThanOrEqual(320);
    }
    expect(await noSideways(page)).toBe(true);
});

test('a window that fits two panes shows two and keeps the third as a tab', async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 800 });
    await openSeveralBeside(page, 3);
    await expect(panes(page)).toHaveCount(2);
    await expect(page.getByRole('tab')).toHaveCount(3);
    await page.getByRole('tab').first().click();
    await expect(panes(page)).toHaveCount(2);
    expect(await noSideways(page)).toBe(true);
});

test('a 375 px phone shows one pane and the tabs list every open document', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await openSeveralBeside(page, 3);
    await expect(panes(page)).toHaveCount(1);
    await expect(page.getByRole('tab')).toHaveCount(3);
    await expect(page.getByRole('separator')).toHaveCount(0);
    expect(await noSideways(page)).toBe(true);
    await page.getByRole('tab').first().click();
    await expect(panes(page)).toHaveCount(1);
});

test('double click on a tab gives a pane the whole window and a second one brings the rest back', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openSeveralBeside(page, 3);
    const widths = async () =>
        Promise.all(
            (await panes(page).all()).map(async (pane) => (await pane.boundingBox())!.width)
        );
    const before = await widths();

    await page.getByRole('tab').nth(1).dblclick();
    await expect(panes(page)).toHaveCount(1);
    expect((await widths())[0]).toBeGreaterThan(before[0]! * 2);

    await page.getByRole('tab').nth(1).dblclick();
    await expect(panes(page)).toHaveCount(3);
    expect(await widths()).toEqual(before);
});

const briefHeights = (page: Page) =>
    page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('section[data-pane] [data-template-root]')]
            .filter((root) => root.dataset.templateRoot!.includes('brief'))
            .map((root) => ({
                width: Math.round(root.getBoundingClientRect().width),
                height: Math.round(root.getBoundingClientRect().height),
            }))
    );

test('a document opened beside starts in its brief, as tall as spec 033 allows for the pane width', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await openSeveralBeside(page, 2);
    const wide = await briefHeights(page);
    expect(wide).toHaveLength(1);
    expect(wide[0]!.width).toBeGreaterThanOrEqual(640);
    expect(wide[0]!.height).toBeLessThanOrEqual(400);
});

test('briefs in panes about 400 px wide stay under the phone limit of spec 033', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openSeveralBeside(page, 3);
    const narrow = await briefHeights(page);
    expect(narrow).toHaveLength(2);
    for (const { height, width } of narrow) {
        expect(width).toBeLessThan(560);
        expect(height).toBeLessThanOrEqual(700);
    }
});

test('changing the view of one pane leaves the other pane alone', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openSeveralBeside(page, 2);
    const second = page.locator('section[data-pane]').nth(1);
    const first = page.locator('section[data-pane]').nth(0);
    const select = second.getByRole('combobox');
    const options = await select.locator('option').allTextContents();
    const firstPage = await first
        .locator('[data-template-root]')
        .getAttribute('data-template-root');
    await select.selectOption({ label: options.find((name) => !/brief/i.test(name))! });
    await expect(second.locator('[data-template-root]')).not.toHaveAttribute(
        'data-template-root',
        /brief/
    );
    await expect(first.locator('[data-template-root]')).toHaveAttribute(
        'data-template-root',
        firstPage!
    );
});

test('the panes, their order, sizes, and views come back after a reload', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openSeveralBeside(page, 3);
    const panes = page.locator('section[data-pane]');
    const select = panes.nth(1).getByRole('combobox');
    const options = await select.locator('option').allTextContents();
    await select.selectOption({ label: options.find((name) => !/brief/i.test(name))! });
    const divider = page.getByRole('separator').first();
    await divider.focus();
    await divider.press('Shift+ArrowRight');
    const snapshot = async () => ({
        tabs: await page.getByRole('tab').allTextContents(),
        ids: await panes.evaluateAll((nodes) =>
            nodes.map((node) => (node as HTMLElement).dataset.pane)
        ),
        widths: await panes.evaluateAll((nodes) =>
            nodes.map((node) => Math.round(node.getBoundingClientRect().width))
        ),
        pages: await panes.evaluateAll((nodes) =>
            nodes.map((node) =>
                node.querySelector('[data-template-root]')?.getAttribute('data-template-root')
            )
        ),
    });
    const before = await snapshot();
    expect(before.widths[0]).not.toBe(before.widths[1]);

    await page.reload();
    await expect(page.locator('section[data-pane]')).toHaveCount(3);
    expect(await snapshot()).toEqual(before);

    // A document deleted meanwhile simply drops out.
    await page.getByRole('button', { name: 'Manage', exact: true }).click();
    const window = page.getByRole('dialog', { name: 'Documents', exact: true });
    await window
        .getByRole('treeitem')
        .first()
        .click({ modifiers: ['ControlOrMeta'] });
    await window.getByRole('button', { name: 'Delete', exact: true }).click();
    await page
        .getByRole('dialog')
        .last()
        .getByRole('button', { name: 'Delete', exact: true })
        .click();
    await window.getByRole('button', { name: 'Close the documents window' }).click();
    await page.reload();
    await expect(page.locator('section[data-pane]')).toHaveCount(2);
    await expect(page.getByRole('tab')).toHaveCount(2);
});
