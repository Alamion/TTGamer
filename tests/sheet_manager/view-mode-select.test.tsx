// @vitest-environment jsdom
import {
    selectableViews,
    ViewModeSelect,
} from '@site/src/sheet_manager/features/sheet/shell/ViewModeSelect';
import type { DocumentDefinition } from '@site/src/sheet_manager/systems';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

/** The view mode list offers only pages the reader can actually switch to. */

const VIEWS = [
    { id: 'full-sheet', label: { id: 'full', message: 'Full sheet' } },
    { id: 'brief', label: { id: 'brief', message: 'Brief' } },
] as unknown as DocumentDefinition['views'];
const definition = { views: VIEWS } as DocumentDefinition;
const doc = (settingId?: string) => ({
    definitionId: 'wod2e-character',
    metadata: settingId ? { settingId } : {},
});

const options = () => screen.queryAllByRole('option').map(({ textContent }) => textContent);
const mount = (views: DocumentDefinition['views'], templates: { id: string; name: string }[]) =>
    render(
        createElement(ViewModeSelect, {
            views,
            value: templates[0] ? `tpl:${templates[0].id}` : 'full-sheet',
            onChangeTemplate: () => {},
            onChangeView: () => {},
            templateOptions: templates,
        })
    );

afterEach(cleanup);

describe('the view mode list', () => {
    it("drops the engine's views when the document's setting assigns its own page", () => {
        const settings = { mine: { pages: { 'wod2e-character': 'my-page' } } };
        expect(selectableViews(definition, doc('mine'), settings)).toEqual([]);
        expect(selectableViews(definition, doc('other'), settings)).toBe(VIEWS);
        expect(selectableViews(definition, doc(), settings)).toBe(VIEWS);
    });

    it('lists the setting pages only, and hides a list of one', () => {
        mount([], [{ id: 'my-page', name: 'My page' }]);
        expect(screen.queryByRole('combobox')).toBeNull();
        cleanup();
        mount(
            [],
            [
                { id: 'my-page', name: 'My page' },
                { id: 'my-brief', name: 'My brief' },
            ]
        );
        expect(options()).toEqual(['My page', 'My brief']);
    });

    it('keeps the built-in views next to custom pages without a setting page', () => {
        mount(VIEWS, [{ id: 'extra', name: 'Extra' }]);
        expect(options()).toEqual(['Full sheet', 'Brief', 'Extra']);
    });
});
