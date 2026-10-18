// @vitest-environment happy-dom

import { createEmptyDraft } from '@site/src/sheet_manager/features/template-editor/model/factories';
import { ShortFormSettings } from '@site/src/sheet_manager/features/template-editor/panels/ShortFormSettings';
import { EditorSessionContext } from '@site/src/sheet_manager/features/template-editor/session/context';
import { createEditorSession } from '@site/src/sheet_manager/features/template-editor/session/store';
import {
    settingApplies,
    settingLabel,
} from '@site/src/sheet_manager/features/template-editor/settings/registry';
import type { TemplateNode } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** A rating's label on a brief (spec 033, 041). */

afterEach(cleanup);

const rating = { id: 'luck', type: 'rating', label: 'Luck' } as unknown as TemplateNode;
const text = { id: 't', type: 'text', label: 'T' } as unknown as TemplateNode;

/** Renders inside an editing session of a brief, or of a full page. */
function onPage(brief: boolean, element: ReactNode) {
    const draft = createEmptyDraft('character');
    const session = createEditorSession(
        brief ? { ...draft, pageKind: 'brief' } : draft,
        (_, count) => String(count)
    );
    return createElement(EditorSessionContext.Provider, { value: session }, element);
}

describe('the label settings of a rating', () => {
    it('apply to ratings and the game’s values only', () => {
        expect(settingApplies('fullLabel', rating)).toBe(true);
        expect(settingApplies('shortLabel', rating)).toBe(true);
        expect(settingApplies('fullLabel', text)).toBe(false);
        expect(settingLabel('fullLabel')).toContain('Full name');
    });

    it('are offered on a brief only', () => {
        const onChange = vi.fn();
        render(
            onPage(false, createElement(ShortFormSettings, { node: {}, label: 'Luck', onChange }))
        );
        expect(screen.queryByRole('checkbox')).toBeNull();
        expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('show the derived letters by default and keep the full name on request', () => {
        const onChange = vi.fn();
        const { rerender } = render(
            onPage(true, createElement(ShortFormSettings, { node: {}, label: 'Luck', onChange }))
        );
        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.placeholder).toContain('LUC');
        expect(input.maxLength).toBe(4);
        fireEvent.click(screen.getByRole('checkbox'));
        expect(onChange).toHaveBeenCalledWith({ fullLabel: true, shortLabel: undefined });
        rerender(
            onPage(
                true,
                createElement(ShortFormSettings, {
                    node: { fullLabel: true },
                    label: 'Luck',
                    onChange,
                })
            )
        );
        expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('store the author’s letters in capitals', () => {
        const onChange = vi.fn();
        render(
            onPage(
                true,
                createElement(ShortFormSettings, {
                    node: { shortLabel: 'LCK' },
                    label: 'Luck',
                    onChange,
                })
            )
        );
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'lk' } });
        expect(onChange).toHaveBeenCalledWith({ shortLabel: 'LK' });
    });
});
