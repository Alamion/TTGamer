import { EMPTY_LAYOUT, openKeys } from '@site/src/sheet_manager/features/sheet/panes/layoutTree';
import {
    setLayoutArea,
    usePaneStore,
} from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { documentIdOf } from '@site/src/sheet_manager/features/sheet/panes/tabKeys';
import { screen } from '@testing-library/react';

/** No layout: the sheet shows the current document alone; no layout area was drawn yet. */
export const resetLayout = () => {
    setLayoutArea(null);
    usePaneStore.setState(EMPTY_LAYOUT);
};

/** A layout area this big, as if the sheet had drawn it (room for six groups by default). */
export const roomyArea = (width = 2400, height = 1000) => setLayoutArea({ width, height });

/** The open documents in reading order (groups, then floating windows). */
export const openDocumentIds = () =>
    openKeys(usePaneStore.getState())
        .map(documentIdOf)
        .filter((id): id is string => id !== null);

/** The group a document is shown in: its frame holds the strip, the controls, and the page. */
export const groupFrameOf = (name: string) =>
    screen.getByRole('region', { name }).closest<HTMLElement>('[data-group-frame]')!;

/**
 * The window's width as media queries see it (happy-dom does not resize): `max-width` and
 * `min-width` queries match it, and `set` tells their listeners, as a resize would.
 */
export function windowWidth(initial: number) {
    let width = initial;
    const listeners = new Set<() => void>();
    const original = window.matchMedia;
    const originalWidth = window.innerWidth;
    const apply = () =>
        Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    window.matchMedia = ((query: string) => {
        const max = /max-width:\s*(\d+)px/.exec(query);
        const min = /min-width:\s*(\d+)px/.exec(query);
        return {
            matches:
                !query.includes('coarse') &&
                (!max || width <= Number(max[1])) &&
                (!min || width >= Number(min[1])),
            media: query,
            addEventListener: (_: string, listener: () => void) => listeners.add(listener),
            removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
        };
    }) as unknown as typeof window.matchMedia;
    apply();
    return {
        set(next: number) {
            width = next;
            apply();
            for (const listener of [...listeners]) listener();
        },
        restore() {
            window.matchMedia = original;
            width = originalWidth;
            apply();
        },
    };
}
