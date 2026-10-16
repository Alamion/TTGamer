// @vitest-environment happy-dom
import { Splitter } from '@site/src/shared/components/Splitter';
import { fitPaneSizes, type PaneLimits, usePaneSizes } from '@site/src/shared/hooks/usePaneSizes';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, useCallback, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { openWindow, seedDocuments } from '../sheet_manager/helpers/documentsWindow';
import { renderEditor, resetEditorStores } from '../sheet_manager/helpers/editor';
import { resetLibraryStores } from '../sheet_manager/helpers/library';
import { openLibrary } from '../sheet_manager/helpers/libraryDialog';
import { describeSplitterContract } from './splitterContract';

vi.setConfig({ testTimeout: 20_000 });

const BARE_LIMITS: Record<'tree', PaneLimits> = { tree: { min: 180, max: 480, initial: 280 } };

/** A bare divider with its own stored size, between columns or between rows. */
function BareHost({
    orientation,
    onCollapse,
    primary,
}: {
    orientation?: 'vertical' | 'horizontal';
    onCollapse?: (side: 'start' | 'end') => void;
    primary?: 'start' | 'end';
}) {
    const body = useRef<HTMLDivElement>(null);
    const panes = usePaneSizes('documents-panes', BARE_LIMITS, undefined, {
        restMin: 240,
        dividers: 6,
    });
    const preview = useCallback(
        (width: number) => body.current?.style.setProperty('--tree', `${width}px`),
        []
    );
    return (
        <div ref={body} data-testid="bare-host">
            <Splitter
                orientation={orientation}
                label="Resize the tree"
                min={BARE_LIMITS.tree.min}
                max={BARE_LIMITS.tree.max}
                value={panes.sizes.tree}
                clamp={(width) => panes.clamp('tree', width)}
                onPreview={preview}
                onChange={(width) => panes.setSize('tree', width)}
                onReset={() => panes.reset('tree')}
                collapseAfter={onCollapse ? 80 : undefined}
                onCollapse={onCollapse}
                primary={primary}
            />
        </div>
    );
}

const editorTemplate = () =>
    CustomTemplateSchema.parse({
        id: 'tpl-splitter',
        name: 'Splitter Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [{ id: 'motto', type: 'text', label: 'Motto' }],
    });

describeSplitterContract({
    title: 'the template editor (outline)',
    open: () => void renderEditor(editorTemplate()),
    prepare: resetEditorStores,
    divider: () => screen.getByRole('separator', { name: 'Resize outline' }),
    previewTarget: () =>
        document.querySelector<HTMLElement>('[class*="grid-cols-1"][class*="--outline"]'),
    cssVariable: '--outline',
    storageKey: 'template-editor-panes',
    pane: 'outline',
    limits: { min: 160, max: 420, initial: 240 },
});

describeSplitterContract({
    title: 'the template editor (settings, divider left of its pane)',
    open: () => void renderEditor(editorTemplate()),
    prepare: resetEditorStores,
    divider: () => screen.getByRole('separator', { name: 'Resize settings' }),
    previewTarget: () =>
        document.querySelector<HTMLElement>('[class*="grid-cols-1"][class*="--outline"]'),
    cssVariable: '--settings',
    storageKey: 'template-editor-panes',
    pane: 'settings',
    limits: { min: 260, max: 560, initial: 320 },
    invert: true,
});

describeSplitterContract({
    title: 'the library dialog',
    open: () => void openLibrary(),
    prepare: resetLibraryStores,
    divider: () => screen.getByRole('separator', { name: 'Resize the tree' }),
    previewTarget: () => document.querySelector<HTMLElement>('[style*="--tree"]'),
    cssVariable: '--tree',
    storageKey: 'library-panes',
    pane: 'tree',
    limits: { min: 220, max: 560, initial: 384 },
});

