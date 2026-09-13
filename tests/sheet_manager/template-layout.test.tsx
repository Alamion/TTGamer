// @vitest-environment jsdom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import {
    evaluateFormula,
    parseFormula,
} from '@site/src/sheet_manager/features/sheet/declarative/formula';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod';
import { starWarsWodDefaultTemplates } from '@site/src/sheet_manager/systems/star-wars-wod/defaultTemplates';
import { resolveDocumentBinding } from '@site/src/sheet_manager/systems/templateBindings';
import {
    collectFormulaDependencies,
    CustomTemplateSchema,
} from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

type CharacterData = ReturnType<typeof createDefaultStarWarsCharacterData>;

function seed(overrides: Partial<CharacterData> = {}) {
    useDocumentStore.setState({
        documents: [
            {
                id: 'layout-doc',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'character',
                schemaVersion: 1,
                metadata: { title: 'Layout', tags: [] },
                templateValues: {},
                data: { ...createDefaultStarWarsCharacterData(), ...overrides },
            } as never,
        ],
        currentDocumentId: 'layout-doc',
    });
}

const data = () => useDocumentStore.getState().documents[0]!.data as CharacterData;

function mount(children: unknown[]) {
    const template = CustomTemplateSchema.parse({
        id: 'layout-kit',
        name: 'Layout Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children,
    });
    return render(createElement(DeclarativeSheetView, { template }));
}

