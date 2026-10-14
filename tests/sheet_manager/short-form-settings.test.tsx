// @vitest-environment happy-dom

import { ShortFormSettings } from '@site/src/sheet_manager/features/template-editor/panels/ShortFormSettings';
import {
    settingApplies,
    settingLabel,
} from '@site/src/sheet_manager/features/template-editor/settings/registry';
import type { TemplateNode } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

const rating = { id: 'luck', type: 'rating', label: 'Luck' } as unknown as TemplateNode;
const group = { id: 'g', type: 'group', title: 'G', children: [] } as unknown as TemplateNode;
const text = { id: 't', type: 'text', label: 'T' } as unknown as TemplateNode;

describe('short form settings of a rating (spec 033)', () => {
    it('apply to ratings and the game’s values, the layout to groups only', () => {
        expect(settingApplies('shortForm', rating)).toBe(true);
        expect(settingApplies('shortLabel', rating)).toBe(true);
        expect(settingApplies('shortForm', text)).toBe(false);
        expect(settingApplies('layout', group)).toBe(true);
        expect(settingApplies('layout', rating)).toBe(false);
        expect(settingLabel('shortForm')).toContain('Short label');
    });

    it('turns the short form on and shows the derived letters as the placeholder', () => {
        const onChange = vi.fn();
        const { rerender } = render(
            createElement(ShortFormSettings, { node: {}, label: 'Luck', onChange })
        );
        expect(screen.queryByRole('textbox')).toBeNull();
        fireEvent.click(screen.getByRole('checkbox'));
        expect(onChange).toHaveBeenCalledWith({ shortForm: true });
        rerender(
            createElement(ShortFormSettings, { node: { shortForm: true }, label: 'Luck', onChange })
        );
        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.placeholder).toContain('LUC');
        expect(input.maxLength).toBe(4);
    });

    it('stores the author’s letters in capitals and drops them with the switch', () => {
        const onChange = vi.fn();
        render(
            createElement(ShortFormSettings, {
                node: { shortForm: true, shortLabel: 'LCK' },
                label: 'Luck',
                onChange,
            })
        );
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'lk' } });
        expect(onChange).toHaveBeenCalledWith({ shortLabel: 'LK' });
        fireEvent.click(screen.getByRole('checkbox'));
        expect(onChange).toHaveBeenLastCalledWith({ shortForm: undefined, shortLabel: undefined });
    });
});
