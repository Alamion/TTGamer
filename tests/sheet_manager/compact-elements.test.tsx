// @vitest-environment happy-dom

import { SectionCard } from '@site/src/sheet_manager/components/sections/SectionCard';
import {
    CompactRating,
    CompactResource,
    CompactTextField,
} from '@site/src/sheet_manager/components/stat-fields/CompactSheetFields';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

describe('compact forms of a brief keep their value, label, and control (spec 033)', () => {
    it('resource: a label and two named inputs that write the pair', () => {
        const onChange = vi.fn();
        render(
            createElement(CompactResource, {
                label: 'Willpower',
                current: 3,
                maximum: 5,
                currentLabel: 'current',
                maximumLabel: 'maximum',
                disabled: false,
                onChange,
            })
        );
        expect(screen.getByText('Willpower')).toBeTruthy();
        const current = screen.getByRole('spinbutton', { name: 'Willpower: current' });
        expect((current as HTMLInputElement).value).toBe('3');
        expect(
            (screen.getByRole('spinbutton', { name: 'Willpower: maximum' }) as HTMLInputElement)
                .value
        ).toBe('5');
        fireEvent.change(current, { target: { value: '4' } });
        expect(onChange).toHaveBeenCalledWith(4, 5);
    });

    it('text field: its label over its value, editable, locked when read-only', () => {
        const onChange = vi.fn();
        const { rerender } = render(
            createElement(CompactTextField, {
                label: 'Name',
                value: 'Kessa',
                disabled: false,
                onChange,
            })
        );
        const input = screen.getByLabelText('Name') as HTMLInputElement;
        expect(input.value).toBe('Kessa');
        fireEvent.change(input, { target: { value: 'Kess' } });
        expect(onChange).toHaveBeenCalledWith('Kess');
        rerender(
            createElement(CompactTextField, {
                label: 'Name',
                value: 'Kessa',
                disabled: true,
                onChange,
            })
        );
        expect((screen.getByLabelText('Name') as HTMLInputElement).disabled).toBe(true);
    });

    it('rating: the regular and the short form name the same input and write the same value', () => {
        const onChange = vi.fn();
        const props = { label: 'Alertness', value: 2, disabled: false, onChange };
        const { rerender } = render(createElement(CompactRating, props));
        expect(screen.getByRole('spinbutton', { name: 'Alertness' })).toBeTruthy();
        rerender(createElement(CompactRating, { ...props, shortLabel: 'ALR' }));
        const input = screen.getByRole('spinbutton', { name: 'Alertness' }) as HTMLInputElement;
        expect(screen.getByText('ALR')).toBeTruthy();
        expect(input.value).toBe('2');
        fireEvent.change(input, { target: { value: '4' } });
        expect(onChange).toHaveBeenCalledWith(4);
    });

    it('rating: a read-only short form cannot be edited', () => {
        render(
            createElement(CompactRating, {
                label: 'Alertness',
                shortLabel: 'ALR',
                value: 2,
                disabled: true,
                onChange: vi.fn(),
            })
        );
        expect(
            (screen.getByRole('spinbutton', { name: 'Alertness' }) as HTMLInputElement).disabled
        ).toBe(true);
    });
});

describe('a collapsible group in the brief look', () => {
    it('keeps its heading, aria-expanded, and keyboard toggling', () => {
        render(
            createElement(SectionCard, {
                title: 'Weapons',
                storageKey: 'test-dense-weapons',
                defaultExpanded: false,
                dense: true,
                children: createElement('p', null, 'No weapons yet'),
            })
        );
        const toggle = screen.getByRole('button', { name: /Weapons/ });
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByText('No weapons yet')).toBeNull();
        fireEvent.click(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByText('No weapons yet')).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Weapons' })).toBeTruthy();
    });

    it('draws no box of its own', () => {
        const { container } = render(
            createElement(SectionCard, {
                title: 'Pools',
                dense: true,
                children: createElement('p', null, 'x'),
            })
        );
        expect(container.querySelector('section')?.className).not.toContain('border');
        expect(container.querySelector('section')?.className).not.toContain('bg-bgSurface');
    });
});
