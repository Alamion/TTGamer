import registry from '@generated/registry';
import routesChunkNames from '@generated/routesChunkNames';
import type { ComponentType } from 'react';

import { warn } from '../utils/logging';

/**
 * Fragments of documentation pages shown in place (spec 045, US1). A docs page's MDX module is
 * found through Docusaurus's route maps, which the main bundle already holds, and loaded as its own
 * chunk once per page. This file is the only reader of those internal maps: a test resolves every
 * shipped docs link through it, so an upgrade that changes them fails there.
 */

export interface DocsPageModule {
    default: ComponentType<{ components?: Record<string, ComponentType<never>> }>;
}

/** One top-level block of a page as the fragment sees it: a heading (with level and id) or not. */
export interface FragmentBlock {
    level?: number;
    id?: string;
}

const routePath = (key: string) => key.slice(0, key.lastIndexOf('-'));
const trimSlash = (path: string) => (path.length > 1 ? path.replace(/\/$/, '') : path);

/** The content chunk of the docs page at a site path (base URL included, no anchor). */
export function docsContentChunk(path: string): string | undefined {
    const wanted = trimSlash(path);
    for (const [key, chunks] of Object.entries(routesChunkNames as Record<string, unknown>)) {
        const content = (chunks as { content?: unknown }).content;
        if (typeof content === 'string' && trimSlash(routePath(key)) === wanted) return content;
    }
    return undefined;
}

const loaded = new Map<string, Promise<DocsPageModule | undefined>>();

/** Loads the page's MDX module once; nothing when the path is no docs page. */
export function loadDocsPage(path: string): Promise<DocsPageModule | undefined> {
    const chunk = docsContentChunk(path);
    if (!chunk) return Promise.resolve(undefined);
    let page = loaded.get(chunk);
    if (!page) {
        const entry = (registry as Record<string, readonly unknown[]>)[chunk];
        const load = entry?.[0] as (() => Promise<DocsPageModule>) | undefined;
        page = load ? load() : Promise.resolve(undefined);
        // A failed load (offline) may be tried again on the next open.
        page.catch(() => loaded.delete(chunk));
        loaded.set(chunk, page);
    }
    return page;
}

/**
 * The blocks a fragment keeps: from the heading with `anchor` to the next heading of the same or a
 * higher level. Without an anchor, or when it is missing, the blocks before the first heading.
 */
export function fragmentRange(
    blocks: readonly FragmentBlock[],
    anchor: string | undefined
): { start: number; end: number; found: boolean } {
    const at = anchor ? blocks.findIndex((block) => block.level && block.id === anchor) : -1;
    if (at < 0) {
        const first = blocks.findIndex((block) => block.level);
        return { start: 0, end: first < 0 ? blocks.length : first, found: !anchor };
    }
    const level = blocks[at]!.level!;
    const next = blocks.findIndex(
        (block, index) => index > at && block.level && block.level <= level
    );
    return { start: at, end: next < 0 ? blocks.length : next, found: true };
}

const reported = new Set<string>();

/** Says once per link that a fragment could not be shown as asked. */
export function reportFragment(problem: 'missing' | 'unavailable', path: string): void {
    const key = `${problem}\u0000${path}`;
    if (reported.has(key)) return;
    reported.add(key);
    warn(
        problem === 'missing'
            ? `A documentation link names a part its page does not have: ${path}`
            : `A documentation page could not be loaded: ${path}`,
        'docs-fragment'
    );
}
