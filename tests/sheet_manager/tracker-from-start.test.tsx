// @vitest-environment jsdom
import { CharacterContext } from '@site/src/sheet_manager/context/CharacterContext';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** Point trackers on the sheet: runs, the outline action, and counts (spec 020, US1–US2). */

const LEVELS = Array.from({ length: 6 }, (_, index) => ({
    id: `l${index + 1}`,
    name: `Box ${index + 1}`,
    value: '',
}));
const POINT = { id: 'point', name: 'Point', symbol: '', fill: 'secondary' };
const SPENT = { id: 'spent', name: 'Spent', symbol: '×', fill: 'error' };
const MAX = { id: 'max', name: 'Maximum', symbol: '', fill: 'secondary', layer: 'outline' };

const tracker = (extra: Record<string, unknown> = {}) => ({
    id: 'points',
    type: 'tracker',
    label: 'Points',
    display: 'strip',
    marks: [POINT, SPENT, MAX],
    levels: LEVELS,
    columns: [{ id: 'pool', kind: 'marks', title: '' }],
    legend: true,
    fromStart: true,
    totalReads: 'count',
    ...extra,
});

function page(children: unknown[]) {
    return CustomTemplateSchema.parse({
        id: 'tpl-points',
        name: 'Points',
        systemId: 'wod-v5',
        documentKind: 'mortal',
        schemaVersion: 3,
        children,
    });
}

function seed(values: Record<string, unknown> = {}) {
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-points',
                kind: 'mortal',
                systemId: 'wod-v5',
                definitionId: 'v5-character',
                schemaVersion: 1,
                metadata: { title: 'Mara', tags: [] },
                templateValues: values,
                data: {},
            } as never,
        ],
        currentDocumentId: 'doc-points',
    });
}

function view(template: ReturnType<typeof page>, readOnly = false) {
    useTemplateStore.setState({ templates: [template], quarantine: [], defaultOverrides: {} });
    const sheet = createElement(DeclarativeSheetView, { template });
    return readOnly
        ? createElement(
              CharacterContext.Provider,
              { value: { character: null, readOnly: true } },
              sheet
          )
        : sheet;
}

const copyOf = () =>
    (
        useDocumentStore.getState().documents[0]!.templateValues?.points as
            | {
                  columns: Record<
                      string,
                      { marks?: Record<string, string>; outlines?: Record<string, string> }[]
                  >;
              }
            | undefined
    )?.columns.pool?.[0] ?? {};
const filled = () => Object.keys(copyOf().marks ?? {}).sort();
const framed = () => Object.keys(copyOf().outlines ?? {}).sort();
const ids = (count: number) => LEVELS.slice(0, count).map(({ id }) => id);
const box = (index: number) =>
    screen
        .getAllByRole('button')
        .find((button) => button.getAttribute('aria-label')?.startsWith(`Box ${index}:`))!;

beforeAll(() => {
    // jsdom has no PointerEvent; the long press reads `pointerType`.
    globalThis.PointerEvent ??= class extends MouseEvent {
        pointerType: string;
        constructor(type: string, init: PointerEventInit = {}) {
            super(type, init);
            this.pointerType = init.pointerType ?? '';
        }
    } as never;
    Element.prototype.scrollIntoView ??= () => undefined;
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
});

afterEach(() => {
    cleanup();
    takeSheetIssues();
    vi.useRealTimers();
});

