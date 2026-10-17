// @vitest-environment happy-dom
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** Text results, list ratings, and display conditions written as formulas (spec 038, US2). */

const disciplines = {
    id: 'disc',
    type: 'list',
    title: 'Disciplines',
    valueKey: 'disc',
    columns: 1,
    item: { id: 'disc-item', type: 'rating', label: 'Discipline', min: 0, max: 5 },
};

function mount(children: unknown[], values: Record<string, unknown>) {
    const template = CustomTemplateSchema.parse({
        id: 'formula-kit',
        name: 'Formula Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children,
    });
    useTemplateStore.setState({ templates: [template], quarantine: [] });
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-formula',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'star-wars-wod-character',
                schemaVersion: 1,
                metadata: { title: 'Kira', tags: [] },
                templateValues: values,
                data: { metadata: { name: '', type: 'sentient' } },
            } as never,
        ],
        currentDocumentId: 'doc-formula',
    });
    return render(createElement(DeclarativeSheetView, { template }));
}

const shown = (label: string) =>
    screen.getByText(label, { selector: 'span' }).parentElement!.lastElementChild!.textContent;

afterEach(() => {
    cleanup();
    takeSheetIssues();
});

describe('formula results on the page', () => {
    it('shows a text result and a rating read from a list', () => {
        mount(
            [
                disciplines,
                {
                    id: 'feeding',
                    type: 'formula',
                    label: 'Feeding',
                    formula: 'if(potency >= 3, "Animals: none", "Animals: half")',
                },
                {
                    id: 'sorcery',
                    type: 'formula',
                    label: 'Sorcery dots',
                    formula: 'rating(disc, "Blood Sorcery")',
                },
                { id: 'potency', type: 'number', label: 'Potency' },
            ],
            {
                potency: 3,
                disc: [
                    { id: 'a', label: 'Blood Sorcery', value: 2 },
                    { id: 'b', label: 'Auspex', value: 1 },
                ],
            }
        );
        expect(shown('Feeding')).toBe('Animals: none');
        expect(shown('Sorcery dots')).toBe('2');
    });
});

describe('display conditions by formula', () => {
    const card = (formula: string) => ({
        id: 'rituals',
        type: 'group',
        title: 'Rituals',
        collapsible: false,
        visibleWhen: { formula },
        children: [{ id: 'ritual-note', type: 'text', label: 'Ritual note' }],
    });

    it('shows a node while its formula is non-zero', () => {
        mount([disciplines, card('rating(disc, "Blood Sorcery") > 0')], {
            disc: [{ id: 'a', label: 'Blood Sorcery', value: 1 }],
        });
        expect(screen.queryByLabelText('Ritual note')).not.toBeNull();
    });

    it('hides it while the formula is zero or empty', () => {
        mount([disciplines, card('rating(disc, "Blood Sorcery")')], { disc: [] });
        expect(screen.queryByLabelText('Ritual note')).toBeNull();
        cleanup();
        mount([{ id: 'motto', type: 'text', label: 'Motto' }, card('motto')], { motto: '' });
        expect(screen.queryByLabelText('Ritual note')).toBeNull();
    });

    it('hides it and reports when the formula cannot be computed', () => {
        mount([card('missing + 1')], {});
        expect(screen.queryByLabelText('Ritual note')).toBeNull();
        expect(takeSheetIssues().map(({ code }) => code)).toContain('formula-error');
    });
});
