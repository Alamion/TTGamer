import { readFileSync } from 'node:fs';

import type { Page } from '@playwright/test';

import { Wod2eCharacterDataSchema } from '../../src/sheet_manager/systems/wod2e/ruleset/schema';
import { UnknownDocumentEnvelopeSchema } from '../../src/sheet_manager/types/document';
import { createDocument } from '../brief';
import { recordStorage } from '../document-records';
import { expect, test } from '../fixtures';

const ORIGINAL = ['slash', 'cross', 'empty', 'empty', 'empty', 'empty', 'empty'];
const ORDINARY = ['slash', 'slash', 'empty', 'empty', 'empty', 'empty', 'empty'];
const AGGRAVATED = ['slash', 'slash', 'cross', 'empty', 'empty', 'empty', 'empty'];
const NOTE = 'Notes saved before the classic rules correction';
const COORDINATE = 'my-migration-note';

function parseRecord(raw: unknown) {
    const envelope = UnknownDocumentEnvelopeSchema.parse(raw);
    return { ...envelope, data: Wod2eCharacterDataSchema.parse(envelope.data) };
}

async function storedRecord(page: Page, id: string) {
    const raw = await recordStorage(page, id);
    return raw === null ? null : parseRecord(JSON.parse(raw));
}

test('migrates classic wounds in IndexedDB once and preserves them through export and import', async ({
    page,
}) => {
    await createDocument(page, 'wod-2e/wod2e-character');
    const sheet = page.locator('[data-template-root="wod2e-sheet"]');
    await expect(sheet).toBeVisible();
    const id = await sheet.getAttribute('data-document-id');
    if (!id) throw new Error('The created sheet has no document id');
    await expect.poll(() => storedRecord(page, id)).not.toBeNull();
    const saved = (await storedRecord(page, id))!;
    expect(saved.schemaVersion).toBe(2);
    const old = {
        ...saved,
        schemaVersion: 1,
        templateValues: { ...saved.templateValues, [COORDINATE]: 'Keep this coordinate' },
        data: { ...saved.data, health: { levels: ORIGINAL }, notes: NOTE },
    };
    delete old.data.legacyHealth;
    await recordStorage(page, id, JSON.stringify(old));

    await page.reload();
    const health = sheet.getByRole('table', { name: 'Health', exact: true });
    const notice = page.getByText(/This WoD 2e character now uses classic wound rules\./);
    await expect(
        health.getByRole('button', { name: 'Bruised: Ordinary', exact: true })
    ).toBeVisible();
    await expect(health.getByRole('button', { name: 'Hurt: Ordinary', exact: true })).toBeVisible();
    await expect(notice).toBeVisible();
    await expect
        .poll(() => storedRecord(page, id))
        .toMatchObject({
            schemaVersion: 2,
            data: { health: { levels: ORDINARY }, legacyHealth: { levels: ORIGINAL }, notes: NOTE },
            templateValues: { [COORDINATE]: 'Keep this coordinate' },
        });
    await expect(
        health
            .getByRole('row', { name: /^Injured / })
            .getByRole('cell')
            .first()
    ).toHaveText('-1');

    await page.reload();
    await expect(health.getByRole('button', { name: 'Injured: empty', exact: true })).toBeVisible();
    await expect(notice).toHaveCount(0);
    // The shipped track has no legend; its supported click cycle selects the two wound types.
    await health.getByRole('button', { name: 'Injured: empty', exact: true }).click();
    await expect(
        health.getByRole('button', { name: 'Injured: Ordinary', exact: true })
    ).toBeVisible();
    await health.getByRole('button', { name: 'Injured: Ordinary', exact: true }).click();
    await expect(
        health.getByRole('button', { name: 'Injured: Aggravated', exact: true })
    ).toBeVisible();
    await expect
        .poll(() => storedRecord(page, id))
        .toMatchObject({
            data: { health: { levels: AGGRAVATED }, legacyHealth: { levels: ORIGINAL } },
        });
    await expect(notice).toHaveCount(0);

    await page.reload();
    await expect(
        health.getByRole('button', { name: 'Injured: Aggravated', exact: true })
    ).toBeVisible();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const path = await (await downloading).path();
    if (!path) throw new Error('The character export was not downloaded');
    const exported = parseRecord(JSON.parse(readFileSync(path, 'utf8')));
    expect(exported).toMatchObject({
        schemaVersion: 2,
        data: { health: { levels: AGGRAVATED }, legacyHealth: { levels: ORIGINAL }, notes: NOTE },
        templateValues: { [COORDINATE]: 'Keep this coordinate' },
    });
    await expect(notice).toHaveCount(0);

    const importedId = `copy-${id}`;
    await page.getByLabel('Import document file').setInputFiles({
        name: 'classic-copy.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({ ...exported, id: importedId })),
    });
    await expect(sheet).toHaveAttribute('data-document-id', importedId);
    await expect(
        health.getByRole('button', { name: 'Injured: Aggravated', exact: true })
    ).toBeVisible();
    await expect
        .poll(() => storedRecord(page, importedId))
        .toMatchObject({
            schemaVersion: 2,
            data: {
                health: { levels: AGGRAVATED },
                legacyHealth: { levels: ORIGINAL },
                notes: NOTE,
            },
            templateValues: { [COORDINATE]: 'Keep this coordinate' },
        });
    await expect(notice).toBeVisible();
    await page.reload();
    await expect(sheet).toHaveAttribute('data-document-id', importedId);
    await expect(
        health.getByRole('button', { name: 'Injured: Aggravated', exact: true })
    ).toBeVisible();
    await expect(notice).toHaveCount(0);
});
