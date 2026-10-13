import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '../fixtures';

const FIXTURE = path.resolve('tests/sheet_manager/fixtures/legacy-export-first-version.json');

test('imports a batch with an old export and a broken file, then recovers the broken one', async ({
    page,
}) => {
    await page.goto('/universal_sheet');
    const input = page.getByLabel('Import document file');

    await input.setInputFiles([
        { name: 'first-version.json', mimeType: 'application/json', buffer: readFileSync(FIXTURE) },
        { name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{ cut off') },
    ]);

    const summary = page.getByRole('dialog', { name: 'Import finished' });
    await expect(summary).toContainText('An armor item had no name');
    await expect(summary.getByRole('alert')).toContainText('broken.json');
    await summary.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('button', { name: 'Manage', exact: true }).click();
    const manager = page.getByRole('dialog', { name: 'Manage documents' });
    await expect(manager).toContainText('Rejected files kept for recovery: 1');

    const downloading = page.waitForEvent('download');
    await manager.getByRole('button', { name: 'Download rejected files' }).click();
    const recovery = JSON.parse(readFileSync((await (await downloading).path())!, 'utf8'));
    expect(recovery.records).toHaveLength(1);

    // Repair the file: a valid old export under a new id, as an author would after reading it.
    const repaired = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    repaired.id = '99999999-9999-4999-8999-999999999999';
    recovery.records[0].content = JSON.stringify(repaired);
    await manager.getByRole('button', { name: 'Close', exact: true }).first().click();

    await input.setInputFiles({
        name: 'ttgamer_recovery.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(recovery)),
    });
    await page
        .getByRole('dialog', { name: 'Import finished' })
        .getByRole('button', { name: 'Close' })
        .click();

    await page.getByRole('button', { name: 'Manage', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Manage documents' })).not.toContainText(
        'Rejected files kept for recovery'
    );
});
