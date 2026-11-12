// @vitest-environment happy-dom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { serializeDocumentExport } from '@site/src/sheet_manager/features/sheet/shell/documentFile';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    createDefaultDroidData,
    createDefaultStarWarsCharacterData,
    type DroidData,
    type StarWarsCharacterData,
} from '@site/src/sheet_manager/systems/star-wars-wod/schema';
import { starWarsCharacterTemplates } from '@site/src/sheet_manager/systems/star-wars-wod/templates/character';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

const virtue = (value: number) => ({ value });

function seed(definitionId: 'character' | 'droid', missing = false) {
    const data = {
        ...(definitionId === 'droid'
            ? createDefaultDroidData()
            : createDefaultStarWarsCharacterData()),
        virtues: {
            Conscience: virtue(5),
            Passion: virtue(3),
            'Self Control': virtue(5),
        },
        willpower: { current: 2, max: 7 },
        forcePoints: missing ? undefined : { current: 1, max: 3 },
        darkSideResistance: missing ? undefined : 2,
    };
    const document = systemRegistry.parseDocument({
        id: 'resource-doc',
        kind: 'character',
        systemId: 'star-wars-wod',
        definitionId,
        schemaVersion: 1,
        metadata: { title: 'Resource test', tags: [] },
        templateValues: { 'kept-custom-value': 'Remember this' },
        data,
    }).envelope;
    useDocumentStore.setState({ documents: [document], currentDocumentId: document.id });
    return document;
}

function mount(viewId: string) {
    const template = starWarsCharacterTemplates.find(({ id }) => id === viewId)!;
    return render(createElement(DeclarativeSheetView, { template }));
}

const current = () => useDocumentStore.getState().documents[0]!;
const data = () => current().data as StarWarsCharacterData | DroidData;

function field(container: HTMLElement, id: string) {
    const element = container.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
    expect(element, id).not.toBeNull();
    return within(element!);
}

afterEach(cleanup);

describe('Star Wars starting resources remain independent during play (spec 049, US1)', () => {
    it.each([
        ['full-sheet', 'character'],
        ['brief', 'character'],
        ['droid-sheet', 'droid'],
        ['droid-brief', 'droid'],
    ] as const)(
        '%s shows static Willpower and both Force resources without resource writes',
        (view, kind) => {
            const before = seed(kind);
            const { container } = mount(view);
            const willpower = field(container, 'resource-willpower');
            if (view.endsWith('brief')) {
                expect(
                    willpower
                        .getByRole('spinbutton', { name: 'Willpower' })
                        .getAttribute('aria-valuenow')
                ).toBe('7');
            } else {
                expect(willpower.getAllByRole('radio')[6]!.getAttribute('aria-checked')).toBe(
                    'true'
                );
                expect(willpower.getAllByRole('radio')[1]!.getAttribute('aria-checked')).toBe(
                    'false'
                );
            }
            expect(field(container, 'resource-force-points')).toBeTruthy();
            expect(field(container, 'resource-dark-side')).toBeTruthy();
            expect(current().data).toBe(before.data);
            expect(current().templateValues).toEqual(before.templateValues);
            if (kind === 'droid') {
                expect(container.querySelector('[data-node-id="force-skills-group"]')).toBeNull();
                expect(container.querySelector('[data-node-id="list-force-powers"]')).toBeNull();
            }
        }
    );

    it('spends and restores Force Points without changing their capacity', () => {
        seed('character');
        const { container } = mount('full-sheet');
        const force = field(container, 'resource-force-points');
        const box = (n: number) =>
            force
                .getAllByRole('button')
                .find((button) => button.getAttribute('aria-label')?.startsWith(`${n}:`))!;
        fireEvent.click(box(1));
        expect(data().forcePoints).toEqual({ current: 0, max: 3 });
        fireEvent.click(box(2));
        expect(data().forcePoints).toEqual({ current: 2, max: 3 });
    });

    it.each(['full-sheet', 'droid-sheet'])(
        '%s edits ratings below the former Virtue floors',
        (view) => {
            seed(view === 'droid-sheet' ? 'droid' : 'character');
            const { container } = mount(view);
            fireEvent.click(field(container, 'resource-willpower').getAllByRole('radio')[2]!);
            expect(data().willpower).toEqual({ current: 2, max: 3 });
            fireEvent.click(field(container, 'resource-dark-side').getAllByRole('radio')[0]!);
            expect(data().darkSideResistance).toBe(1);
            const force = field(container, 'resource-force-points');
            const firstBox = force
                .getAllByRole('button')
                .find((button) => button.getAttribute('aria-label')?.startsWith('1:'))!;
            fireEvent.contextMenu(firstBox);
            expect(data().forcePoints).toEqual({ current: 1, max: 1 });
        }
    );

    it('changing Virtues leaves independent resources untouched and survives export/import', () => {
        seed('character');
        mount('full-sheet');
        act(() => {
            useDocumentStore.getState().updateDocumentData('resource-doc', (previous) => ({
                ...(previous as StarWarsCharacterData),
                virtues: {
                    Conscience: virtue(1),
                    Passion: virtue(5),
                    'Self Control': virtue(1),
                },
            }));
        });
        expect(data().willpower).toEqual({ current: 2, max: 7 });
        expect(data().forcePoints).toEqual({ current: 1, max: 3 });
        expect(data().darkSideResistance).toBe(2);
        const imported = systemRegistry.parseDocument(
            JSON.parse(serializeDocumentExport(current()))
        ).envelope;
        expect(imported.data).toEqual(data());
        expect(imported.templateValues).toEqual({ 'kept-custom-value': 'Remember this' });
    });

    it.each(['droid-sheet', 'droid-brief'])(
        '%s does not initialize missing old resources on opening',
        (view) => {
            const before = seed('droid', true);
            const { container } = mount(view);
            expect(field(container, 'resource-force-points')).toBeTruthy();
            expect(field(container, 'resource-dark-side')).toBeTruthy();
            expect(current().data).toBe(before.data);
            expect(current().templateValues).toEqual(before.templateValues);
            expect(data().forcePoints).toBeUndefined();
            expect(data().darkSideResistance).toBeUndefined();
        }
    );
});
