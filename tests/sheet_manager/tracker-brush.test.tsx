// @vitest-environment jsdom
import { CharacterContext } from '@site/src/sheet_manager/context/CharacterContext';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** The legend as a brush (spec 019, US1). */

const LEVELS = [
    ['bruised', 'Bruised', '0'],
    ['hurt', 'Hurt', '-1'],
    ['injured', 'Injured', '-1'],
].map(([id, name, value]) => ({ id, name, value }));

const BASHING = { id: 'bashing', name: 'Bashing', symbol: '╱', fill: 'secondary' };
const LETHAL = { id: 'lethal', name: 'Lethal', symbol: '×', fill: 'error' };
const AGGRAVATED = { id: 'aggravated', name: 'Aggravated', symbol: '✱', fill: 'tertiary' };

const tracker = (id: string, label: string, extra: Record<string, unknown> = {}) => ({
    id,
    type: 'tracker',
    label,
    marks: [BASHING, LETHAL, AGGRAVATED],
    levels: LEVELS,
    columns: [{ id: 'damage', kind: 'marks', title: 'Damage' }],
    legend: true,
    ...extra,
});

function page(children: unknown[]) {
    return CustomTemplateSchema.parse({
        id: 'tpl-brush',
        name: 'Brush',
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
                id: 'doc-brush',
                kind: 'mortal',
                systemId: 'wod-v5',
                definitionId: 'v5-character',
                schemaVersion: 1,
                metadata: { title: 'Mara', tags: [] },
                templateValues: values,
                data: {},
            } as never,
        ],
        currentDocumentId: 'doc-brush',
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

const marksOf = (key = 'wounds') =>
    (
        useDocumentStore.getState().documents[0]!.templateValues?.[key] as
            | { columns: Record<string, { marks?: Record<string, string> }[]> }
            | undefined
    )?.columns.damage?.[0]?.marks ?? {};

const legendItem = (name: string, scope: HTMLElement = document.body) =>
    within(scope).getByRole('button', { name });
const pressed = (name: string, scope?: HTMLElement) =>
    legendItem(name, scope).getAttribute('aria-pressed');
const status = () => screen.getByRole('status').textContent ?? '';

beforeAll(() => {
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
});

describe('picking a brush', () => {
    it('presses one legend item at a time and says what it marks', () => {
        seed();
        render(view(page([tracker('wounds', 'Wounds')])));
        expect(pressed('Aggravated')).toBe('false');
        expect(status()).toBe('');
        fireEvent.click(legendItem('Aggravated'));
        expect(pressed('Aggravated')).toBe('true');
        expect(status()).toContain('Aggravated');
        fireEvent.click(legendItem('Bashing'));
        expect(pressed('Aggravated')).toBe('false');
        expect(pressed('Bashing')).toBe('true');
        fireEvent.click(legendItem('Bashing'));
        expect(pressed('Bashing')).toBe('false');
        expect(status()).toBe('');
    });

    it('ends on Escape while focus is in the tracker', () => {
        seed();
        render(view(page([tracker('wounds', 'Wounds')])));
        fireEvent.click(legendItem('Lethal'));
        const hurt = screen.getByRole('button', { name: 'Hurt: empty' });
        hurt.focus();
        fireEvent.keyDown(hurt, { key: 'Escape' });
        expect(pressed('Lethal')).toBe('false');
    });
});

describe('marking with a brush', () => {
    it('puts the brush mark on a box in one click and takes it off on the next', () => {
        seed({
            wounds: { tracker: 1, columns: { damage: [{ id: 'a', marks: { hurt: 'bashing' } }] } },
        });
        render(view(page([tracker('wounds', 'Wounds')])));
        fireEvent.click(legendItem('Aggravated'));
        fireEvent.click(screen.getByRole('button', { name: 'Bruised: empty' }));
        fireEvent.click(screen.getByRole('button', { name: 'Hurt: Bashing' }));
        expect(marksOf()).toEqual({ bruised: 'aggravated', hurt: 'aggravated' });
        fireEvent.click(screen.getByRole('button', { name: 'Hurt: Aggravated' }));
        expect(marksOf()).toEqual({ bruised: 'aggravated' });
    });

    it('cycles again once the brush is off', () => {
        seed();
        render(view(page([tracker('wounds', 'Wounds')])));
        fireEvent.click(legendItem('Lethal'));
        fireEvent.click(legendItem('Lethal'));
        fireEvent.click(screen.getByRole('button', { name: 'Hurt: empty' }));
        expect(marksOf()).toEqual({ hurt: 'bashing' });
    });

    it('keeps one brush per tracker on a page', () => {
        seed();
        render(view(page([tracker('wounds', 'Wounds'), tracker('stress', 'Stress')])));
        const [first, second] = screen.getAllByRole('list');
        fireEvent.click(legendItem('Lethal', first));
        expect(pressed('Lethal', first)).toBe('true');
        expect(pressed('Lethal', second)).toBe('false');
        expect(within(second!).queryAllByRole('button', { pressed: true })).toHaveLength(0);
    });

    it('makes the single item of a one-mark tracker a brush', () => {
        seed();
        render(view(page([tracker('wounds', 'Wounds', { marks: [LETHAL] })])));
        fireEvent.click(legendItem('Lethal'));
        fireEvent.click(screen.getByRole('button', { name: 'Hurt: empty' }));
        fireEvent.click(screen.getByRole('button', { name: 'Bruised: empty' }));
        fireEvent.click(screen.getByRole('button', { name: 'Hurt: Lethal' }));
        expect(marksOf()).toEqual({ bruised: 'lethal' });
    });
});

describe('where there is no brush', () => {
    it('shows plain labels on a read-only sheet', () => {
        seed();
        render(view(page([tracker('wounds', 'Wounds')]), true));
        expect(within(screen.getByRole('list')).queryAllByRole('button')).toHaveLength(0);
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('has no legend buttons with the legend off or on one line', () => {
        seed();
        render(view(page([tracker('wounds', 'Wounds', { legend: false })])));
        expect(screen.queryByRole('button', { name: 'Lethal' })).toBeNull();
        cleanup();
        render(view(page([tracker('wounds', 'Wounds', { display: 'line' })])));
        expect(screen.queryByRole('button', { name: 'Lethal' })).toBeNull();
    });

    it('ends when the brush mark is removed or changes layer', () => {
        seed();
        const { rerender } = render(view(page([tracker('wounds', 'Wounds')])));
        fireEvent.click(legendItem('Aggravated'));
        rerender(view(page([tracker('wounds', 'Wounds', { marks: [BASHING, LETHAL] })])));
        fireEvent.click(screen.getByRole('button', { name: 'Hurt: empty' }));
        expect(marksOf()).toEqual({ hurt: 'bashing' });
        // Back with the mark: the brush does not come back on its own.
        rerender(view(page([tracker('wounds', 'Wounds')])));
        expect(pressed('Aggravated')).toBe('false');

        fireEvent.click(legendItem('Lethal'));
        rerender(
            view(
                page([
                    tracker('wounds', 'Wounds', {
                        marks: [BASHING, { ...LETHAL, layer: 'outline' }, AGGRAVATED],
                    }),
                ])
            )
        );
        expect(
            within(screen.getByRole('list')).queryAllByRole('button', { pressed: true })
        ).toHaveLength(0);
    });
});