describe('template layout and presentation', () => {
    beforeEach(() => seed());
    afterEach(cleanup);

    it('stacks children inside their assigned columns', () => {
        const { container } = mount([
            {
                id: 'page',
                type: 'section',
                title: 'Page',
                columns: 2,
                children: [
                    { id: 'left', type: 'group', title: 'Left', column: 1, children: [] },
                    { id: 'right-a', type: 'group', title: 'Right A', column: 2, children: [] },
                    { id: 'right-b', type: 'group', title: 'Right B', column: 2, children: [] },
                ],
            },
        ]);
        const columns = container.querySelectorAll('[data-column]');
        expect(columns).toHaveLength(2);
        expect(columns[0]!.textContent).toContain('Left');
        expect(columns[1]!.textContent).toContain('Right A');
        expect(columns[1]!.textContent).toContain('Right B');
        expect(columns[0]!.textContent).not.toContain('Right');
    });

    it('hides a group title and a field label while keeping the field accessible', () => {
        mount([
            {
                id: 'identity',
                type: 'group',
                title: 'Identity',
                hideTitle: true,
                children: [
                    {
                        id: 'field-biography',
                        type: 'text',
                        label: 'Biography',
                        valueKey: 'biography',
                        multiline: true,
                        hideLabel: true,
                        placeholder: 'Character biography...',
                    },
                ],
            },
        ]);
        expect(screen.queryByText('Identity')).toBeNull();
        const textarea = screen.getByLabelText('Biography') as HTMLTextAreaElement;
        expect(textarea.tagName).toBe('TEXTAREA');
        expect(textarea.placeholder).toBe('Character biography...');
        // Bridged to document data, not the value bag.
        fireEvent.change(textarea, { target: { value: 'Born on Corellia.' } });
        expect(data().metadata.biography).toBe('Born on Corellia.');
        expect(useDocumentStore.getState().documents[0]!.templateValues).toEqual({});
    });

    it('keeps experience valid: spent never exceeds total, available is computed', () => {
        mount([
            {
                id: 'total',
                type: 'number',
                label: 'Total XP',
                valueKey: 'experience-total',
                min: 0,
            },
            { id: 'spent', type: 'number', label: 'Spent', valueKey: 'experience-spent', min: 0 },
            {
                id: 'available',
                type: 'formula',
                label: 'Available',
                formula: 'experience-total - experience-spent',
            },
        ]);
        fireEvent.change(screen.getByLabelText('Total XP'), { target: { value: '10' } });
        fireEvent.change(screen.getByLabelText('Spent'), { target: { value: '4' } });
        expect(data().experience).toEqual({ total: 10, spent: 4 });
        expect(screen.getByText('6')).not.toBeNull();

        fireEvent.change(screen.getByLabelText('Total XP'), { target: { value: '3' } });
        expect(data().experience).toEqual({ total: 3, spent: 3 });
    });

    it('edits a pool maximum and keeps current within it', () => {
        seed({ forcePoints: { current: 4, max: 6 } });
        mount([
            {
                id: 'max-fp',
                type: 'primitive',
                bindingKey: 'resource:force-points',
                label: 'Max Force Points',
                part: 'max',
            },
        ]);
        const dots = screen.getAllByRole('radio');
        fireEvent.click(dots[1]!);
        expect(data().forcePoints).toEqual({ current: 2, max: 2 });
    });

    it('renders computed multipliers with a prefix using min/max', () => {
        seed({
            forceSkills: {
                ...createDefaultStarWarsCharacterData().forceSkills,
                Control: { value: 3, specialization: false, experienced: false, practiced: false },
                Telekinesis: {
                    value: 2,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
            },
        });
        mount([
            {
                id: 'jumping',
                type: 'formula',
                label: 'Jumping Distance',
                formula: 'max(min(control, telekinesis), 1)',
                prefix: '×',
            },
        ]);
        expect(screen.getByText('Jumping Distance').parentElement!.textContent).toContain('×2');
    });
});

describe('resource minimums, proportional columns, condition tracks, droid variant', () => {
    beforeEach(() => seed());
    afterEach(cleanup);

    it('locks resource dots below a minFrom minimum and never writes under it', () => {
        seed({
            virtues: {
                Conscience: {
                    value: 1,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
                Passion: { value: 2, specialization: false, experienced: false, practiced: false },
                'Self Control': {
                    value: 3,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
            },
            willpower: { current: 6, max: 6 },
        });
        mount([
            {
                id: 'willpower',
                type: 'primitive',
                bindingKey: 'resource:willpower',
                minFrom: 'min(passion + self-control, 10)',
            },
        ]);
        const dots = screen.getAllByRole('radio');
        fireEvent.click(dots[1]!); // try to set 2, below the minimum of 5
        expect(data().willpower?.current).toBe(5);
    });

    it('applies proportional column widths from the md breakpoint', () => {
        const { container } = mount([
            {
                id: 'body',
                type: 'section',
                title: 'Body',
                columns: 2,
                columnWidths: [2, 1],
                children: [
                    { id: 'items', type: 'group', title: 'Items', column: 1, children: [] },
                    { id: 'health', type: 'group', title: 'Health', column: 2, children: [] },
                ],
            },
        ]);
        const grid = container.querySelector('[data-column]')!.parentElement!;
        expect(grid.style.getPropertyValue('--template-columns')).toBe(
            'minmax(0, 2fr) minmax(0, 1fr)'
        );
    });

    it('renders the full health track as a table and the compact one as a single strip', () => {
        const { unmount } = mount([
            { id: 'health', type: 'primitive', bindingKey: 'track:health', hideLabel: true },
        ]);
        expect(screen.getAllByRole('columnheader').map(({ textContent }) => textContent)).toEqual([
            'Level',
            'Penalty',
            'Damage',
        ]);
        fireEvent.click(screen.getByRole('button', { name: 'Hurt: empty' }));
        expect(data().health.levels[1]).toBe('slash');
        unmount();

        mount([{ id: 'health', type: 'primitive', bindingKey: 'track:health', compact: true }]);
        expect(screen.queryByRole('table')).toBeNull();
        expect(
            screen.getByRole('group', { name: 'Health' }).querySelectorAll('button')
        ).toHaveLength(7);
    });
});

describe('droid default template', () => {
    it('drops Force content, adds free points per ability group, and uses the damage chart', () => {
        const droid = starWarsWodDefaultTemplates.find(({ id }) => id === 'droid-sheet')!;
        const json = JSON.stringify(droid);
        expect(json).not.toContain('force-skills-group');
        expect(json).not.toContain('list:forcePowers');
        expect(json).not.toContain('resource:force-points');
        for (const group of ['talents', 'skills', 'knowledges']) {
            expect(json).toContain(`"valueKey":"droid-free-${group}"`);
        }
        expect(json).toContain('track:droid-damage');
        const damage = resolveDocumentBinding('star-wars-wod', 'character', 'track:droid-damage');
        expect(damage?.kind === 'track' && damage.levels.map(({ label }) => label)).toEqual([
            'Cosmetic',
            'Light',
            'Moderate',
            'Heavy',
            'Severe',
            'Crippled',
            'Wrecked',
        ]);
    });
});

describe('formula functions', () => {
    it('parses and evaluates min/max without treating function names as coordinates', () => {
        const parsed = parseFormula('max(0, min(5 + conscience - passion, 10))');
        expect(parsed.ok && parsed.coords).toEqual(['conscience', 'passion']);
        const resolve = (path: string) => ({ conscience: 1, passion: 4 })[path];
        expect(parsed.ok && evaluateFormula(parsed.expr, resolve)).toEqual({ ok: true, value: 2 });
        expect(parseFormula('min(1, 2').ok).toBe(false);

        const template = CustomTemplateSchema.parse({
            id: 'deps-kit',
            name: 'Deps Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [{ id: 'f', type: 'formula', label: 'F', formula: 'min(wits, alertness)' }],
        });
        expect(collectFormulaDependencies(template)[0]?.reads).toEqual(['wits', 'alertness']);
    });
});
