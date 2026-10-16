import { createDocument, measureView, showView } from '../brief';
import { expect, test } from '../fixtures';

/** The vampire's brief fits phones and narrow panes (spec 037, SC-004). */

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
    }
    const pane = await measureView(page, 400);
    expect(pane.overflows, 'no sideways overflow in a 400 px area').toBe(false);
    // Wider never makes it taller; the area decides, not the window.
    expect(sizes.get(1280)!.content).toBeLessThanOrEqual(sizes.get(640)!.content);
    // Within the phone limit of the other V5 briefs (spec 033): about 1.5 phone screens.
    expect(sizes.get(375)!.height).toBeLessThanOrEqual(1400);
});
