// @vitest-environment jsdom

import { NumberInput } from '@site/src/shared/components/NumberInput';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

function Harness(props: {
    initial?: number;
    min?: number;
    max?: number;
    step?: number;
    optional?: boolean;
    onChange?: (value: number | undefined) => void;
}) {
    const [value, setValue] = useState(props.initial);
    return createElement(NumberInput, {
        value,
        min: props.min,
        max: props.max,
        step: props.step,
        optional: props.optional,
        label: 'Amount',
        className: '',
        onChange: (next) => {
            props.onChange?.(next);
            setValue(next);
        },
    });
}

const input = () => screen.getByRole('spinbutton', { name: 'Amount' }) as HTMLInputElement;

describe('NumberInput', () => {
    afterEach(cleanup);

    it('ignores letters and other non-numeric text', () => {
        const onChange = vi.fn();
        render(createElement(Harness, { initial: 3, onChange }));
        fireEvent.change(input(), { target: { value: 'abc' } });
        fireEvent.change(input(), { target: { value: '3e5' } });
        expect(input().value).toBe('3');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('accepts a sign only below-zero minimums allow, and decimals only off-integer steps', () => {
        render(createElement(Harness, { initial: 1, min: 0, step: 1 }));
        fireEvent.change(input(), { target: { value: '-1' } });
        fireEvent.change(input(), { target: { value: '1.5' } });
        expect(input().value).toBe('1');
        cleanup();

        const onChange = vi.fn();
        render(createElement(Harness, { initial: 1, onChange }));
        fireEvent.change(input(), { target: { value: '-2,5' } });
        expect(onChange).toHaveBeenLastCalledWith(-2.5);
    });

    it('steps with the arrow keys inside the bounds', () => {
        render(createElement(Harness, { initial: 4, min: 0, max: 5, step: 1 }));
        fireEvent.keyDown(input(), { key: 'ArrowUp' });
        fireEvent.keyDown(input(), { key: 'ArrowUp' });
        expect(input().value).toBe('5');
        fireEvent.keyDown(input(), { key: 'ArrowDown' });
        expect(input().value).toBe('4');
    });

    it('restores a required value when the input is left empty', () => {
        const onChange = vi.fn();
        render(createElement(Harness, { initial: 3, optional: false, onChange }));
        fireEvent.change(input(), { target: { value: '' } });
        fireEvent.blur(input());
        expect(input().value).toBe('3');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('clears an optional value', () => {
        const onChange = vi.fn();
        render(createElement(Harness, { initial: 3, onChange }));
        fireEvent.change(input(), { target: { value: '' } });
        expect(onChange).toHaveBeenLastCalledWith(undefined);
    });
});
