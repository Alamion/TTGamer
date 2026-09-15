// @vitest-environment jsdom

import {
    hasMarks,
    isDefeated,
    memberPenalty,
    nextMemberLabel,
    shorteningHidesMarks,
    shortenMarks,
    toggleMark,
} from '@site/src/sheet_manager/features/sheet/declarative/cohort';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    createDefaultFodderData,
    createDefaultVehicleData,
    type FodderData,
} from '@site/src/sheet_manager/systems/star-wars-wod/schema';
import type { ConditionMark } from '@site/src/sheet_manager/types/character';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

const EMPTY: ConditionMark[] = ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'];

function template(id: string) {
    return systemRegistry.getSystem('star-wars-wod')!.defaultTemplates!.find((t) => t.id === id)!;
}

function seed(data: unknown, kind: string, definitionId: string) {
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-cohort',
                kind,
                systemId: 'star-wars-wod',
                definitionId,
                schemaVersion: 1,
                metadata: { title: 'Squad', tags: [] },
                templateValues: {},
                data,
            } as never,
        ],
        currentDocumentId: 'doc-cohort',
    });
}

const storedData = () => useDocumentStore.getState().documents[0]!.data as FodderData;

function trackOnly(id: string, node = 'damage-track') {
    const source = template(id);
    const found: typeof source.children = [];
    const walk = (nodes: typeof source.children) => {
        for (const child of nodes) {
            if (child.id === node) found.push(child);
            if (child.type === 'section' || child.type === 'group') walk(child.children);
        }
    };
    walk(source.children);
    return { ...source, children: found };
}

describe('member track rules (feature 007)', () => {
    it('letters members, skipping used letters', () => {
        expect(nextMemberLabel([])).toBe('A');
        expect(nextMemberLabel(['A', 'C'])).toBe('B');
    });

    it('computes penalty and defeat against the visible length', () => {
        const marks: ConditionMark[] = ['slash', 'cross', 'empty', ...EMPTY.slice(3)];
        expect(memberPenalty(marks, [-1, -2, null])).toBe(-2);
        expect(memberPenalty(EMPTY, [-1, -2, null])).toBe(0);
        expect(isDefeated(['slash', 'slash', 'cross', ...EMPTY.slice(3)], 3)).toBe(true);
        expect(isDefeated(['slash', 'slash', 'cross', ...EMPTY.slice(3)], 7)).toBe(false);
        expect(hasMarks(EMPTY)).toBe(false);
    });

    it('collapses hidden marks into the last visible level when shortening', () => {
        const marks: ConditionMark[] = [
            'slash',
            'slash',
            'empty',
            'empty',
            'cross',
            'empty',
            'empty',
        ];
        expect(shorteningHidesMarks(marks, 3)).toBe(true);
        expect(shortenMarks(marks, 3)).toEqual([
            'slash',
            'slash',
            'cross',
            'empty',
            'empty',
            'empty',
            'empty',
        ]);
        expect(shorteningHidesMarks(['slash', ...EMPTY.slice(1)], 3)).toBe(false);
        expect(toggleMark(EMPTY, 0)[0]).toBe('slash');
        expect(toggleMark(['cross', ...EMPTY.slice(1)], 0)[0]).toBe('empty');
    });
});