describeSplitterContract({
    title: 'the documents window',
    open: () => {
        seedDocuments(['Ana']);
        openWindow();
    },
    divider: () => screen.getByRole('separator', { name: 'Resize the document list' }),
    previewTarget: () => document.querySelector<HTMLElement>('[style*="--tree"]'),
    cssVariable: '--tree',
    storageKey: 'documents-panes',
    pane: 'tree',
    limits: { min: 180, max: 520, initial: 280 },
});

describeSplitterContract({
    title: 'a bare divider (the shared hook and component alone)',
    open: () => void render(createElement(BareHost)),
    divider: () => screen.getByRole('separator', { name: 'Resize the tree' }),
    previewTarget: () => screen.getByTestId('bare-host'),
    cssVariable: '--tree',
    storageKey: 'documents-panes',
    pane: 'tree',
    limits: BARE_LIMITS.tree,
});

describe('fitting panes to a container that shrinks', () => {
    const limits: Record<'a' | 'b', PaneLimits> = {
        a: { min: 100, max: 400, initial: 200 },
        b: { min: 100, max: 400, initial: 200 },
    };
    const room = { restMin: 300, dividers: 10 };

    it('keeps the sizes when there is room', () => {
        expect(fitPaneSizes({ a: 200, b: 200 }, limits, 1000, room)).toEqual({ a: 200, b: 200 });
        expect(fitPaneSizes({ a: 200, b: 200 }, limits, undefined, room)).toEqual({
            a: 200,
            b: 200,
        });
    });

    it('takes space from the panes in proportion, never below their minimums', () => {
        const fitted = fitPaneSizes({ a: 400, b: 200 }, limits, 800, room);
        // Each size is rounded to a whole pixel, so the sum may pass the room by one.
        expect(fitted.a + fitted.b + room.dividers + room.restMin).toBeLessThanOrEqual(801);
        expect(fitted.a).toBeGreaterThanOrEqual(100);
        expect(fitPaneSizes({ a: 400, b: 200 }, limits, 300, room)).toEqual({ a: 100, b: 100 });
    });
});

describeSplitterContract({
    title: 'a divider between rows (spec 036)',
    open: () => void render(createElement(BareHost, { orientation: 'horizontal' })),
    divider: () => screen.getByRole('separator', { name: 'Resize the tree' }),
    previewTarget: () => screen.getByTestId('bare-host'),
    cssVariable: '--tree',
    storageKey: 'documents-panes',
    pane: 'tree',
    limits: BARE_LIMITS.tree,
    orientation: 'horizontal',
});

describe('collapsing a pane past its divider (spec 036, D9)', () => {
    const divider = () => screen.getByRole('separator', { name: 'Resize the tree' });
    const value = () => Number(divider().getAttribute('aria-valuenow'));
    const drag = (to: number) => {
        fireEvent.pointerDown(divider(), { button: 0, pointerId: 1, clientX: 1000 });
        fireEvent.pointerMove(divider(), { pointerId: 1, clientX: 1000 + to });
        fireEvent.pointerUp(divider(), { pointerId: 1, clientX: 1000 + to });
    };
    const host = (primary?: 'start' | 'end') => {
        const onCollapse = vi.fn();
        render(createElement(BareHost, { onCollapse, primary }));
        return onCollapse;
    };
    afterEach(() => {
        cleanup();
        localStorage.clear();
    });

    it('collapses the pane a drag passes more than 80 px beyond its minimum', () => {
        const onCollapse = host();
        const { initial, min, max } = BARE_LIMITS.tree;
        drag(min - initial - 80);
        expect(onCollapse).not.toHaveBeenCalled();
        expect(value()).toBe(min);
        drag(min - value() - 81);
        expect(onCollapse).toHaveBeenLastCalledWith('start');
        drag(max - value() + 81);
        expect(onCollapse).toHaveBeenLastCalledWith('end');
        expect(onCollapse).toHaveBeenCalledTimes(2);
    });

    it('collapses the primary pane with Enter', () => {
        const onCollapse = host('end');
        fireEvent.keyDown(divider(), { key: 'Enter' });
        expect(onCollapse).toHaveBeenCalledWith('end');
    });
});
