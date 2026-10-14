import { createDocument, measureView, showView } from '../brief';
import { expect, test } from '../fixtures';
import { BASELINE } from './brief-baseline';

const WIDTHS = [320, 375, 640, 1280] as const;

for (const [definition, baseline] of Object.entries(BASELINE)) {
    test(`${definition}: the full sheet keeps its height`, async ({ page }) => {
        await createDocument(page, definition);
        for (const width of [375, 1280] as const) {
            await page.setViewportSize({ width, height: 800 });
            const { height } = await measureView(page);
            expect(
                Math.abs(height - baseline.sheet[width]) / baseline.sheet[width],
                `${width} px`
            ).toBeLessThan(0.01);
        }
    });

    test(`${definition}: the brief fits every area width`, async ({ page }) => {
        await createDocument(page, definition);
        await showView(page, 'brief');
        const sizes = new Map<number, Awaited<ReturnType<typeof measureView>>>();
        for (const width of WIDTHS) {
            await page.setViewportSize({ width, height: 800 });
            const size = await measureView(page);
            sizes.set(width, size);
            expect(size.overflows, `no sideways overflow at ${width} px`).toBe(false);
        }
        // At least half as tall as before on a phone (SC-001), and no taller wide than at 640.
        expect(sizes.get(375)!.height).toBeLessThanOrEqual(baseline.brief[375] / 2);
        expect(sizes.get(1280)!.content).toBeLessThanOrEqual(sizes.get(640)!.content);
        // The area decides, not the window: a 640 px root in a 1280 px window lays out like 640.
        const inWindow = await measureView(page, 640);
        expect(inWindow.content).toBeLessThanOrEqual(sizes.get(640)!.content + 2);
        expect(inWindow.content).toBeGreaterThanOrEqual(sizes.get(640)!.content - 2);
    });
}

test('the Star Wars character brief is a phone screen and a quarter of a desktop', async ({
    page,
}) => {
    await createDocument(page, 'star-wars-wod/character');
    await showView(page, 'brief');
    await page.setViewportSize({ width: 375, height: 800 });
    expect((await measureView(page)).height).toBeLessThanOrEqual(700);
    await page.setViewportSize({ width: 640, height: 800 });
    expect((await measureView(page)).height).toBeLessThanOrEqual(400);
});
