import type { Page } from '@playwright/test';

import { createDocument } from '../brief';
import { expect, test } from '../fixtures';
import { documentsTool } from '../tools';

const sizes = [
    { name: '1280 px', viewport: { width: 1280, height: 800 } },
    { name: '375 px', viewport: { width: 375, height: 700 } },
];

async function openWindow(page: Page) {
    await page.getByRole('button', { name: 'Manage', exact: true }).click();
    const window = documentsTool(page);
    await expect(window).toBeVisible();
    return window;
}

for (const { name, viewport } of sizes) {
    test.describe(`the documents window at ${name}`, () => {
        test.use({ viewport });

        test('makes a folder, moves a document into it, searches, undoes, and keeps it all after a reload', async ({
            page,
        }) => {
            await page.goto('/universal_sheet');
            await page.getByRole('button', { name: 'New', exact: true }).click();
            const create = page.getByRole('dialog', { name: 'Create document' });
            // On a phone the details (and Create) follow the choice of a kind.
            await create.getByRole('option').first().click();
            await create.getByRole('button', { name: 'Create', exact: true }).click();
            await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();

            let window = await openWindow(page);
            const tree = window.getByRole('tree', { name: 'Documents' });

            await window.getByRole('button', { name: 'New folder', exact: true }).click();
            const typing = tree.getByRole('textbox', { name: 'Name' });
            await typing.fill('Campaign');
            await typing.press('Enter');
            await expect(tree.getByRole('treeitem', { name: /Campaign/ })).toBeVisible();

            // Move the document with the row menu: the way that works with a finger too.
            await window.getByRole('button', { name: 'Actions for Character' }).click();
            await page.getByRole('menuitem', { name: 'Move to…' }).click();
            const picker = page.getByRole('dialog', { name: /^Move 1 item/ });
            await picker.getByRole('treeitem', { name: 'Campaign' }).click();
            await picker.getByRole('button', { name: 'Move here' }).click();
            const campaign = tree.getByRole('treeitem', { name: /Campaign/ });
            await expect(campaign).toHaveAttribute('aria-expanded', 'true');
            await expect(tree.getByRole('treeitem', { name: /^Character/ })).toHaveAttribute(
                'aria-level',
                '2'
            );

            await window.getByRole('searchbox', { name: 'Search names' }).fill('camp');
            await expect(tree.getByRole('treeitem')).toHaveCount(2);
            await window.getByRole('button', { name: 'Clear search', exact: true }).click();

            await window.getByRole('button', { name: 'Undo: Move' }).click();
            await expect(tree.getByRole('treeitem', { name: /^Character/ })).toHaveAttribute(
                'aria-level',
                '1'
            );
            await window.getByRole('button', { name: 'Redo: Move' }).click();
            await expect(tree.getByRole('treeitem', { name: /^Character/ })).toHaveAttribute(
                'aria-level',
                '2'
            );

            // The store writes asynchronously: reload until what was saved is there.
            await expect(async () => {
                await page.reload();
                window = await openWindow(page);
                await expect(window.getByRole('treeitem', { name: /^Character/ })).toHaveAttribute(
                    'aria-level',
                    '2',
                    { timeout: 2_000 }
                );
            }).toPass({ timeout: 15_000 });
            await expect(window.getByRole('treeitem', { name: /Campaign/ })).toBeVisible();
        });
    });
}

test("each document shows its setting's mark when the list mixes settings (spec 046)", async ({
    page,
}) => {
    const marks: string[] = [];
    page.on('response', (response) => {
        if (response.url().includes('/img/settings/') && response.ok()) marks.push(response.url());
    });
    await createDocument(page, 'star-wars-wod/character');
    await page.getByRole('button', { name: 'New', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Create document' });
    const folded = dialog.locator('button[aria-expanded="false"]');
    while ((await folded.count()) > 0) await folded.first().click();
    await dialog.locator('[data-kind="wod-v5/hunter"]').click();
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();

    const window = await openWindow(page);
    const tree = window.getByRole('tree', { name: 'Documents' });
    const starWars = tree.locator('[title="Star Wars (World of Darkness 2e)"]');
    const hunter = tree.locator('[title="Hunter: the Reckoning 5e"]');
    await expect(starWars.locator('[data-badge-mark]')).toBeVisible();
    await expect(hunter.locator('[data-badge-mark]')).toBeVisible();
    // Drawn, not lettered: the mark is the theme colour through its file.
    await expect(starWars).not.toContainText('SW');
    await expect.poll(() => marks.length).toBeGreaterThanOrEqual(2);
});
