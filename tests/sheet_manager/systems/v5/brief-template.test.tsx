// @vitest-environment jsdom

import {
    hunterExampleDocument,
    TemplateFragment,
    TemplatePreview,
} from '@site/src/sheet_manager/docsEmbeds';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod/schema';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { currentHunter, hunterData, seedHunter } from './hunterFixtures';

const RENDER_TIMEOUT = 20_000;

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    Element.prototype.scrollIntoView ??= () => undefined;
});

afterEach(cleanup);

function template(id: string): CustomTemplate {
    return systemRegistry.getSystem('wod-v5')!.defaultTemplates!.find((t) => t.id === id)!;
}

describe('hunter brief view', () => {
    it(
        'shows what is rolled and tracked, and nothing for between sessions',
        () => {
            seedHunter(
                hunterData({
                    name: 'Lena Varga',
                    concept: 'Paramedic',
                    creed: 'Faithful',
                    drive: 'Atonement',
                    skills: { medicine: { value: 3, specializationText: 'Trauma' } },
                    edges: [{ id: 'e1', name: 'Sense the Unnatural', note: '' }],
                    perks: [{ id: 'p1', name: 'Range', edge: 'Sense the Unnatural', note: '' }],
                    notes: 'Secret notes',
                })
            );
            render(createElement(DeclarativeSheetView, { template: template('v5-hunter-brief') }));
            for (const label of [
                'Name',
                'Concept',
                'Creed',
                'Drive',
                'Despair',
                'Desperation',
                'Danger',
            ]) {
                expect(screen.getAllByText(label).length, label).toBeGreaterThan(0);
            }
            expect(screen.getByRole('spinbutton', { name: 'Strength' })).toBeTruthy();
            expect(screen.getByRole('spinbutton', { name: 'Medicine' })).toBeTruthy();
            expect(screen.getByText('Trauma')).toBeTruthy();
            expect(screen.getByDisplayValue('Range')).toBeTruthy();
            expect(screen.getByRole('group', { name: 'Health' })).toBeTruthy();
            expect(screen.getByRole('group', { name: 'Willpower' })).toBeTruthy();
            for (const hidden of ['Biography', 'Experience', 'Secret notes', 'Chronicle Tenets']) {
                expect(screen.queryByText(hidden), hidden).toBeNull();
            }
        },
        RENDER_TIMEOUT
    );

    it(
        'shares track marks with the full sheet',
        () => {
            seedHunter();
            const { unmount } = render(
                createElement(DeclarativeSheetView, { template: template('v5-hunter-brief') })
            );
            const willpower = screen.getByRole('group', { name: 'Willpower' });
            fireEvent.click(within(willpower).getByRole('button', { name: 'Willpower 1: empty' }));
            fireEvent.click(screen.getByRole('checkbox', { name: 'Despair' }));
            unmount();
            expect(currentHunter()).toMatchObject({
                willpower: { levels: ['slash', 'empty'] },
                despair: true,
            });

            render(createElement(DeclarativeSheetView, { template: template('v5-hunter-sheet') }));
            expect(
                within(screen.getByRole('group', { name: 'Willpower' })).getByRole('button', {
                    name: 'Willpower 1: slash',
                })
            ).toBeTruthy();
        },
        RENDER_TIMEOUT
    );
});

describe('hunter documentation embeds', () => {
    it(
        'previews the example hunter read-only without a notice of its own',
        () => {
            render(
                createElement(TemplatePreview, {
                    document: hunterExampleDocument(),
                    systemId: 'wod-v5',
                    template: 'v5-hunter-brief',
                })
            );
            expect(screen.getAllByDisplayValue('Lena Varga').length).toBeGreaterThan(0);
            for (const box of screen.getAllByRole('button', { name: /^Health \d+:/ })) {
                expect((box as HTMLButtonElement).disabled).toBe(true);
            }
            for (const input of screen.queryAllByRole('textbox')) {
                expect((input as HTMLInputElement).disabled).toBe(true);
            }
            expect(screen.queryByRole('complementary', { name: 'Publisher notice' })).toBeNull();
        },
        RENDER_TIMEOUT
    );

    it(
        'offers to create a hunter when the reader has only a Star Wars character',
        () => {
            useDocumentStore.setState({
                documents: [
                    {
                        id: 'sw',
                        kind: 'character',
                        systemId: 'star-wars-wod',
                        definitionId: 'character',
                        schemaVersion: 1,
                        metadata: { title: 'Jax', tags: [] },
                        templateValues: {},
                        data: createDefaultStarWarsCharacterData(),
                    } as never,
                ],
                currentDocumentId: 'sw',
            });
            render(
                createElement(TemplateFragment, {
                    systemId: 'wod-v5',
                    template: 'v5-hunter-sheet',
                    node: 'identity',
                })
            );
            fireEvent.click(screen.getByTitle('Create a new document'));
            const created = useDocumentStore.getState().documents.at(-1)!;
            expect([created.systemId, created.definitionId]).toEqual(['wod-v5', 'hunter']);
        },
        RENDER_TIMEOUT
    );
});
