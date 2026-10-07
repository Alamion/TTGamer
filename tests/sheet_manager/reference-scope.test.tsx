// @vitest-environment happy-dom
import { CharacterContext } from '@site/src/sheet_manager/context/CharacterContext';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import {
    CULT_ID,
    libraryDocument,
    resetLibraryStores,
    seedReferenceTypes,
} from './helpers/library';

/** Document references on the sheet stay inside the template's setting (spec 017). */

const HUNTER = { systemId: 'wod-v5', definitionId: 'hunter' };
const MORTAL = { systemId: 'wod-v5', definitionId: 'v5-character' };
const STAR_WARS = { systemId: 'star-wars-wod', definitionId: 'character' };

function template(
    target: { systemId: string; documentKind: string; settingId?: string },
    children: unknown[]
) {
    return CustomTemplateSchema.parse({
        id: 'tpl-refscope',
        name: 'References',
        schemaVersion: 3,
        ...target,
        children,
    });
}

const reference = (targetKinds: string[], multiple = false) => ({
    id: 'ally',
    type: 'reference',
    label: 'Ally',
    targetKinds,
    multiple,
});

/** Hunter, Star Wars, and V5 documents on one device; the sheet shows `hunter-1`. */
function mount(
    page: ReturnType<typeof template>,
    { current = 'hunter-1', values = {}, readOnly = false } = {}
) {
    useTemplateStore.setState({ templates: [page], quarantine: [], defaultOverrides: {} });
    const documents = [
        ...useDocumentStore.getState().documents,
        libraryDocument('hunter-1', HUNTER),
        libraryDocument('hunter-2', HUNTER),
        libraryDocument('sw-luke', STAR_WARS),
        libraryDocument('mortal-plain', MORTAL),
    ].map((document) =>
        document.id === current ? { ...document, templateValues: values } : document
    );
    useDocumentStore.setState({ documents, currentDocumentId: current });
    const view = createElement(DeclarativeSheetView, { template: page });
    return render(
        readOnly
            ? createElement(
                  CharacterContext.Provider,
                  { value: { character: null, readOnly: true } },
                  view
              )
            : view
    );
}

/** Every document the reference search offers for a query that matches all titles. */
function offered(): string[] {
    const [search] = screen.getAllByRole('searchbox');
    fireEvent.change(search!, { target: { value: '-' } });
    return screen.queryAllByRole('option').map((option) => option.textContent ?? '');
}

const hunterPage = (children: unknown[]) =>
    template({ systemId: 'wod-v5', documentKind: 'character' }, children);

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
});

beforeEach(seedReferenceTypes);

afterEach(() => {
    cleanup();
    resetLibraryStores();
    takeSheetIssues();
});

describe('reference search on the sheet (US2)', () => {
    it("offers a Hunter sheet only its setting's documents of the target kinds", () => {
        mount(hunterPage([reference(['character', 'mortal'])]));
        // The seeded mortal-1..3 belong to the user setting; sw-luke to Star Wars.
        expect(offered().sort()).toEqual(['hunter-2', 'mortal-plain']);
    });

    it("offers a user setting's page only that setting's documents", () => {
        const page = template({ systemId: 'wod-v5', documentKind: CULT_ID }, [
            reference([CULT_ID, 'mortal']),
        ]);
        mount(page, { current: 'cult-1' });
        expect(offered().sort()).toEqual(['mortal-1', 'mortal-2', 'mortal-3']);
    });

    it('offers a Star Wars page Star Wars characters only', () => {
        const page = template({ systemId: 'star-wars-wod', documentKind: 'vehicle' }, [
            reference(['character']),
        ]);
        mount(page, { current: 'sw-luke' });
        expect(screen.getByRole('searchbox', { name: 'Ally' })).toBeTruthy();
        fireEvent.change(screen.getByRole('searchbox', { name: 'Ally' }), {
            target: { value: 'hunter' },
        });
        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('scopes a reference inside a custom list entry the same way', () => {
        mount(
            hunterPage([
                {
                    id: 'allies',
                    type: 'list',
                    valueKey: 'allies',
                    title: 'Allies',
                    item: {
                        id: 'allies-item',
                        type: 'reference',
                        label: 'Ally',
                        targetKinds: ['character'],
                    },
                },
            ]),
            { values: { allies: [{ id: 'e1' }] } }
        );
        expect(offered()).toEqual(['hunter-2']);
    });
});

describe('stored references outside the setting (US3)', () => {
    const withLuke = { values: { ally: 'sw-luke' } };

    it('shows the title with a note, not an alert, and reports it once', () => {
        mount(hunterPage([reference(['character'])]), withLuke);
        expect(screen.getByText('sw-luke')).toBeTruthy();
        expect(screen.getByText('outside this setting')).toBeTruthy();
        expect(screen.queryByRole('alert')).toBeNull();
        const codes = takeSheetIssues().map(({ code }) => code);
        expect(codes.filter((code) => code === 'reference-target-out-of-scope')).toHaveLength(1);
        expect(codes).not.toContain('reference-target-missing');
    });

    it('opens and removes the linked document', () => {
        mount(hunterPage([reference(['character'], true)]), {
            values: { ally: ['sw-luke', 'hunter-2'] },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Remove sw-luke' }));
        const current = useDocumentStore.getState().documents.find(({ id }) => id === 'hunter-1')!;
        expect(current.templateValues?.ally).toEqual(['hunter-2']);
        expect(offered()).not.toContain('sw-luke');

        fireEvent.click(screen.getByRole('button', { name: 'Open hunter-2' }));
        expect(useDocumentStore.getState().currentDocumentId).toBe('hunter-2');
    });

    it('opens an out-of-scope document', () => {
        mount(hunterPage([reference(['character'])]), withLuke);
        fireEvent.click(screen.getByRole('button', { name: 'Open sw-luke' }));
        expect(useDocumentStore.getState().currentDocumentId).toBe('sw-luke');
    });

    it('keeps the note and hides remove on a read-only sheet', () => {
        mount(hunterPage([reference(['character'])]), { ...withLuke, readOnly: true });
        expect(screen.getByText('outside this setting')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Remove sw-luke' })).toBeNull();
    });

    it('still shows a deleted document as missing', () => {
        mount(hunterPage([reference(['character'])]), { values: { ally: 'doc-gone' } });
        expect(screen.getByRole('alert').textContent).toBe('Linked document no longer exists');
        expect(takeSheetIssues().map(({ code }) => code)).toContain('reference-target-missing');
    });

    it('treats a document of the setting with a kind that is no longer a target as out of scope', () => {
        mount(hunterPage([reference(['mortal'])]), { values: { ally: 'hunter-2' } });
        expect(screen.getByText('outside this setting')).toBeTruthy();
    });
});
