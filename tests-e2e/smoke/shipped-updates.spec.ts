import type { CustomTemplate, TemplateNode } from '../../src/sheet_manager/types/template';
import { createDocument } from '../brief';
import { openFullSheetEditor, rootOutlineIds } from '../editor';
import { expect, test } from '../fixtures';
import { type StoredTemplates, templateStorage } from '../shipped-updates';

const KEY = 'star-wars-wod:full-sheet';
const TITLE = 'My character details';
const OLD_LABEL = 'Previous shipped label';

function firstLabel(page: CustomTemplate): string {
    const visit = (nodes: TemplateNode[]): string | undefined => {
        for (const node of nodes) {
            if ('label' in node && node.label && node.id !== 'name') return node.id;
            if ('children' in node) {
                const found = visit(node.children);
                if (found) return found;
            }
        }
        return undefined;
    };
    const id = visit(page.children);
    if (!id) throw new Error('The full sheet has no labelled element');
    return id;
}

function olderLabel(template: CustomTemplate, id: string) {
    const visit = (nodes: TemplateNode[]) => {
        for (const node of nodes) {
            if (node.id === id && 'label' in node) {
                node.label = OLD_LABEL;
                delete node.labelMessage;
            }
            if ('children' in node) visit(node.children);
        }
    };
    visit(template.children);
}

test('reviews a shipped update while keeping the player’s renamed title after saving and reload', async ({
    page,
}) => {
    const editor = await openFullSheetEditor(page);
    const [first] = await rootOutlineIds(page);
    await editor
        .locator(`[data-outline-row="${first}"] button:not([data-drag-handle])`)
        .first()
        .click();
    await editor
        .locator(`[data-settings-for="${first}"]`)
        .getByRole('textbox', { name: 'Title', exact: true })
        .fill(TITLE);
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(editor).toHaveCount(0);
    await page.getByRole('button', { name: 'Close the library', exact: true }).click();
    await createDocument(page, 'star-wars-wod/character', { navigate: false });
    await expect(page.getByRole('heading', { name: TITLE, exact: true })).toBeVisible();
    await expect
        .poll(async () => {
            const raw = await templateStorage(page);
            return raw
                ? (JSON.parse(raw) as StoredTemplates).state.defaultOverrides[KEY]?.children[0]
                : undefined;
        })
        .toMatchObject({ title: TITLE });
    const persisted = JSON.parse((await templateStorage(page))!) as StoredTemplates;
    const record = persisted.state.overrideBases[KEY]!;
    const id = firstLabel(record.base!);
    // Base-only perturbation would merge to the unchanged copy and advance silently.
    // Model a real old label in both versions, independent of the player's renamed section.
    olderLabel(record.base!, id);
    olderLabel(persisted.state.defaultOverrides[KEY]!, id);
    record.revision = 'old';
    const seeded = JSON.stringify(persisted);
    await templateStorage(page, seeded);
    await page.reload();
    const banner = page.getByRole('region', { name: 'Shipped page update', exact: true });
    await expect(banner).toHaveCount(1);
    // Read once after hydration and before interacting: startup must preserve this pending base.
    expect(await templateStorage(page)).toBe(seeded);
    expect(
        await banner.evaluate((element) =>
            element.nextElementSibling?.hasAttribute('data-template-root')
        )
    ).toBe(true);
    await banner.getByRole('button', { name: 'Review changes', exact: true }).click();
    const review = page.getByRole('region', { name: 'Review shipped changes', exact: true });
    await expect(review.getByText(OLD_LABEL, { exact: true })).toBeVisible();
    await expect(
        review.getByText('Changed by the shipped page', { exact: true }).first()
    ).toBeVisible();
    await page
        .getByRole('dialog', { name: 'Full sheet', exact: true })
        .getByRole('button', { name: 'Save', exact: true })
        .click();
    await expect(page.getByRole('dialog', { name: 'Full sheet', exact: true })).toHaveCount(0);
    await expect(banner).toHaveCount(0);
    await expect
        .poll(async () => {
            const raw = await templateStorage(page);
            return raw
                ? (JSON.parse(raw) as StoredTemplates).state.overrideBases[KEY]?.revision
                : undefined;
        })
        .not.toBe('old');
    await page.reload();
    await expect(page.getByRole('heading', { name: TITLE, exact: true })).toBeVisible();
    await expect(banner).toHaveCount(0);
});
