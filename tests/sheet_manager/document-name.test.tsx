// @vitest-environment happy-dom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const SYSTEM = 'wod-2e';
const DEFINITION = 'wod2e-character';
const RENDER_TIMEOUT = 20_000;

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
});

afterEach(cleanup);

function seed(name: string, title: string) {
    const definition = systemRegistry.getDocumentDefinition(SYSTEM, DEFINITION)!;
    const data = definition.createDefault() as { metadata: { name: string } };
    data.metadata.name = name;
    useDocumentStore.setState({
        documents: [
            {
                id: 'engine-doc',
                kind: 'character',
                systemId: SYSTEM,
                definitionId: DEFINITION,
                schemaVersion: 1,
                metadata: { title, tags: [] },
                templateValues: {},
                data,
            } as unknown as UnknownDocumentEnvelope,
        ],
        currentDocumentId: 'engine-doc',
    });
}

const title = () => useDocumentStore.getState().documents[0]!.metadata.title;

function renderSheet() {
    const template = systemRegistry
        .getSystem(SYSTEM)!
        .defaultTemplates!.find(({ id }) => id === 'wod2e-sheet')!;
    render(createElement(DeclarativeSheetView, { template }));
}

describe('the name of a WoD 2e engine character', () => {
    it(
        'names the document in the list as soon as it is typed',
        () => {
            seed('', '');
            renderSheet();
            fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
                target: { value: 'Mara Voss' },
            });
            expect(title()).toBe('Mara Voss');
        },
        RENDER_TIMEOUT
    );

    it(
        'names a document whose name was typed before the list followed it',
        () => {
            seed('Ada', '');
            act(() => renderSheet());
            expect(title()).toBe('Ada');
        },
        RENDER_TIMEOUT
    );

    it(
        'keeps a title the author already set when the name field is empty',
        () => {
            seed('', 'Chronicle hero');
            act(() => renderSheet());
            expect(title()).toBe('Chronicle hero');
        },
        RENDER_TIMEOUT
    );
});
