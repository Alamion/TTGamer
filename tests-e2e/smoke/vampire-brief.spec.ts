import type { Page } from '@playwright/test';

import { createDocument, measureView, showView } from '../brief';
import { expect, test } from '../fixtures';

/** The vampire's brief fits phones and narrow panes (spec 037, SC-004). */

/** Hunger, Blood Potency, Humanity, and Rouse: cells with no width or covering another. */
function bloodCellsOverlap(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const root = document.querySelector('[data-template-root]')!;
        const cells = [
            root.querySelector('[aria-label="Hunger"]'),
            root.querySelector('[aria-label="Blood Potency"]'),
            root.querySelector('[role="group"][aria-label^="Humanity"]'),
            root.querySelector('button[aria-label="Rouse check"]'),
        ].map((cell) => cell!.closest('[data-column] > *')!.getBoundingClientRect());
        const problems: string[] = [];
        cells.forEach((box, index) => {
            if (box.width < 1) problems.push(`cell ${index} has no width`);
            cells.slice(index + 1).forEach((other, offset) => {
                const apart =
                    box.right <= other.left + 0.5 ||
                    other.right <= box.left + 0.5 ||
                    box.bottom <= other.top + 0.5 ||
                    other.bottom <= box.top + 0.5;
                if (!apart) problems.push(`cells ${index} and ${index + offset + 1} overlap`);
            });
        });
        return problems;
    });
}

test('the vampire brief fits a phone and a 400 px pane without sideways scrolling', async ({
    page,
}) => {
    await createDocument(page, 'wod-v5/vampire');
    await showView(page, 'brief');
    const sizes = new Map<number, Awaited<ReturnType<typeof measureView>>>();
    for (const width of [320, 375, 640, 1280] as const) {
        await page.setViewportSize({ width, height: 800 });
        const size = await measureView(page);
        sizes.set(width, size);
        expect(size.overflows, `no sideways overflow at ${width} px`).toBe(false);
        expect(await bloodCellsOverlap(page), `blood cells apart at ${width} px`).toEqual([]);
    }
    const pane = await measureView(page, 400);
    expect(pane.overflows, 'no sideways overflow in a 400 px area').toBe(false);
    // Wider never makes it taller; the area decides, not the window.
    expect(sizes.get(1280)!.content).toBeLessThanOrEqual(sizes.get(640)!.content);
    // Within the phone limit of the other V5 briefs (spec 033): about 1.5 phone screens.
    expect(sizes.get(375)!.height).toBeLessThanOrEqual(1400);
});
