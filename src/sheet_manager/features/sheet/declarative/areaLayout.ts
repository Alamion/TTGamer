import { createContext, useContext } from 'react';

/**
 * Whether the sheet is drawn in an area that is not the window (a pane beside others, spec 034):
 * its groups then take their columns from the width of the area, at the widths the window
 * breakpoints (`md` 768, `xl` 1280) use, instead of from the window.
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

/** The window breakpoint classes the sheet uses for columns, and their area counterparts. */
const BY_AREA: Readonly<Record<string, string>> = {
    'md:grid-cols-2': '@3xl/brief:grid-cols-2',
    'xl:grid-cols-3': '@7xl/brief:grid-cols-3',
    'xl:grid-cols-4': '@7xl/brief:grid-cols-4',
    'md:col-span-2': '@3xl/brief:col-span-2',
    'md:col-span-3': '@3xl/brief:col-span-3',
    'md:col-span-4': '@3xl/brief:col-span-4',
    'xl:col-span-3': '@7xl/brief:col-span-3',
    'xl:col-span-4': '@7xl/brief:col-span-4',
    'md:[grid-template-columns:var(--template-columns)]':
        '@3xl/brief:[grid-template-columns:var(--template-columns)]',
};

/** `classes` with every window breakpoint column class swapped for its area counterpart. */
export function forArea(classes: string, byArea: boolean): string {
    if (!byArea) return classes;
    return classes
        .split(' ')
        .map((token) => BY_AREA[token] ?? token)
        .join(' ');
}
