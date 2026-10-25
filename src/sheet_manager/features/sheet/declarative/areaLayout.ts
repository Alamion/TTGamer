import { createContext, useContext } from 'react';

/**
 * Whether the sheet is drawn in an area that is not the window (a pane beside others, spec 034):
 * its groups then take their columns from the width of the area instead of from the window.
 */
export const AreaLayoutContext = createContext(false);

/** Whether the node is drawn inside a brief block (spec 041; the brief look of spec 033). */
export const BriefGroupContext = createContext(false);

/**
 * Whether the page being drawn is a brief (spec 041): its fields draw in the compact look and its
 * ratings show their short labels. Set by the page renderer from the template's `pageKind`.
 */
export const PageKindContext = createContext<'brief' | 'full'>('full');

export function useBriefPage(): boolean {
    return useContext(PageKindContext) === 'brief';
}

/**
 * The window breakpoint classes the sheet uses for columns, and their area counterparts. The area
 * is the sheet root's content box, so its thresholds are the content widths the page reaches at
 * the window breakpoints (`md` 768, `xl` 1280, less the scrollbar and the root's padding): 720 and
 * 1200 px. The root is at most `max-w-7xl` (1280 px) wide, so the container widths of those
 * breakpoints themselves (`@3xl`, `@7xl`) would never give a pane three columns.
 */
const BY_AREA: Readonly<Record<string, string>> = {
    'md:grid-cols-2': '@min-[720px]/brief:grid-cols-2',
    'xl:grid-cols-3': '@min-[1200px]/brief:grid-cols-3',
    'xl:grid-cols-4': '@min-[1200px]/brief:grid-cols-4',
    'md:col-span-2': '@min-[720px]/brief:col-span-2',
    'md:col-span-3': '@min-[720px]/brief:col-span-3',
    'md:col-span-4': '@min-[720px]/brief:col-span-4',
    'xl:col-span-3': '@min-[1200px]/brief:col-span-3',
    'xl:col-span-4': '@min-[1200px]/brief:col-span-4',
    'md:[grid-template-columns:var(--template-columns)]':
        '@min-[720px]/brief:[grid-template-columns:var(--template-columns)]',
};

/** `classes` with every window breakpoint column class swapped for its area counterpart. */
export function forArea(classes: string, byArea: boolean): string {
    if (!byArea) return classes;
    return classes
        .split(' ')
        .map((token) => BY_AREA[token] ?? token)
        .join(' ');
}
