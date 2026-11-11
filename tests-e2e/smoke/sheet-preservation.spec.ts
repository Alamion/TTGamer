import { readFileSync } from 'node:fs';

import type { Page } from '@playwright/test';

import { UnknownDocumentEnvelopeSchema } from '../../src/sheet_manager/types/document';
import { createDocument } from '../brief';
import { recordStorage } from '../document-records';
import { expect, test } from '../fixtures';

const COORDINATE = 'my-preserved-coordinate';
const NOTE = 'Character notes stored before the sheet corrections';
const RESOURCES = {
    willpower: { current: 2, max: 7 },
    forcePoints: { current: 1, max: 3 },
    darkSideResistance: 2,
};
const KEPT = {
    data: { ...RESOURCES, notes: NOTE },
    templateValues: { [COORDINATE]: 'Keep this custom value' },
};

function parseRecord(raw: unknown) {
    const envelope = UnknownDocumentEnvelopeSchema.parse(raw);
    const data = envelope.data;
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('The character payload is not a record');
    }
    return { ...envelope, data: data as Record<string, unknown> };
}

async function storedRecord(page: Page, id: string) {
    const raw = await recordStorage(page, id);
    return raw === null ? null : parseRecord(JSON.parse(raw));
}

async function exportedRecord(page: Page) {
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const file = await (await downloading).path();
    if (!file) throw new Error('The character export was not downloaded');
    return parseRecord(JSON.parse(readFileSync(file, 'utf8')));
}

async function importCopy(page: Page, exported: ReturnType<typeof parseRecord>) {
    const id = `copy-${exported.id}`;
    await page.getByLabel('Import document file').setInputFiles({
        name: 'preserved-character.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({ ...exported, id })),
    });
    await expect(page.locator(`[data-template-root][data-document-id="${id}"]`)).toBeVisible();
    return id;
}

for (const [definition, fullView, briefView] of [
    ['character', 'full-sheet', 'brief'],
    ['droid', 'droid-sheet', 'droid-brief'],
] as const) {
    test(`${definition} preserves its old resource pairs through edit, reload, export and import`, async ({
        page,
    }) => {
        await createDocument(page, `star-wars-wod/${definition}`);
        const full = page.locator(`[data-template-root="${fullView}"]`);
        await expect(full).toBeVisible();
        const id = await full.getAttribute('data-document-id');
        if (!id) throw new Error('The created sheet has no document id');
        await expect.poll(() => storedRecord(page, id)).not.toBeNull();
        const saved = (await storedRecord(page, id))!;
        await recordStorage(
            page,
            id,
            JSON.stringify({
                ...saved,
                templateValues: { ...saved.templateValues, ...KEPT.templateValues },
                data: {
                    ...saved.data,
                    ...KEPT.data,
                    virtues: {
                        Conscience: { value: 5 },
                        Passion: { value: 3 },
                        'Self Control': { value: 5 },
                    },
                },
            })
        );
        await page.reload();
        const willpower = full.locator('[data-node-id="resource-willpower"]');
        await expect(willpower.getByRole('radio').nth(6)).toHaveAttribute('aria-checked', 'true');
        await expect(willpower.getByRole('radio').nth(1)).toHaveAttribute('aria-checked', 'false');
        await expect.poll(() => storedRecord(page, id)).toMatchObject(KEPT);

        const name = `Saved ${definition}`;
        const nameField = full
            .locator('[data-node-id="field-name"]')
            .getByRole('textbox', { name: 'Name', exact: true });
        await nameField.fill(name);
        await nameField.blur();
        await expect
            .poll(() => storedRecord(page, id))
            .toMatchObject({ ...KEPT, data: { ...KEPT.data, metadata: { name } } });

        const mode = page.getByRole('combobox', { name: 'View mode', exact: true }).first();
        await mode.selectOption(briefView);
        const brief = page.locator(`[data-template-root="${briefView}"]`);
        await expect(
            brief.getByRole('spinbutton', { name: 'Willpower', exact: true })
        ).toHaveAttribute('aria-valuenow', '7');
        await expect(
            brief.getByRole('spinbutton', { name: 'Force points: Current', exact: true })
        ).toHaveAttribute('aria-valuenow', '1');
        await expect(
            brief.getByRole('spinbutton', { name: 'Force points: Maximum', exact: true })
        ).toHaveAttribute('aria-valuenow', '3');
        await expect(
            brief.getByRole('spinbutton', { name: 'Dark Side Resistance', exact: true })
        ).toHaveAttribute('aria-valuenow', '2');
        const exported = await exportedRecord(page);
        expect(exported).toMatchObject(KEPT);

        const importedId = await importCopy(page, exported);
        await mode.selectOption(briefView);
        await expect(
            brief.getByRole('spinbutton', { name: 'Willpower', exact: true })
        ).toHaveAttribute('aria-valuenow', '7');
        await expect
            .poll(() => storedRecord(page, importedId))
            .toMatchObject({ ...KEPT, metadata: { preferredViewId: briefView } });
        await page.reload();
        await expect(brief).toHaveAttribute('data-document-id', importedId);
        await expect(
            brief.getByRole('spinbutton', { name: 'Willpower', exact: true })
        ).toHaveAttribute('aria-valuenow', '7');
        expect(await storedRecord(page, importedId)).toMatchObject(KEPT);
    });
}

test('Hunter creed notes preserve their stored key through edit, reload, export and import', async ({
    page,
}) => {
    await createDocument(page, 'wod-v5/hunter');
    const sheet = page.locator('[data-template-root="v5-hunter-sheet"]');
    await expect(sheet).toBeVisible();
    const id = await sheet.getAttribute('data-document-id');
    if (!id) throw new Error('The created hunter has no document id');
    await expect.poll(() => storedRecord(page, id)).not.toBeNull();
    const saved = (await storedRecord(page, id))!;
    await recordStorage(
        page,
        id,
        JSON.stringify({
            ...saved,
            templateValues: { ...saved.templateValues, [COORDINATE]: 'Keep the hunter coordinate' },
            data: { ...saved.data, creedFields: 'Previously saved creed notes', notes: NOTE },
        })
    );
    await page.reload();
    const creedNotes = sheet.getByRole('textbox', { name: 'Creed notes', exact: true });
    await expect(creedNotes).toHaveValue('Previously saved creed notes');
    const text = 'Keep the cell calm and help the people left behind';
    await creedNotes.fill(text);
    await creedNotes.blur();
    const kept = {
        data: { creedFields: text, notes: NOTE },
        templateValues: { [COORDINATE]: 'Keep the hunter coordinate' },
    };
    await expect.poll(() => storedRecord(page, id)).toMatchObject(kept);
    await page.reload();
    await expect(creedNotes).toHaveValue(text);
    const exported = await exportedRecord(page);
    expect(exported).toMatchObject(kept);
    const importedId = await importCopy(page, exported);
    await expect(creedNotes).toHaveValue(text);
    await expect.poll(() => storedRecord(page, importedId)).toMatchObject(kept);
    await page.reload();
    await expect(sheet).toHaveAttribute('data-document-id', importedId);
    await expect(creedNotes).toHaveValue(text);
    expect(await storedRecord(page, importedId)).toMatchObject(kept);
});
