// @vitest-environment happy-dom
import registry from '@generated/registry';
import routesChunkNames from '@generated/routesChunkNames';
import { DocsPreviewLink } from '@site/src/shared/components/DocsFragmentCard';
import {
    docsContentChunk,
    fragmentRange,
    loadDocsPage,
} from '@site/src/shared/components/docsFragments';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ComponentType, createElement, Fragment, type ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

/** Documentation fragments in a card next to a "?" (spec 045, US1). */

type Components = Record<string, ComponentType<{ id?: string; children?: ReactNode }>>;

/** The page's blocks, drawn through the given components, as MDX's inner function does. */
function createContent({ components = {} }: { components?: Components }) {
    const { h2 = 'h2', h3 = 'h3' } = components as Record<string, never>;
    return createElement(
        Fragment,
        null,
        createElement('p', { key: 'intro' }, 'Intro text.'),
        createElement(h2, { key: 'a', id: 'attributes' }, 'Attributes'),
        createElement('p', { key: 'a1' }, 'Nine attributes.'),
        createElement(h3, { key: 'p', id: 'physical' }, 'Physical'),
        createElement('p', { key: 'p1' }, 'Strength and more.'),
        createElement(h2, { key: 'b', id: 'abilities' }, 'Abilities'),
        createElement('p', { key: 'b1' }, 'Skills you learn.')
    );
}

/** A page as MDX v3 compiles it: the wrapper gets one element that draws the blocks. */
function page(props: { components?: Components }) {
    const Wrapper = props.components?.wrapper;
    return Wrapper
        ? createElement(Wrapper, null, createElement(createContent, props))
        : createContent(props);
}

const load = vi.fn(() => Promise.resolve({ default: page }));

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
    Object.assign(routesChunkNames, {
        '/docs/rules/core-abc': { __comp: 'doc-item', content: 'content-core' },
        '/docs-root': { __comp: 'docs-root' },
    });
    Object.assign(registry, { 'content-core': [load, 'core.mdx', 'core'] });
});

afterEach(cleanup);

const settle = () => act(() => Promise.resolve());

describe('fragments', () => {
    const blocks = [
        {},
        { level: 2, id: 'a' },
        {},
        { level: 3, id: 'b' },
        {},
        { level: 2, id: 'c' },
        {},
    ];

    it('run from the heading to the next heading of the same or a higher level', () => {
        expect(fragmentRange(blocks, 'a')).toEqual({ start: 1, end: 5, found: true });
        expect(fragmentRange(blocks, 'b')).toEqual({ start: 3, end: 5, found: true });
        expect(fragmentRange(blocks, 'c')).toEqual({ start: 5, end: 7, found: true });
    });

    it('without an anchor keep the page start, and say when the anchor is missing', () => {
        expect(fragmentRange(blocks, undefined)).toEqual({ start: 0, end: 1, found: true });
        expect(fragmentRange(blocks, 'nowhere')).toEqual({ start: 0, end: 1, found: false });
    });

    it('find a page by its route, and load it once', async () => {
        expect(docsContentChunk('/docs/rules/core')).toBe('content-core');
        expect(docsContentChunk('/docs/rules/core/')).toBe('content-core');
        expect(docsContentChunk('/docs')).toBeUndefined();
        load.mockClear();
        await Promise.all([loadDocsPage('/docs/rules/core'), loadDocsPage('/docs/rules/core')]);
        expect(load).toHaveBeenCalledTimes(1);
        expect(await loadDocsPage('/docs/nowhere')).toBeUndefined();
    });
});

function mount(docsPath = '/docs/rules/core#attributes') {
    render(
        <DocsPreviewLink docsPath={docsPath} label="Documentation: Attributes" title="Attributes" />
    );
    return screen.getByRole('link', { name: 'Documentation: Attributes' });
}

const card = () => screen.queryByRole('dialog', { name: 'Documentation: Attributes' });

describe('the "?" of a section', () => {
    it('opens the linked part on a plain click and keeps the page link', async () => {
        const link = mount();
        fireEvent.click(link);
        await settle();
        expect(card()?.textContent).toContain('Nine attributes.');
        expect(card()?.textContent).toContain('Strength and more.');
        expect(card()?.textContent).not.toContain('Skills you learn.');
        expect(card()?.textContent).not.toContain('Intro text.');
        const open = screen.getByRole('link', { name: 'Open the page' });
        expect(open.getAttribute('href')).toBe('/docs/rules/core#attributes');
    });

    it('leaves Ctrl-click and Shift-click to the browser', () => {
        const link = mount();
        for (const modifier of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
            const click = new MouseEvent('click', { bubbles: true, cancelable: true, ...modifier });
            link.dispatchEvent(click);
            expect(click.defaultPrevented).toBe(false);
        }
        expect(card()).toBeNull();
    });

    it('shows the page start with a note when the part is missing, and reports it once', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const link = mount('/docs/rules/core#gone');
        fireEvent.click(link);
        await settle();
        expect(card()?.textContent).toContain('This part is not on the page');
        expect(card()?.textContent).toContain('Intro text.');
        fireEvent.keyDown(document.activeElement ?? link, { key: 'Escape' });
        fireEvent.click(link);
        await settle();
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });

    it('says when the page cannot be loaded', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        fireEvent.click(mount('/docs/rules/removed#attributes'));
        await settle();
        expect(card()?.textContent).toContain('This page could not be loaded.');
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });

    it('keeps an external link a plain link', () => {
        const link = mount('https://example.org/rules');
        const click = new MouseEvent('click', { bubbles: true, cancelable: true });
        link.dispatchEvent(click);
        expect(click.defaultPrevented).toBe(false);
        expect(card()).toBeNull();
    });
});