describe('member track element (feature 007)', () => {
    afterEach(cleanup);

    it('shows a new fodder group with a three-level track and grows to twelve members', () => {
        seed(createDefaultFodderData(), 'group', 'fodder-group');
        render(createElement(DeclarativeSheetView, { template: trackOnly('fodder-sheet') }));
        expect(screen.getByText('Hurt')).toBeTruthy();
        expect(screen.getByText('Incapacitated')).toBeTruthy();
        expect(screen.queryByText('Bruised')).toBeNull();
        const add = screen.getByRole('button', { name: 'Add member' });
        for (let index = 0; index < 13; index += 1) fireEvent.click(add);
        expect(storedData().members).toHaveLength(12);
        expect(
            storedData()
                .members.map(({ label }) => label)
                .slice(0, 3)
        ).toEqual(['A', 'B', 'C']);
        expect(screen.getByRole('alert').textContent).toContain('12');
    });

    it('asks before removing a damaged member and marks defeated members', () => {
        const data = createDefaultFodderData();
        data.members = [
            { id: 'a', label: 'A', health: { levels: [...EMPTY] } },
            {
                id: 'b',
                label: 'B',
                health: { levels: ['slash', 'slash', 'cross', ...EMPTY.slice(3)] },
            },
        ];
        seed(data, 'group', 'fodder-group');
        render(createElement(DeclarativeSheetView, { template: trackOnly('fodder-sheet') }));
        expect(screen.getByTitle('Out of the fight')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Remove member A' }));
        expect(storedData().members.map(({ id }) => id)).toEqual(['b']);

        cleanup();
        seed({ ...data }, 'group', 'fodder-group');
        render(createElement(DeclarativeSheetView, { template: trackOnly('fodder-sheet') }));
        fireEvent.click(screen.getByRole('button', { name: 'Remove member B' }));
        expect(storedData().members).toHaveLength(2);
        const dialog = screen.getByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));
        expect(storedData().members.map(({ id }) => id)).toEqual(['a']);
    });

    it('confirms before shortening a track that hides marks', () => {
        const data = { ...createDefaultFodderData(), trackLength: 7 as const };
        data.members = [
            {
                id: 'a',
                label: 'A',
                health: { levels: ['slash', 'slash', 'slash', 'slash', 'cross', 'empty', 'empty'] },
            },
        ];
        seed(data, 'group', 'fodder-group');
        render(createElement(DeclarativeSheetView, { template: trackOnly('fodder-sheet') }));
        // 7 → 5 hides no marks; 5 → 3 would, so it asks first.
        fireEvent.click(screen.getByRole('button', { name: /^Shorten/ }));
        expect(storedData().trackLength).toBe(5);
        fireEvent.click(screen.getByRole('button', { name: /^Shorten/ }));
        expect(storedData().trackLength).toBe(5);
        fireEvent.click(
            within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' })
        );
        expect(storedData().trackLength).toBe(3);
        expect(storedData().members[0]?.health.levels.slice(0, 3)).toEqual([
            'slash',
            'slash',
            'cross',
        ]);
    });

    it('renders vehicle damage levels per squadron member in the brief strip', () => {
        const data = createDefaultVehicleData();
        data.members = [
            { id: 'a', label: 'A', damage: { levels: [...EMPTY] } },
            { id: 'b', label: 'B', damage: { levels: [...EMPTY] } },
        ];
        seed(data, 'vehicle', 'vehicle');
        render(createElement(DeclarativeSheetView, { template: trackOnly('vehicle-brief') }));
        expect(screen.getAllByText(/^[AB]$/).length).toBeGreaterThanOrEqual(2);
    });
});

describe('member track performance (feature 007)', () => {
    afterEach(cleanup);

    it('renders a 24-member squadron and applies one mark as a single store update', () => {
        const data = createDefaultVehicleData();
        data.members = Array.from({ length: 24 }, (_, index) => ({
            id: `m${index}`,
            label: String.fromCharCode(65 + index),
            damage: { levels: [...EMPTY] },
        }));
        seed(data, 'vehicle', 'vehicle');
        const started = performance.now();
        render(createElement(DeclarativeSheetView, { template: trackOnly('vehicle-sheet') }));
        const renderMs = performance.now() - started;

        let updates = 0;
        const unsubscribe = useDocumentStore.subscribe(() => {
            updates += 1;
        });
        fireEvent.click(screen.getByRole('button', { name: 'Member X — Light: empty' }));
        unsubscribe();

        expect(updates).toBe(1);
        const stored = useDocumentStore.getState().documents[0]!.data as {
            members: Array<{ damage: { levels: string[] } }>;
        };
        expect(stored.members[23]?.damage.levels[1]).toBe('slash');
        // Generous budget for jsdom under a parallel suite; catches accidental quadratic work.
        expect(renderMs).toBeLessThan(5_000);
    });
});
