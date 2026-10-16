// @vitest-environment happy-dom
import { ScoreTrack } from '@site/src/sheet_manager/components/stat-fields/ScoreTrack';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Humanity with stains: a score from the start, marks from the end, never both (spec 037 D7). */

function mount(value: number, marks: number, disabled = false) {
    const onChange = vi.fn();
    render(
        createElement(ScoreTrack, {
            label: 'Humanity',
            groupLabel: `Humanity ${value} of 10`,
            value,
            marks,
            length: 10,
            markName: 'Stain',
            refusedMessage: 'A stain goes on an empty box.',
            disabled,
            onChange,
        })
    );
    return onChange;
}

const box = (index: number) => screen.getAllByRole('button')[index - 1]!;

describe('ScoreTrack', () => {
    afterEach(cleanup);

    it('names itself with the score and draws filled and marked boxes', () => {
        mount(7, 2);
        expect(screen.getByRole('group', { name: 'Humanity 7 of 10' })).toBeTruthy();
        expect(box(7).getAttribute('data-state')).toBe('filled');
        expect(box(8).getAttribute('data-state')).toBe('empty');
        expect(box(9).getAttribute('data-state')).toBe('marked');
        expect(box(10).getAttribute('data-state')).toBe('marked');
    });

    it('sets the score by a click; clicking the last filled box lowers it by one', () => {
        const onChange = mount(7, 0);
        fireEvent.click(box(5));
        expect(onChange).toHaveBeenLastCalledWith({ value: 5, marks: 0 });
        fireEvent.click(box(7));
        expect(onChange).toHaveBeenLastCalledWith({ value: 6, marks: 0 });
    });

    it('marks from the end with S and refuses a mark on a filled box', () => {
        const onChange = mount(7, 1);
        fireEvent.keyDown(box(9), { key: 's' });
        expect(onChange).toHaveBeenLastCalledWith({ value: 7, marks: 2 });
        fireEvent.keyDown(box(10), { key: 's' });
        expect(onChange).toHaveBeenLastCalledWith({ value: 7, marks: 0 });
        onChange.mockClear();
        fireEvent.keyDown(box(6), { key: 's' });
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toBe('A stain goes on an empty box.');
    });

    it('moves the score with the arrow keys, never into marked boxes', () => {
        const onChange = mount(7, 2);
        fireEvent.keyDown(box(1), { key: 'ArrowRight' });
        expect(onChange).toHaveBeenLastCalledWith({ value: 8, marks: 2 });
        fireEvent.keyDown(box(1), { key: 'ArrowLeft' });
        expect(onChange).toHaveBeenLastCalledWith({ value: 6, marks: 2 });
        onChange.mockClear();
        cleanup();
        const full = mount(8, 2);
        fireEvent.keyDown(box(1), { key: 'ArrowRight' });
        expect(full).not.toHaveBeenCalled();
    });

    it('changes nothing when disabled', () => {
        const onChange = mount(7, 0, true);
        fireEvent.click(box(3));
        expect(onChange).not.toHaveBeenCalled();
    });
});
