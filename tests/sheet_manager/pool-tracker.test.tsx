// @vitest-environment happy-dom
import { CharacterContext } from '@site/src/sheet_manager/context/CharacterContext';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod';
import { starWarsWodDefaultTemplates } from '@site/src/sheet_manager/systems/star-wars-wod/defaultTemplates';
import { wod2eTemplates } from '@site/src/sheet_manager/systems/wod2e/templates';
import {
    CustomTemplateSchema,
    type TemplateNode,
    walkTemplateNodes,
} from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** Pool resources drawn as trackers on a page (spec 020, US3). */

type CharacterData = ReturnType<typeof createDefaultStarWarsCharacterData>;

const virtue = (value: number) => ({
    value,
    specialization: false,
    experienced: false,
    practiced: false,
});

function seed(overrides: Partial<CharacterData> = {}) {
    useDocumentStore.setState({
        documents: [
            {
                id: 'pool-doc',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'character',
                schemaVersion: 1,
                metadata: { title: 'Kira', tags: [] },
                templateValues: {},
                data: {
                    ...createDefaultStarWarsCharacterData(),
                    virtues: {
                        Conscience: virtue(1),
                        Passion: virtue(2),
                        'Self Control': virtue(3),
                    },
                    forcePoints: { current: 2, max: 3 },
                    ...overrides,
                },
            } as never,
        ],
        currentDocumentId: 'pool-doc',
    });
}

const data = () => useDocumentStore.getState().documents[0]!.data as CharacterData;

const FORCE_TRACKER = {
    id: 'force',
    type: 'primitive',
    bindingKey: 'resource:force-points',
    label: 'Force Points',
    poolTracker: {},
    maxMinFrom: 'self-control',
};

function mount(children: unknown[], readOnly = false) {
    const template = CustomTemplateSchema.parse({
        id: 'pool-kit',
        name: 'Pool Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children,
    });
    const sheet = createElement(DeclarativeSheetView, { template });
    return render(
        readOnly
            ? createElement(
                  CharacterContext.Provider,
                  { value: { character: null, readOnly: true } },
                  sheet
              )
            : sheet
    );
}

const pool = () => screen.getByRole('group', { name: 'Force Points' });
const box = (n: number) =>
    within(pool())
        .getAllByRole('button')
        .find((button) => button.getAttribute('aria-label')?.startsWith(`${n}:`))!;

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

describe('a pool drawn as a tracker', () => {
    it('draws one rating-like row: dot-sized boxes to the limit and the count', () => {
        seed();
        mount([FORCE_TRACKER]);
        const boxes = within(pool()).getAllByRole('button');
        expect(boxes).toHaveLength(10);
        expect(boxes[0]!.className).toContain('h-4');
        expect(screen.getByText('2 / 3')).toBeTruthy();
        expect(box(2).getAttribute('aria-label')).toContain('Point');
        expect(box(4).getAttribute('aria-label')).toBe('4: empty');
    });

    it('fills the current value with a click and frames the maximum with the outline action', () => {
        seed({ forcePoints: { current: 2, max: 5 } });
        mount([FORCE_TRACKER]);
        fireEvent.click(box(4));
        expect(data().forcePoints).toEqual({ current: 4, max: 5 });
        fireEvent.click(box(9));
        expect(data().forcePoints).toEqual({ current: 5, max: 5 });
        fireEvent.contextMenu(box(7));
        expect(data().forcePoints).toEqual({ current: 5, max: 7 });
        fireEvent.keyDown(box(6), { key: 'Enter', shiftKey: true });
        expect(data().forcePoints).toEqual({ current: 5, max: 6 });
    });

    it('locks the frames a minimum holds and never writes under it', () => {
        seed({ forcePoints: { current: 1, max: 5 } });
        mount([FORCE_TRACKER]);
        expect(box(3).getAttribute('aria-label')).toContain('locked');
        expect(box(3).getAttribute('title')).toContain('3');
        expect(box(4).getAttribute('aria-label')).not.toContain('locked');
        fireEvent.contextMenu(box(1));
        expect(data().forcePoints).toEqual({ current: 1, max: 3 });
    });

    it('keeps Willpower at its minimum and lets it raise the maximum', () => {
        seed({ willpower: { current: 6, max: 6 } });
        mount([
            {
                id: 'will',
                type: 'primitive',
                bindingKey: 'resource:willpower',
                label: 'Willpower',
                poolTracker: {},
                minFrom: 'min(passion + self-control, 10)',
            },
        ]);
        const willpower = screen.getByRole('group', { name: 'Willpower' });
        const at = (n: number) =>
            within(willpower)
                .getAllByRole('button')
                .find((button) => button.getAttribute('aria-label')?.startsWith(`${n}:`))!;
        expect(at(5).getAttribute('aria-label')).toContain('locked');
        fireEvent.click(at(2));
        expect(data().willpower).toEqual({ current: 5, max: 6 });
        fireEvent.click(at(9));
        expect(data().willpower).toEqual({ current: 9, max: 9 });
    });

    it('shows the same values as a dots row of the same pool', () => {
        seed();
        mount([
            FORCE_TRACKER,
            {
                id: 'force-dots',
                type: 'primitive',
                bindingKey: 'resource:force-points',
                label: 'Force dots',
            },
        ]);
        fireEvent.click(box(3));
        expect(data().forcePoints).toEqual({ current: 3, max: 3 });
        const dots = screen.getAllByRole('radio');
        expect(dots.filter((dot) => dot.getAttribute('aria-checked') === 'true')).toHaveLength(1);
        expect(screen.getByText('3 / 3')).toBeTruthy();
    });

    it('changes nothing on a read-only sheet', () => {
        seed();
        mount([FORCE_TRACKER], true);
        expect((box(4) as HTMLButtonElement).disabled).toBe(true);
        expect(fireEvent.contextMenu(box(4))).toBe(true);
        expect(data().forcePoints).toEqual({ current: 2, max: 3 });
    });

    it('caps the boxes at a maxFrom and warns when it cannot be read', () => {
        seed();
        mount([{ ...FORCE_TRACKER, maxFrom: 'conscience + 4' }]);
        expect(within(pool()).getAllByRole('button')).toHaveLength(5);
        cleanup();
        seed();
        mount([{ ...FORCE_TRACKER, maxFrom: 'no-such-value + 1' }]);
        expect(screen.getByRole('alert')).toBeTruthy();
    });
});

