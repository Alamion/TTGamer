import type { Page } from '@playwright/test';

import { characterDocumentFromBase } from '../../src/sheet_manager/systems/star-wars-wod/characterDocument';
import { JAX_VORN_PRESET } from '../../src/sheet_manager/systems/star-wars-wod/presets';
import { LENA_VARGA_DOCUMENT } from '../../src/sheet_manager/systems/v5/modules/hunter/example';
import { openFullSheetEditor } from '../editor';
import { expect, test } from '../fixtures';
import { documentsTool, tool } from '../tools';

/**
 * The README images (T-119), taken from the built site with the documentation's example
 * characters: `yarn readme:screenshots` rewrites `attachments/`.
 */

const OUT = 'attachments';

// Example ids end in `::preset`/`::example`, which the store refuses: imported under fixed ids.
const EXAMPLES = [
    {
        id: '0192f000-0000-7000-8000-000000000001',
        document: characterDocumentFromBase(JAX_VORN_PRESET),
    },
    { id: '0192f000-0000-7000-8000-000000000002', document: LENA_VARGA_DOCUMENT },
];

// Seeded randomness: the same dice on every run, so retaking the images changes little more than
// what the site changed (3D throws still depend on frame timing).
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        let seed = 7;
        const next = () => {
            seed = (seed + 0x6d2b79f5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return (t ^ (t >>> 14)) >>> 0;
        };
        Math.random = () => next() / 4294967296;
        crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
            const bytes = new Uint8Array(array!.buffer, array!.byteOffset, array!.byteLength);
            for (let index = 0; index < bytes.length; index += 1) bytes[index] = next() & 0xff;
            return array;
        };
    });
});

/** A still picture: no hover under the pointer, transitions finished. */
async function shoot(page: Page, name: string) {
    await page.mouse.move(0, page.viewportSize()!.height - 1);
    await page.screenshot({ path: `${OUT}/${name}.png`, animations: 'disabled' });
}

async function importExamples(page: Page) {
    await page.goto('/universal_sheet');
    await page.getByLabel('Import document file').setInputFiles(
        EXAMPLES.map(({ id, document }) => ({
            name: `${id}.json`,
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify({ ...document, id })),
        }))
    );
    await expect(page.getByRole('textbox', { name: 'Name', exact: true }).first()).toHaveValue(
        'Lena Varga'
    );
    await expect(page.getByText('Imported 2 documents')).toBeHidden();
}

test('the sheet: documents, a character beside a brief, and the dice roller', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await importExamples(page);
    await page.getByRole('button', { name: 'Manage', exact: true }).click();
    const documents = documentsTool(page);
    await documents.getByRole('treeitem', { name: /^Jax Vorn/ }).dblclick();
    await documents.getByRole('treeitem', { name: /^Lena Varga/ }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Open beside' }).click();
    await page.getByRole('button', { name: 'Toggle dice roller' }).click();
    const dice = tool(page, 'Dice Roller');
    await expect(dice).toBeVisible();
    // Narrow the documents group: the documents carry the picture.
    const divider = await page
        .getByRole('separator', { name: 'Resize Documents and Jax Vorn' })
        .boundingBox();
    await page.mouse.move(divider!.x + divider!.width / 2, divider!.y + 200);
    await page.mouse.down();
    await page.mouse.move(divider!.x - 240, divider!.y + 200, { steps: 8 });
    await page.mouse.up();
    // A right click on a stat's die rolls it at once; the 3D dice settle before history shows it.
    const jax = page.getByRole('region', { name: 'Jax Vorn', exact: true });
    await jax
        .getByRole('button', { name: 'Roll Dexterity', exact: true })
        .click({ button: 'right' });
    await expect(dice.getByText('No rolls yet')).toBeHidden({ timeout: 20_000 });
    await jax.getByText('Base', { exact: true }).scrollIntoViewIfNeeded();
    await shoot(page, 'sheet-layout');
});

test('the template editor on a shipped page', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const editor = await openFullSheetEditor(page);
    await editor
        .getByRole('region', { name: 'Outline' })
        .getByText('Identity', { exact: true })
        .click();
    await shoot(page, 'template-editor');
});

test('a rules page with a roll read die by die', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/docs/wod-v5/rules/dice-pools');
    await page
        .getByRole('heading', { name: 'Reading the dice' })
        .evaluate((heading) => heading.scrollIntoView({ block: 'start' }));
    await shoot(page, 'docs-roll');
});

test('a catalog in the documentation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/docs/star-wars-wod-2e/character/species');
    await page
        .getByRole('heading', { name: 'Species Table' })
        .evaluate((heading) => heading.scrollIntoView({ block: 'start' }));
    await page.getByRole('cell', { name: 'Wookiee', exact: true }).first().click();
    await shoot(page, 'catalog');
});

test('a brief on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await importExamples(page);
    await page.getByLabel('View mode').first().selectOption({ label: 'Brief' });
    await shoot(page, 'phone-brief');
});

test('dice notation rolled in place, die by die', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/docs/guide/dice-roller');
    for (const notation of ['4d6min3', '4d6!', '4d6!!', '4d6!p', '4d6r<3', '4d6kh3', '4d6dl1']) {
        await page.getByRole('button', { name: `Roll ${notation}`, exact: true }).click();
    }
    await page
        .getByText('Modifiers follow the dice.')
        .evaluate((text) => text.scrollIntoView({ block: 'start' }));
    await shoot(page, 'dice-notation');
});
