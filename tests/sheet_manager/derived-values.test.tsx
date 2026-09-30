// @vitest-environment jsdom
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** Derived values on the sheet (T-076): recomputation, display, and every error state. */

function field(id: string, label: string, type: string, extra: Record<string, unknown> = {}) {
    return { id, label, type, ...extra };
}

function page(children: unknown[]) {
    return CustomTemplateSchema.parse({
        id: 'derived-kit',
        name: 'Derived Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children,
    });
}

function mount(
    template: ReturnType<typeof page>,
    { values = {}, data = {} }: { values?: Record<string, unknown>; data?: object } = {}
) {
    useTemplateStore.setState({ templates: [template], quarantine: [] });
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-derived',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'star-wars-wod-character',
                schemaVersion: 1,
                metadata: { title: 'Kira', tags: [] },
                templateValues: values,
                data: { metadata: { name: '', type: 'sentient' }, ...data },
            } as never,
        ],
        currentDocumentId: 'doc-derived',
    });
    return render(createElement(DeclarativeSheetView, { template }));
}

const setNumber = (label: string, value: string) => {
    const input = screen.getByLabelText(label);
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
};

/** The shown result of a formula field: the text after its label. */
const shown = (label: string) =>
    screen.getByText(label, { selector: 'span' }).parentElement!.lastElementChild!.textContent;

afterEach(() => {
    cleanup();
    takeSheetIssues();
});

describe('recomputation (T-076)', () => {
    it('updates a chain of formulas from one edit, in dependency order', () => {
        // Declared out of order: the page still computes base → double → quad.
        mount(
            page([
                field('quad', 'Quad', 'formula', { formula: 'double * 2' }),
                field('double', 'Double', 'formula', { formula: 'base * 2' }),
                field('base', 'Base', 'number'),
            ]),
            { values: { base: 1 } }
        );
        expect(shown('Quad')).toBe('4');
        setNumber('Base', '5');
        expect(shown('Double')).toBe('10');
        expect(shown('Quad')).toBe('20');
        const stored = useDocumentStore.getState().documents[0]!.templateValues;
        expect(stored).toEqual({ base: 5 });
    });

    it('reads ratings, resource parts, and a shared value key', () => {
        mount(
            page([
                field('grit', 'Grit', 'rating', { max: 5, presentation: 'number' }),
                field('oath', 'Oath', 'resource', { max: 10 }),
                field('shared-a', 'Shared', 'number', { valueKey: 'shared' }),
                field('sum', 'Sum', 'formula', {
                    formula: 'grit + oath.current + oath.max + shared',
                }),
            ]),
            { values: { grit: 2, oath: { current: 3, max: 8 }, shared: 10 } }
        );
        expect(shown('Sum')).toBe('23');
        setNumber('Grit', '4');
        expect(shown('Sum')).toBe('25');
    });

    it('follows document data a formula reads', () => {
        mount(page([field('lift', 'Lift', 'formula', { formula: 'strength * 10' })]), {
            data: { attributes: { Strength: { value: 3 } } },
        });
        expect(shown('Lift')).toBe('30');
        act(() => {
            const [document] = useDocumentStore.getState().documents;
            useDocumentStore.setState({
                documents: [
                    {
                        ...document!,
                        data: {
                            ...(document!.data as object),
                            attributes: { Strength: { value: 4 } },
                        },
                    } as never,
                ],
            });
        });
        expect(shown('Lift')).toBe('40');
    });

    it('moves a rating range with its computed maximum', () => {
        mount(
            page([
                field('cap', 'Cap', 'number'),
                field('luck', 'Luck', 'rating', { max: 5, maxFrom: 'cap + 1' }),
            ]),
            { values: { cap: 2 } }
        );
        expect(screen.getAllByRole('radio', { name: /^Luck: / })).toHaveLength(3);
        setNumber('Cap', '6');
        expect(screen.getAllByRole('radio', { name: /^Luck: / })).toHaveLength(7);
    });
});

describe('display (T-076)', () => {
    it('writes the prefix and suffix around the value', () => {
        mount(
            page([
                field('speed', 'Speed', 'formula', { formula: '3 * 2', prefix: '×', suffix: ' m' }),
            ])
        );
        expect(shown('Speed')).toBe('×6 m');
    });

    it('shows min and max results', () => {
        mount(
            page([
                field('a', 'A', 'number'),
                field('best', 'Best', 'formula', { formula: 'max(a, 2)' }),
                field('capped', 'Capped', 'formula', { formula: 'min(a, 5)' }),
            ]),
            { values: { a: 9 } }
        );
        expect(shown('Best')).toBe('9');
        expect(shown('Capped')).toBe('5');
    });

    it('treats an empty field as unavailable', () => {
        mount(
            page([
                field('total', 'Total', 'formula', { formula: 'a + 1' }),
                field('a', 'A', 'number'),
            ])
        );
        expect(screen.getByRole('alert').textContent).toContain('"a"');
    });
});

describe('errors (T-076)', () => {
    const alertOf = (label: string) =>
        screen.getByText(label, { selector: 'span' }).parentElement!.querySelector('[role="alert"]')
            ?.textContent;

    it('names an unavailable value', () => {
        mount(page([field('total', 'Total', 'formula', { formula: 'missing + 1' })]));
        expect(alertOf('Total')).toBe('value "missing" is unavailable');
    });

    it('names a value that is not a number', () => {
        mount(
            page([
                field('word', 'Word', 'text'),
                field('total', 'Total', 'formula', { formula: 'word + 1' }),
            ]),
            { values: { word: 'three' } }
        );
        expect(alertOf('Total')).toBe('a referenced value is not a number');
    });

    it('names a division by zero and recovers when the divisor changes', () => {
        mount(
            page([
                field('divisor', 'Divisor', 'number'),
                field('share', 'Share', 'formula', { formula: '12 / divisor' }),
            ]),
            { values: { divisor: 0 } }
        );
        expect(alertOf('Share')).toBe('division by zero');
        setNumber('Divisor', '4');
        expect(alertOf('Share')).toBeUndefined();
        expect(shown('Share')).toBe('3');
    });

    it('names a formula that reads itself as circular', () => {
        mount(page([field('total', 'Total', 'formula', { formula: 'total + 1' })]));
        expect(alertOf('Total')).toBe('circular dependency');
    });

    it('names a circular dependency on both formulas', () => {
        mount(
            page([
                field('left', 'Left', 'formula', { formula: 'right + 1' }),
                field('right', 'Right', 'formula', { formula: 'left + 1' }),
            ])
        );
        expect(alertOf('Left')).toBe('circular dependency');
        expect(alertOf('Right')).toBe('circular dependency');
    });

    it('reports a formula that does not parse instead of showing a number', () => {
        mount(page([field('total', 'Total', 'formula', { formula: '1 +' })]));
        expect(screen.queryByText('value "" is unavailable')).toBeNull();
        expect(alertOf('Total')).toBe('the formula is not valid');
        expect(takeSheetIssues().map(({ code }) => code)).toContain('formula-error');
    });
});
