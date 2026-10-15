// @vitest-environment happy-dom

import {
    AreaLayoutContext,
    forArea,
} from '@site/src/sheet_manager/features/sheet/declarative/areaLayout';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

const template = () =>
    CustomTemplateSchema.parse({
        id: 'columns-kit',
        name: 'Columns kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'wide',
                type: 'group',
                title: 'Wide',
                collapsible: false,
                columns: 3,
                children: [
                    { id: 'a', type: 'text', label: 'Alpha', span: 3 },
                    { id: 'b', type: 'text', label: 'Beta' },
                ],
            },
        ],
    });

function draw(byArea: boolean) {
    const value = template();
    useTemplateStore.setState({ templates: [value], quarantine: [] });
    return render(
        createElement(AreaLayoutContext.Provider, {
            value: byArea,
            children: createElement(DeclarativeSheetView, { template: value }),
        })
    );
}

const gridClasses = (container: HTMLElement) =>
    [...container.querySelectorAll('div')]
        .map((node) => node.className)
        .filter((name) => name.includes('grid-cols-1') && name.includes('gap-4'))
        .join(' | ');

afterEach(cleanup);

describe('full sheet columns in a pane (spec 034, FR-007)', () => {
    it('keeps the window breakpoints outside a pane', () => {
        const { container } = draw(false);
        const classes = gridClasses(container);
        expect(classes).toContain('md:grid-cols-2 xl:grid-cols-3');
        expect(classes).not.toContain('@3xl/brief');
    });

    it('takes the columns from the width of the pane, at the same widths, inside one', () => {
        const { container } = draw(true);
        const classes = gridClasses(container);
        expect(classes).toContain('@3xl/brief:grid-cols-2 @7xl/brief:grid-cols-3');
        expect(classes).not.toMatch(/(^|\s)(md|xl):/);
        expect(container.innerHTML).toContain('@7xl/brief:col-span-3');
    });

    it('keeps the padding of the sheet from growing with the window inside a pane', () => {
        const outside = draw(false).container.querySelector('[data-template-root]')!;
        expect(outside.className).toContain('lg:p-6');
        cleanup();
        const inside = draw(true).container.querySelector('[data-template-root]')!;
        expect(inside.className).not.toContain('lg:p-6');
    });

    it('maps only the column classes', () => {
        expect(forArea('grid gap-4 md:grid-cols-2 p-2', true)).toBe(
            'grid gap-4 @3xl/brief:grid-cols-2 p-2'
        );
        expect(forArea('md:grid-cols-2', false)).toBe('md:grid-cols-2');
    });
});
