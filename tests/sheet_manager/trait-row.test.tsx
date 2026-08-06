// @vitest-environment jsdom

import { TraitRowWithInput } from '@site/src/sheet_manager/components/TraitRow';
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

describe('TraitRowWithInput', () => {
    it('reflects specialization changes supplied by its parent', () => {
        const onChange = vi.fn();
        const view = render(
            createElement(TraitRowWithInput, {
                name: 'Blaster',
                specializationText: 'Pistols',
                value: 2,
                onSpecializationTextChange: onChange,
            })
        );

        const input = screen.getByDisplayValue('Pistols');
        fireEvent.change(input, { target: { value: 'Rifles' } });
        expect(onChange).toHaveBeenCalledWith('Rifles');

        view.rerender(
            createElement(TraitRowWithInput, {
                name: 'Blaster',
                specializationText: 'Heavy Weapons',
                value: 2,
                onSpecializationTextChange: onChange,
            })
        );
        expect(screen.getByDisplayValue('Heavy Weapons')).toBe(input);
    });
});