describe('a resource field drawn as a tracker', () => {
    const LUCK = {
        id: 'luck',
        type: 'resource',
        label: 'Luck',
        min: 1,
        max: 8,
        poolTracker: {},
    };
    const luck = () => useDocumentStore.getState().documents[0]!.templateValues?.luck;
    const at = (n: number) =>
        within(screen.getByRole('group', { name: 'Luck' }))
            .getAllByRole('button')
            .find((button) => button.getAttribute('aria-label')?.startsWith(`${n}:`))!;

    it('draws boxes up to the field maximum and writes the page value', () => {
        seed();
        mount([LUCK]);
        expect(
            within(screen.getByRole('group', { name: 'Luck' })).getAllByRole('button')
        ).toHaveLength(8);
        expect(at(1).getAttribute('aria-label')).toContain('locked');
        fireEvent.click(at(3));
        expect(luck()).toEqual({ current: 3, max: 8 });
        fireEvent.contextMenu(at(5));
        expect(luck()).toEqual({ current: 3, max: 5 });
        fireEvent.click(at(1));
        expect(luck()).toEqual({ current: 1, max: 5 });
        expect(screen.getByText('1 / 5')).toBeTruthy();
    });

    it('falls back to the numbers above twenty boxes', () => {
        seed();
        mount([{ ...LUCK, max: 30, poolTracker: undefined }]);
        expect(screen.queryByRole('group', { name: 'Luck' })).toBeNull();
    });
});

describe('the shipped Star Wars sheets', () => {
    const forceNodes = (templateId: string) => {
        const template = starWarsWodDefaultTemplates.find(({ id }) => id === templateId)!;
        const nodes: TemplateNode[] = [];
        walkTemplateNodes(template.children, (node) => {
            if (node.type === 'primitive' && node.bindingKey === 'resource:force-points') {
                nodes.push(node);
            }
        });
        return nodes;
    };

    it('draws Force Points as one tracker on the full sheet', () => {
        expect(forceNodes('full-sheet')).toEqual([
            expect.objectContaining({
                id: 'resource-force-points',
                poolTracker: { display: 'row', legend: false, total: true },
                maxMinFrom: 'self-control',
            }),
        ]);
    });

    it('keeps the compact numbers elsewhere', () => {
        const others = starWarsWodDefaultTemplates
            .filter(({ id }) => id !== 'full-sheet')
            .flatMap(({ id }) => forceNodes(id));
        expect(others.length).toBeGreaterThan(0);
        for (const node of others) {
            expect(node).toMatchObject({ compact: true });
            expect(node).not.toHaveProperty('poolTracker');
        }
    });

    it('draws WoD 2e Willpower as one tracker on the full sheet and keeps the brief compact', () => {
        const willpower = (templateId: string) => {
            const nodes: TemplateNode[] = [];
            walkTemplateNodes(
                wod2eTemplates.find(({ id }) => id === templateId)!.children,
                (node) => {
                    if (node.type === 'primitive' && node.bindingKey === 'resource:willpower') {
                        nodes.push(node);
                    }
                }
            );
            return nodes;
        };
        expect(willpower('wod2e-sheet')).toEqual([
            expect.objectContaining({
                poolTracker: { display: 'row', legend: false, total: true },
            }),
        ]);
        expect(willpower('wod2e-brief')).toEqual([expect.objectContaining({ compact: true })]);
        expect(willpower('wod2e-brief')[0]).not.toHaveProperty('poolTracker');
    });
});
