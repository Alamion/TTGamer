import { createDocument, measureView, showView } from '../brief';
import { expect, test } from '../fixtures';

/** The Storyteller kinds' briefs fit a phone and a narrow pane (spec 040, SC-003). */

const KINDS = ['wod-v5/v5-storyteller', 'wod-v5/v5-group'] as const;

for (const definition of KINDS) {
    test(`${definition}: the brief fits 360 px and a 400 px pane without sideways scrolling`, async ({
        page,
    }) => {
        await createDocument(page, definition);
        await showView(page, 'brief');
        for (const width of [360, 400, 640, 1280] as const) {
            await page.setViewportSize({ width, height: 800 });
            expect((await measureView(page)).overflows, `${width} px`).toBe(false);
        }
    });
}
