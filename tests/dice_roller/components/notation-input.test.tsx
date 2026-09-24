// @vitest-environment jsdom

import NotationInput from '@site/src/dice_roller/components/dice_pool/NotationInput';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function type(value: string) {
    fireEvent.change(screen.getByRole('textbox'), { target: { value } });
    act(() => vi.advanceTimersByTime(300));
}

describe('notation input diagnostics', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useDiceRollerStore.setState({ notationInput: '' });
        render(createElement(NotationInput));
    });
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it.each([
        ['5d10>=6f', 'Add a comparison (for example, =10) after “f”', 'f'],
        ['2d6 & 1', 'Unknown character “&”', '&'],
        ['(2d10:h', 'This “(” is never closed', '('],
        ['2d10>=6:h', 'Put :h right after the dice it marks, as in 2d10:h', ':h'],
        ['3d6x3=6', 'A set bonus needs a success target such as >=6 in the same pool', 'x3'],
        ['300d6', 'Over the limit for dice: at most 200', '300d6'],
        ['2d6+', 'The notation ends too early — expected a number or dice or “(”', '‸'],
    ])('explains %s and highlights the offending span', (notation, message, marked) => {
        type(notation);
        const status = screen.getByRole('status');
        expect(status.textContent).toContain(message);
        expect(status.querySelector('mark')?.textContent).toBe(marked);
        const input = screen.getByRole('textbox');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(input.getAttribute('aria-describedby')).toBe(status.id);
    });

    it('shows nothing for valid notation and waits for typing to pause', () => {
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '2d6 &' } });
        expect(screen.getByRole('status').textContent).toBe('');
        act(() => vi.advanceTimersByTime(300));
        expect(screen.getByRole('status').textContent).not.toBe('');

        type('2d6+3');
        expect(screen.getByRole('status').textContent).toBe('');
        expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('false');
    });

    it('keeps the live message stable while the same error persists', () => {
        type('2d6 &');
        const before = screen.getByRole('status').querySelector('span')?.textContent;
        type('2d6 & ');
        expect(screen.getByRole('status').querySelector('span')?.textContent).toBe(before);
    });
});
