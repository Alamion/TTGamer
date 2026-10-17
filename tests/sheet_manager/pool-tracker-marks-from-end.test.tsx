// @vitest-environment happy-dom
import { fitScore, markScore } from '@site/src/sheet_manager/features/sheet/data/poolTracker';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

/** A tracker with a second value marked from the end (spec 038, US4; V5 Humanity and stains). */

describe('marking rules', () => {
    it('sets the value by a fill; the last filled box lowers it', () => {
        expect(markScore({ value: 7, marks: 0 }, 10, 4, 'fill')).toEqual({ value: 5, marks: 0 });
        expect(markScore({ value: 7, marks: 0 }, 10, 6, 'fill')).toEqual({ value: 6, marks: 0 });
    });

    it('never fills over a mark', () => {
        expect(markScore({ value: 7, marks: 2 }, 10, 9, 'fill')).toEqual({ value: 8, marks: 2 });
    });

    it('marks from the end up to a box, clears down to it, and refuses a filled box', () => {
        expect(markScore({ value: 7, marks: 1 }, 10, 8, 'outline')).toEqual({ value: 7, marks: 2 });
        expect(markScore({ value: 7, marks: 2 }, 10, 9, 'outline')).toEqual({ value: 7, marks: 0 });
        expect(markScore({ value: 7, marks: 0 }, 10, 5, 'outline')).toBe('refused');
    });

    it('shrinks marks that no longer fit beside the value', () => {
        expect(fitScore({ value: 9, marks: 3 }, 10)).toEqual({ value: 9, marks: 1 });
    });
});

function mount(values: Record<string, unknown>) {
    const template = CustomTemplateSchema.parse({
        id: 'score-kit',
        name: 'Score Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            { id: 'stains', type: 'number', label: 'Stains', min: 0, max: 10 },
            {
                id: 'humanity',
                type: 'rating',
                label: 'Humanity',
                min: 0,
                max: 10,
                presentation: 'tracker',
                poolTracker: {
                    marksFromEnd: { coordinate: 'stains', mark: { name: 'Stain' } },
                },
            },
        ],
    });
    useTemplateStore.setState({ templates: [template], quarantine: [] });
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-score',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'star-wars-wod-character',
                schemaVersion: 1,
                metadata: { title: 'Kira', tags: [] },
                templateValues: values,
                data: { metadata: { name: '', type: 'sentient' } },
            } as never,
        ],
        currentDocumentId: 'doc-score',
    });
    render(createElement(DeclarativeSheetView, { template }));
}

const stored = () =>
    useDocumentStore.getState().documents[0]!.templateValues as Record<string, unknown>;
const boxes = () => within(screen.getByRole('group', { name: 'Humanity' })).getAllByRole('button');

describe('on the page', () => {
    afterEach(cleanup);

    it('draws the value and the marks and says both to a screen reader', () => {
        mount({ humanity: 7, stains: 1 });
        expect(boxes()[6]!.getAttribute('aria-label')).toBe('7: Humanity');
        expect(boxes()[9]!.getAttribute('aria-label')).toBe('10: Stain');
        expect(screen.getByText('Humanity: 7 of 10, 1 marked')).not.toBeNull();
    });

    it('marks by the outline action and keeps both values in one write', () => {
        mount({ humanity: 7, stains: 1 });
        fireEvent.contextMenu(boxes()[8]!);
        expect(stored()).toMatchObject({ humanity: 7, stains: 2 });
        fireEvent.keyDown(boxes()[7]!, { key: 'Enter', shiftKey: true });
        expect(stored()).toMatchObject({ humanity: 7, stains: 3 });
        fireEvent.click(boxes()[3]!);
        expect(stored()).toMatchObject({ humanity: 4, stains: 3 });
    });

    it('refuses a mark on a filled box with a message', () => {
        mount({ humanity: 7, stains: 0 });
        fireEvent.contextMenu(boxes()[2]!);
        expect(screen.getByRole('alert').textContent).toBe(
            'Stain goes on an empty box: lower the value first.'
        );
        expect(stored()).toMatchObject({ humanity: 7, stains: 0 });
    });
});
