import { createDocument, viewHeight } from '../brief';
import { expect, test } from '../fixtures';
import { BASELINE } from './brief-baseline';

for (const [definition, baseline] of Object.entries(BASELINE)) {
    for (const width of [375, 1280] as const) {
        test(`${definition}: the full sheet keeps its height at ${width} px`, async ({ page }) => {
            await page.setViewportSize({ width, height: 800 });
            await createDocument(page, definition);
            const height = await viewHeight(page, 'sheet');
            expect(Math.abs(height - baseline.sheet[width]) / baseline.sheet[width]).toBeLessThan(
                0.01
            );
        });
    }
}