describe('a tracker that fills from the start', () => {
    it('marks a run in one click and counts it', () => {
        seed();
        render(view(page([tracker()])));
        fireEvent.click(box(4));
        expect(filled()).toEqual(ids(4));
        expect(screen.getByText('4')).toBeTruthy();
        fireEvent.click(box(2));
        expect(filled()).toEqual(ids(2));
    });

    it('frames a run with the right click and counts "filled / framed"', () => {
        seed();
        render(view(page([tracker()])));
        fireEvent.click(box(1));
        const event = fireEvent.contextMenu(box(5));
        expect(event).toBe(false);
        expect(framed()).toEqual(ids(5));
        expect(filled()).toEqual(ids(1));
        expect(screen.getByText('1 / 5')).toBeTruthy();
    });

    it('does not use the brush on a right click', () => {
        seed();
        render(view(page([tracker()])));
        fireEvent.click(screen.getByRole('button', { name: 'Spent' }));
        fireEvent.contextMenu(box(3));
        expect(framed()).toEqual(ids(3));
        expect(filled()).toEqual([]);
    });

    it('frames with Shift+Enter and Shift+Space; plain Enter stays a fill', () => {
        seed();
        render(view(page([tracker()])));
        fireEvent.keyDown(box(3), { key: 'Enter', shiftKey: true });
        expect(framed()).toEqual(ids(3));
        fireEvent.keyDown(box(5), { key: ' ', shiftKey: true });
        expect(framed()).toEqual(ids(5));
        fireEvent.keyDown(box(4), { key: 'Enter' });
        expect(framed()).toEqual(ids(5));
        expect(filled()).toEqual([]);
    });

    it('frames on a touch long press and drops the click that ends it', () => {
        vi.useFakeTimers();
        seed();
        render(view(page([tracker()])));
        const target = box(4);
        fireEvent.pointerDown(target, { pointerType: 'touch', clientX: 10, clientY: 10 });
        act(() => vi.advanceTimersByTime(500));
        expect(framed()).toEqual(ids(4));
        fireEvent.pointerUp(box(4), { pointerType: 'touch' });
        expect(fireEvent.contextMenu(box(4))).toBe(false);
        fireEvent.click(box(4));
        expect(filled()).toEqual([]);
        expect(framed()).toEqual(ids(4));
    });

    it('cancels a long press that moves, ends early, or comes from a mouse', () => {
        vi.useFakeTimers();
        seed();
        render(view(page([tracker()])));
        fireEvent.pointerDown(box(3), { pointerType: 'touch', clientX: 10, clientY: 10 });
        fireEvent.pointerMove(box(3), { pointerType: 'touch', clientX: 25, clientY: 10 });
        act(() => vi.advanceTimersByTime(600));
        fireEvent.pointerDown(box(3), { pointerType: 'touch', clientX: 10, clientY: 10 });
        act(() => vi.advanceTimersByTime(300));
        fireEvent.pointerUp(box(3), { pointerType: 'touch' });
        act(() => vi.advanceTimersByTime(600));
        fireEvent.pointerDown(box(3), { pointerType: 'mouse', clientX: 10, clientY: 10 });
        act(() => vi.advanceTimersByTime(600));
        expect(framed()).toEqual([]);
    });

    it('leaves the browser menu alone without outline marks or on a read-only sheet', () => {
        seed();
        render(view(page([tracker({ marks: [POINT, SPENT] })])));
        expect(fireEvent.contextMenu(box(2))).toBe(true);
        fireEvent.keyDown(box(2), { key: 'Enter', shiftKey: true });
        expect(framed()).toEqual([]);
        cleanup();
        seed();
        render(view(page([tracker()]), true));
        expect(fireEvent.contextMenu(box(2))).toBe(true);
        expect(framed()).toEqual([]);
    });

    it('prints the count after the boxes on one line and per copy in a table', () => {
        seed({
            points: {
                tracker: 1,
                columns: {
                    pool: [
                        { id: 'a', marks: { l1: 'point' }, outlines: { l1: 'max', l2: 'max' } },
                        { id: 'b', marks: { l1: 'point', l2: 'point', l3: 'point' } },
                    ],
                },
            },
        });
        render(view(page([tracker({ display: 'line' })])));
        expect(screen.getByText('1 / 2')).toBeTruthy();
        cleanup();
        render(
            view(
                page([
                    tracker({
                        display: 'table',
                        columns: [{ id: 'pool', kind: 'marks', title: 'Pool', copies: { max: 2 } }],
                    }),
                ])
            )
        );
        const total = document.querySelector('[data-tracker-total]')!;
        expect(total.textContent).toContain('1 / 2');
        expect(total.textContent).toContain('3');
    });
});
