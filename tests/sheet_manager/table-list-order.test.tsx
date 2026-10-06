// @vitest-environment jsdom
import { rowIndexAt } from '@site/src/sheet_manager/components/controls/RowMoveControls';
import { CharacterContext } from '@site/src/sheet_manager/context/CharacterContext';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import {
    moveItem,
    moveTableRow,
} from '@site/src/sheet_manager/features/sheet/declarative/rowOrder';
import { createDraftFromTemplate } from '@site/src/sheet_manager/features/template-editor/model/factories';
import { moveTableColumn } from '@site/src/sheet_manager/features/template-editor/model/tables';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { type CustomTemplate, CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { renderEditor, resetEditorStores } from './helpers/editor';

vi.setConfig({ testTimeout: 20_000 });

const template = (): CustomTemplate =>
    CustomTemplateSchema.parse({
        id: 'tpl-order',
        name: 'Order',
        systemId: 'wod-v5',
        documentKind: 'mortal',
        schemaVersion: 3,
        children: [
            {
                id: 'gear',
                type: 'table',
                title: 'Gear',
                columns: [
                    { id: 'item', type: 'text', label: 'Item' },
                    { id: 'qty', type: 'number', label: 'Qty' },
                ],
            },
            {
                id: 'bonds',
                type: 'list',
                valueKey: 'bonds',
                title: 'Bonds',
                item: { id: 'bond', type: 'text', label: 'Bond' },
            },
            { id: 'advantages', type: 'list', bindingKey: 'list:advantages' },
        ],
    });

function mount({ readOnly = false } = {}) {
    const page = template();
    useTemplateStore.setState({ templates: [page], quarantine: [], defaultOverrides: {} });
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-order',
                kind: 'mortal',
                systemId: 'wod-v5',
                definitionId: 'v5-character',
                schemaVersion: 1,
                metadata: { title: 'Mara', tags: [] },
                templateValues: {
                    // A gap in the keys, as left by a removed row.
                    gear: { '0': { item: 'Rope' }, '2': { item: 'Lamp' }, '3': { item: 'Map' } },
                    bonds: [
                        { id: 'b1', label: 'Ann' },
                        { id: 'b2', label: 'Ben' },
                        { id: 'b3', label: 'Cy' },
                    ],
                },
                data: {
                    advantages: [
                        { id: 'm1', points: 1, label: 'Allies' },
                        { id: 'm2', points: 2, label: 'Haven' },
                    ],
                },
            } as never,
        ],
        currentDocumentId: 'doc-order',
    });
    const view = createElement(DeclarativeSheetView, { template: page });
    return render(
        readOnly
            ? createElement(
                  CharacterContext.Provider,
                  { value: { character: null, readOnly: true } },
                  view
              )
            : view
    );
}

const doc = () => useDocumentStore.getState().documents[0]!;
const gear = () => doc().templateValues?.gear as Record<string, { item: string }>;
const bondNames = () =>
    (doc().templateValues?.bonds as Array<{ label: string }>).map(({ label }) => label);
const advantageNames = () =>
    ((doc().data as { advantages: Array<{ label: string }> }).advantages ?? []).map(
        ({ label }) => label
    );

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
});

describe('row order helpers (spec 022, R7)', () => {
    it('moves array items', () => {
        expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
        expect(moveItem(['a', 'b', 'c'], 0, 9)).toEqual(['b', 'c', 'a']);
        expect(moveItem(['a'], 3, 0)).toEqual(['a']);
    });

    it('rewrites table row keys in the new order and keeps the cells', () => {
        const rows = { '0': { item: 'Rope' }, '2': { item: 'Lamp' }, '10': { item: 'Map' } };
        expect(moveTableRow(rows, 2, 0)).toEqual({
            '0': { item: 'Map' },
            '1': { item: 'Rope' },
            '2': { item: 'Lamp' },
        });
    });

    it('finds the row under the pointer, or the nearest end', () => {
        const rects = [
            { top: 0, bottom: 20 },
            { top: 20, bottom: 40 },
            { top: 40, bottom: 60 },
        ];
        expect(rowIndexAt(rects, 30)).toBe(1);
        expect(rowIndexAt(rects, -50)).toBe(0);
        expect(rowIndexAt(rects, 500)).toBe(2);
        expect(rowIndexAt([], 10)).toBe(0);
    });
});

describe('reordering rows and entries on the sheet (spec 022, US5)', () => {
    afterEach(cleanup);

    it('moves a table row with the buttons and keeps focus on it', async () => {
        mount();
        expect(screen.queryByRole('button', { name: 'Move Rope up' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Move Map down' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Move Map up' }));
        expect(gear()).toEqual({
            '0': { item: 'Rope' },
            '1': { item: 'Map' },
            '2': { item: 'Lamp' },
        });
        await waitFor(() =>
            expect(document.activeElement?.getAttribute('aria-label')).toBe('Move Map up')
        );
    });

    it('moves a table row with Alt+arrows', () => {
        mount();
        const cell = screen.getAllByLabelText('Item')[0]!;
        fireEvent.keyDown(cell, { key: 'ArrowDown', altKey: true });
        expect(Object.values(gear()).map(({ item }) => item)).toEqual(['Lamp', 'Rope', 'Map']);
    });

    it('moves own list entries and game list entries', () => {
        mount();
        fireEvent.click(screen.getByRole('button', { name: 'Move Cy up' }));
        expect(bondNames()).toEqual(['Ann', 'Cy', 'Ben']);
        fireEvent.click(screen.getByRole('button', { name: 'Move Allies down' }));
        expect(advantageNames()).toEqual(['Haven', 'Allies']);
    });

    it('shows no move controls on a read-only document', () => {
        mount({ readOnly: true });
        expect(screen.queryByRole('button', { name: /^Move .* (up|down)$/ })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Drag to reorder' })).toBeNull();
    });
});

describe('reordering table columns in the editor (spec 022, US5)', () => {
    afterEach(cleanup);

    it('moves a column as one undo step, and values stay with their column', () => {
        const draft = createDraftFromTemplate(template());
        const moved = moveTableColumn(draft, 'gear', 1, 0);
        const table = moved.children[0];
        expect(table?.type === 'table' && table.columns.map(({ id }) => id)).toEqual([
            'qty',
            'item',
        ]);

        resetEditorStores();
        renderEditor(template());
        fireEvent.click(
            [
                ...document.querySelector('[data-outline-row="gear"]')!.querySelectorAll('button'),
            ].find((button) => !button.hasAttribute('data-drag-handle'))!
        );
        const settings = document.querySelector('[data-settings-for="gear"]') as HTMLElement;
        fireEvent.click(within(settings).getByRole('button', { name: 'Move Qty up' }));
        const headers = () =>
            [...document.querySelectorAll('[data-editor-page] thead th[scope="col"]')]
                .map((th) => th.textContent)
                .filter(Boolean);
        expect(headers()).toEqual(['Qty', 'Item']);
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(headers()).toEqual(['Item', 'Qty']);
    });
});
