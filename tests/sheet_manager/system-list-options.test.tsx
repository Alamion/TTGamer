// @vitest-environment happy-dom
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    createV5StorytellerDefault,
    type V5StorytellerData,
} from '@site/src/sheet_manager/systems/v5/core/storyteller';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

/** Bound trait lists: a maximum, a number look, and suggestions from several catalogs (spec 040). */

const RENDER_TIMEOUT = 40_000;

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    Element.prototype.scrollIntoView ??= () => undefined;
});

afterEach(cleanup);

function mount(data: Partial<V5StorytellerData>) {
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-st',
                kind: 'storyteller',
                systemId: 'wod-v5',
                definitionId: 'v5-storyteller',
                schemaVersion: 1,
                metadata: { title: 'NPC', tags: [] },
                templateValues: {},
                data: { ...createV5StorytellerDefault(), ...data },
            } as never,
        ],
        currentDocumentId: 'doc-st',
    });
    const template = systemRegistry
        .getSystem('wod-v5')!
        .defaultTemplates!.find(({ id }) => id === 'v5-storyteller-sheet')!;
    render(createElement(DeclarativeSheetView, { template }));
}

const stored = () => useDocumentStore.getState().documents[0]!.data as V5StorytellerData;
const options = () => screen.queryAllByRole('option').map((option) => option.textContent);

describe('bound trait list options', () => {
    it(
        'keeps a number entry within its maximum of 15',
        () => {
            mount({ exceptional: [{ id: 'e1', name: 'Firearms', value: 5 }] });
            const value = screen.getByRole('spinbutton', { name: 'Firearms' });
            fireEvent.change(value, { target: { value: '22' } });
            fireEvent.blur(value);
            expect(stored().exceptional[0]!.value).toBe(15);
        },
        RENDER_TIMEOUT
    );

    it(
        'suggests entries of both catalogs and keeps a name of one’s own',
        () => {
            mount({ powers: [{ id: 'p1', name: '', value: 1 }] });
            const name = screen.getByRole('textbox', { name: 'Discipline, Edge, or power' });
            fireEvent.change(name, { target: { value: 'anim' } });
            expect(options()).toContain('Animalism');
            fireEvent.change(name, { target: { value: 'arsen' } });
            expect(options()).toContain('Arsenal');
            fireEvent.change(name, { target: { value: 'Claws of the wolf' } });
            expect(stored().powers[0]!.name).toBe('Claws of the wolf');
        },
        RENDER_TIMEOUT
    );
});
