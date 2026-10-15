import { cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/** One place that shows a divider (spec 032, FR-021): how to open it and find its parts. */
export interface SplitterHost {
    title: string;
    open: () => void;
    divider: () => HTMLElement;
    /** The element whose CSS variable moves while the divider is dragged. */
    previewTarget: () => HTMLElement | null;
    cssVariable: string;
    storageKey: string;
    pane: string;
    limits: { min: number; max: number; initial: number };
    /** The pane lies right of the divider: moving the divider right narrows it. */
    invert?: boolean;
    /** A divider between rows (moved up and down) instead of between columns. */
    orientation?: 'vertical' | 'horizontal';
    prepare?: () => void;
}

const SMALL = 10;
const LARGE = 40;

/** The behavior every divider shares, run against one host. */
export function describeSplitterContract(host: SplitterHost) {
    const { limits } = host;
    const value = () => Number(host.divider().getAttribute('aria-valuenow'));
    const stored = () => {
        const raw = localStorage.getItem(host.storageKey);
        return raw === null ? undefined : (JSON.parse(raw) as Record<string, number>)[host.pane];
    };
    const direction = host.invert ? -1 : 1;
    const horizontal = host.orientation === 'horizontal';
    const grow = horizontal ? 'ArrowDown' : 'ArrowRight';
    const shrink = horizontal ? 'ArrowUp' : 'ArrowLeft';
    const at = (position: number) => (horizontal ? { clientY: position } : { clientX: position });
    const press = (key: string, shiftKey = false) =>
        fireEvent.keyDown(host.divider(), {
            key: key === 'ArrowRight' ? grow : key === 'ArrowLeft' ? shrink : key,
            shiftKey,
        });

    describe(`splitter contract: ${host.title}`, () => {
        beforeEach(() => {
            localStorage.clear();
            host.prepare?.();
        });
        afterEach(cleanup);

        it('is a separator of its orientation with its size and bounds', () => {
            host.open();
            const divider = host.divider();
            expect(divider.getAttribute('role')).toBe('separator');
            expect(divider.getAttribute('aria-orientation')).toBe(host.orientation ?? 'vertical');
            expect(value()).toBe(limits.initial);
            expect(divider.getAttribute('aria-valuemin')).toBe(String(limits.min));
            expect(divider.getAttribute('aria-valuemax')).toBe(String(limits.max));
            expect(divider.getAttribute('aria-label')).toBeTruthy();
            expect(divider.tabIndex).toBe(0);
        });

        it('moves by 10 with an arrow and by 40 with Shift, in the pane direction', () => {
            host.open();
            press('ArrowRight');
            expect(value()).toBe(limits.initial + SMALL * direction);
            press('ArrowLeft', true);
            expect(value()).toBe(limits.initial + (SMALL - LARGE) * direction);
        });

        it('stays inside its bounds and resets with Home and with a double click', () => {
            host.open();
            for (let step = 0; step < 60; step++) press('ArrowRight', true);
            expect(value()).toBe(host.invert ? limits.min : limits.max);
            for (let step = 0; step < 60; step++) press('ArrowLeft', true);
            expect(value()).toBe(host.invert ? limits.max : limits.min);
            press('Home');
            expect(value()).toBe(limits.initial);
            press('ArrowRight');
            fireEvent.doubleClick(host.divider());
            expect(value()).toBe(limits.initial);
        });

        it('previews a drag without storing it, stores once on release', () => {
            host.open();
            const divider = host.divider();
            fireEvent.pointerDown(divider, { button: 0, pointerId: 1, ...at(200) });
            fireEvent.pointerMove(divider, { pointerId: 1, ...at(230) });
            expect(host.previewTarget()?.style.getPropertyValue(host.cssVariable)).toBe(
                `${limits.initial + 30 * direction}px`
            );
            expect(stored()).toBeUndefined();
            fireEvent.pointerUp(divider, { pointerId: 1, ...at(230) });
            expect(stored()).toBe(limits.initial + 30 * direction);
            expect(value()).toBe(limits.initial + 30 * direction);
        });

        it('puts the preview back when a drag is cancelled', () => {
            host.open();
            const divider = host.divider();
            fireEvent.pointerDown(divider, { button: 0, pointerId: 1, ...at(200) });
            fireEvent.pointerMove(divider, { pointerId: 1, ...at(260) });
            fireEvent.pointerCancel(divider, { pointerId: 1 });
            expect(host.previewTarget()?.style.getPropertyValue(host.cssVariable)).toBe(
                `${limits.initial}px`
            );
            expect(stored()).toBeUndefined();
        });

        it('remembers the size for the next time and survives broken stored text', () => {
            host.open();
            press('ArrowRight', true);
            const moved = value();
            cleanup();
            host.open();
            expect(value()).toBe(moved);
            cleanup();
            localStorage.setItem(host.storageKey, '{not json');
            host.open();
            expect(value()).toBe(limits.initial);
        });
    });
}
