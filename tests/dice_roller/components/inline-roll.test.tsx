// @vitest-environment jsdom

import { InlineRoll } from '@site/src/dice_roller/components/InlineRoll';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { act, createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('InlineRoll', () => {
    it('resets the visible result and pending animation when notation changes', () => {
        vi.useFakeTimers();
        const view = render(createElement(InlineRoll, { notation: '1d6@2', animationTime: 100 }));

        fireEvent.click(screen.getByRole('button', { name: /1d6/i }));
        expect(screen.getByText(/= 2/)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /1d6/i }));
        view.rerender(createElement(InlineRoll, { notation: '1d6@5', animationTime: 100 }));
        act(() => vi.runAllTimers());

        expect(screen.queryByText(/= 2/)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /1d6/i }));
        expect(screen.getByText(/= 5/)).toBeTruthy();
    });

    it('rerolls preroll content when its notation changes', () => {
        const view = render(createElement(InlineRoll, { notation: '1d6@1', preroll: true }));
        expect(screen.getByText(/= 1/)).toBeTruthy();

        view.rerender(createElement(InlineRoll, { notation: '1d6@4', preroll: true }));
        expect(screen.getByText(/= 4/)).toBeTruthy();
    });

    it('clears pending timers when unmounted', () => {
        vi.useFakeTimers();
        const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
        const view = render(createElement(InlineRoll, { notation: '1d6@3', animationTime: 100 }));
        fireEvent.click(screen.getByRole('button', { name: /1d6/i }));

        view.unmount();

        expect(clearSpy).toHaveBeenCalled();
    });
});
