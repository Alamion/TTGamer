import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';

const sizes = [
    { name: '1280 px', viewport: { width: 1280, height: 800 } },
    { name: '375 px', viewport: { width: 375, height: 700 } },
];

async function openWindow(page: Page) {
    await page.getByRole('button', { name: 'Manage', exact: true }).click();
    const window = page.getByRole('dialog', { name: 'Documents', exact: true });
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
            await page
                .getByRole('dialog', { name: 'Create document' })
                .getByRole('button', { name: 'Create', exact: true })
                .click();
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
            await window.getByRole('button', { name: 'Clear search' }).click();

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
