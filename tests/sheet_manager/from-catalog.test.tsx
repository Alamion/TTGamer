// @vitest-environment happy-dom
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { UserCatalogSchema } from '@site/src/sheet_manager/systems/userCatalogs';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** A text field that shows or suggests a text of a catalog entry (spec 038, US3). */

const LORE = 'c-lore0001';
const CURSE = 'c-curse001';

const relics = UserCatalogSchema.parse({
    id: 'user-catalog-relics01',
    name: 'Relics',
    owner: { rulesetId: 'wod-2e' },
    columns: [
        { id: LORE, name: 'Lore', type: 'text' },
        { id: CURSE, name: 'Curse', type: 'text' },
    ],
    entries: [
        {
            id: 'e-flute001',
            name: 'Bone Flute',
            values: { [LORE]: 'Plays the songs of the dead.', [CURSE]: 'Deafens its owner.' },
        },
    ],
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
});

const from = (extra: Record<string, unknown>) => ({
    catalogId: relics.id,
    entryFrom: 'relic',
    text: LORE,
    ...extra,
});

function mount(children: unknown[], values: Record<string, unknown>) {
    const template = CustomTemplateSchema.parse({
        id: 'from-catalog-kit',
        name: 'From Catalog Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [{ id: 'relic', type: 'text', label: 'Relic' }, ...children],
    });
    useDocumentTypeStore.setState({ catalogs: { [relics.id]: relics } });
    useTemplateStore.setState({ templates: [template], quarantine: [] });
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-from',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'star-wars-wod-character',
                schemaVersion: 1,
                metadata: { title: 'Kira', tags: [] },
                templateValues: values,
                data: { metadata: { name: 'Kira', type: 'sentient' } },
            } as never,
        ],
        currentDocumentId: 'doc-from',
    });
    return render(createElement(DeclarativeSheetView, { template }));
}

const output = (label: string) =>
    screen.getByText(label).closest('label, div')!.querySelector('output')!.textContent;

afterEach(() => {
    cleanup();
    takeSheetIssues();
});

describe('From catalog', () => {
    it('shows the entry text, read-only, and the alternative while its formula holds', () => {
        mount(
            [
                { id: 'cursed', type: 'toggle', label: 'Cursed' },
                {
                    id: 'lore',
                    type: 'text',
                    label: 'Lore',
                    fromCatalog: from({
                        mode: 'show',
                        alternative: { text: CURSE, when: 'cursed' },
                    }),
                },
            ],
            { relic: 'bone flute' }
        );
        expect(output('Lore')).toBe('Plays the songs of the dead.');
        expect(screen.queryByRole('textbox', { name: 'Lore' })).toBeNull();
        cleanup();
        mount(
            [
                { id: 'cursed', type: 'toggle', label: 'Cursed' },
                {
                    id: 'lore',
                    type: 'text',
                    label: 'Lore',
                    fromCatalog: from({
                        mode: 'show',
                        alternative: { text: CURSE, when: 'cursed' },
                    }),
                },
            ],
            { relic: 'Bone Flute', cursed: true }
        );
        expect(output('Lore')).toBe('Deafens its owner.');
    });

    it('suggests the text until the reader writes their own', () => {
        mount([{ id: 'note', type: 'text', label: 'Note', fromCatalog: from({}) }], {
            relic: 'Bone Flute',
        });
        const note = screen.getByLabelText('Note') as HTMLInputElement;
        expect(note.placeholder).toBe('Plays the songs of the dead.');
        fireEvent.change(note, { target: { value: 'Mine now' } });
        fireEvent.blur(note);
        expect(
            (useDocumentStore.getState().documents[0]!.templateValues as Record<string, unknown>)
                .note
        ).toBe('Mine now');
    });

    it('shows nothing when no entry has the name', () => {
        mount(
            [
                { id: 'note', type: 'text', label: 'Note', fromCatalog: from({}) },
                { id: 'lore', type: 'text', label: 'Lore', fromCatalog: from({ mode: 'show' }) },
            ],
            { relic: 'Whistle' }
        );
        expect((screen.getByLabelText('Note') as HTMLInputElement).placeholder).toBe('');
        expect(output('Lore')).toBe('—');
    });

    it('loads a long text on demand', async () => {
        mount(
            [
                {
                    id: 'bane',
                    type: 'text',
                    label: 'Bane',
                    fromCatalog: {
                        catalogId: 'v5-vampire-clans',
                        entryFrom: 'relic',
                        text: 'bane',
                        mode: 'show',
                    },
                },
            ],
            { relic: 'Brujah' }
        );
        expect(await screen.findByText(/fury barely stays contained/)).not.toBeNull();
    });
});
