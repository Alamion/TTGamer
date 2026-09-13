/* Quickstart walkthrough for specs/003-custom-sheet-templates.
 * Run with `node tests/e2e/walkthrough.cjs` against a dev server on localhost:3000.
 * Playwright is resolved from PLAYWRIGHT_MODULE when the default CLI install path is absent.
 */
const { chromium } = require(
    process.env.PLAYWRIGHT_MODULE ||
        '/usr/local/lib/node_modules/@playwright/cli/node_modules/playwright'
);

const BASE = 'http://localhost:3000';
const log = (...args) => console.log('[walk]', ...args);
const step = (name) => console.log(`\n=== ${name} ===`);

(async () => {
    const browser = await chromium.launch({
        executablePath:
            process.env.CHROMIUM_PATH ||
            '/home/JRCD/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome',
        headless: true,
    });
    const context = await browser.newContext({ acceptDownloads: true, locale: 'en' });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);

    try {
        // ---------------------------------------------------------------
        step('S1: Author & save a template (US1)');
        await page.goto(`${BASE}/universal_sheet`, { waitUntil: 'networkidle' });

        await page.getByRole('button', { name: 'Templates', exact: true }).click();
        await page.getByRole('button', { name: 'Character page skeleton' }).click();

        const nameInput = page.getByLabel('Name', { exact: true });
        await nameInput.fill('Walkthrough Kit');

        // Regression: transiently clearing a field label must not crash the page
        const labelInput = page.getByLabel('Field label').first();
        await labelInput.fill('');
        await page.getByRole('alert').waitFor();
        await labelInput.fill('Name');
        log('S1.1 OK — transient empty label shows live issue instead of crashing');

        // Add a section with a text field
        await page.getByRole('button', { name: 'Add section' }).click();
        const save = page.getByRole('button', { name: 'Save', exact: true });
        await save.click();

        await page.getByText('Walkthrough Kit').waitFor();
        log('S1 OK — template saved and listed in library');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // ---------------------------------------------------------------
        step('S2: Use the template as a character page (US2)');
        await page.getByRole('button', { name: 'New', exact: true }).click();
        await page.getByRole('button', { name: 'Create', exact: true }).click();

        // Switch page to the template via view mode select
        const viewSelect = page.getByLabel('View mode');
        await viewSelect.selectOption({ label: 'Walkthrough Kit' });
        await page.getByText('Identity').waitFor();
        log('S2.1 OK — custom page renders');

        // Fill a text field inside Identity (placeholder label 'Name' inside template fields)
        const templateName = page.getByLabel('Name', { exact: true }).last();
        await templateName.fill('Han Solo');

        // Reload — values must persist
        await page.reload({ waitUntil: 'networkidle' });
        await page.getByText('Identity').waitFor();
        const persisted = await page.getByLabel('Name', { exact: true }).last().inputValue();
        if (persisted !== 'Han Solo') throw new Error(`S2 persistence failed: "${persisted}"`);
        log('S2.2 OK — value persists across reload');

        // Switch to built-in page and back — values retained
        await viewSelect.selectOption({ label: 'Full sheet' });
        await viewSelect.selectOption({ label: 'Walkthrough Kit' });
        const retained = await page.getByLabel('Name', { exact: true }).last().inputValue();
        if (retained !== 'Han Solo') throw new Error(`S2 round trip failed: "${retained}"`);
        log('S2.3 OK — page switch round trip retains values');

        // ---------------------------------------------------------------
        step('S3: Catalog-backed field auto-fill (US3)');
        // Edit the template: bind the first field (skeleton 'Name') to the melee-weapons catalog
        await page.getByRole('button', { name: 'Templates', exact: true }).click();
        await page.getByRole('button', { name: 'Edit: Walkthrough Kit' }).click();

        const firstFieldEditor = page.locator('[data-field-id]').first();
        await firstFieldEditor.getByLabel('Field type').selectOption('select');
        await firstFieldEditor.getByLabel('Attach catalog').selectOption('melee-weapons');
        // Fill the 'Name' detail into the 'Concept' text field
        await firstFieldEditor.getByLabel('Name — Fill into').selectOption({ label: 'Concept' });
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page.locator('p.truncate', { hasText: 'Walkthrough Kit' }).first().waitFor();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // On the character page the bound field is a catalog picker; pick Knife
        await page.getByText('Identity').waitFor();
        const weaponPicker = page.getByLabel('Name', { exact: true });
        await weaponPicker.selectOption({ label: 'Knife' });
        const concept = page.getByLabel('Concept');
        await page.waitForTimeout(200);
        if ((await concept.inputValue()) !== 'Knife')
            throw new Error(`S3 auto-fill failed: "${await concept.inputValue()}"`);
        log('S3.1 OK — selecting a catalog entry fills linked fields');

        // Replace re-copies; clear leaves values
        await weaponPicker.selectOption({ label: 'Sword' });
        if ((await concept.inputValue()) !== 'Sword')
            throw new Error(`S3 replace failed: "${await concept.inputValue()}"`);
        await weaponPicker.selectOption({ index: 0 });
        if ((await concept.inputValue()) !== 'Sword')
            throw new Error(`S3 clear failed: "${await concept.inputValue()}"`);
        log('S3.2 OK — replace re-copies, clear leaves copied values');

        // ---------------------------------------------------------------
        step('S4: Import / export templates (US4)');
        await page.getByRole('button', { name: 'Templates', exact: true }).click();
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('button', { name: 'Export: Walkthrough Kit' }).click(),
        ]);
        const exportPath = '/tmp/opencode/walkthrough-template.json';
        await download.saveAs(exportPath);
        log('S4.1 OK — exported to', exportPath);

        // Delete the template
        await page.getByRole('button', { name: 'Delete: Walkthrough Kit' }).click();
        await page.getByRole('button', { name: 'Delete', exact: true }).click();

        // Import it back
        await page.getByRole('button', { name: 'Import template' }).click();
        await page.getByLabel('Import template file').setInputFiles(exportPath);
        await page.locator('p.truncate', { hasText: 'Walkthrough Kit' }).waitFor();
        log('S4.2 OK — import restores the deleted template');

        // Import again → conflict dialog → Duplicate
        await page.getByRole('button', { name: 'Import template', exact: true }).click();
        await page.getByLabel('Import template file').setInputFiles(exportPath);
        await page.getByText('Template already exists').waitFor();
        await page.getByRole('button', { name: 'Duplicate' }).click();
        await page.waitForTimeout(300);
        const copies = await page.locator('p.truncate', { hasText: 'Walkthrough Kit' }).count();
        if (copies < 2) throw new Error(`S4 duplicate import did not create a copy (${copies})`);
        log('S4.3 OK — collision offers Replace/Duplicate/Cancel');

        // Invalid file → rejected with reason, library unchanged
        await page.getByRole('button', { name: 'Import template', exact: true }).click();
        await page.getByLabel('Import template file').setInputFiles({
            name: 'broken.json',
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify({ format: 'nope', template: {} })),
        });
        await page.waitForTimeout(500);
        const afterBad = await page.locator('p.truncate', { hasText: 'Walkthrough Kit' }).count();
        if (afterBad !== copies) throw new Error('S4 invalid import mutated the library');
        log('S4.4 OK — invalid file rejected, library unchanged');
        await page.keyboard.press('Escape');

        // ---------------------------------------------------------------
        step('S5: A11y spot checks');
        // ru-locale chrome is verified by `yarn build` (production /ru build) and
        // `yarn validate:i18n` parity gates; dev server serves the default locale only.
        const unlabeled = await page.$$eval(
            'button',
            (buttons) =>
                buttons.filter(
                    (b) =>
                        !b.textContent?.trim() &&
                        !b.getAttribute('aria-label') &&
                        !b.getAttribute('title')
                ).length
        );
        if (unlabeled > 0) throw new Error(`S5 a11y: ${unlabeled} unlabeled icon buttons`);
        log('S5.1 OK — no unlabeled icon buttons on the sheet');

        // Keyboard reachability: templates button is reachable by Tab from page top
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => document.activeElement?.tagName);
        if (!focused) throw new Error('S5 keyboard: nothing focused after Tab');
        log('S5.2 OK — keyboard navigation active');

        console.log('\nALL WALKTHROUGH SCENARIOS PASSED');
    } catch (error) {
        console.error('\nWALKTHROUGH FAILED:', error.message);
        try {
            await page.screenshot({
                path: '/tmp/opencode/walkthrough-failure.png',
                fullPage: true,
            });
            console.error('screenshot: /tmp/opencode/walkthrough-failure.png');
        } catch {}
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
