// @vitest-environment happy-dom
import { readCreatePreferences } from '@site/src/sheet_manager/features/documents/createChoices';
import {
    createFromChoice,
    CreateUnavailableError,
} from '@site/src/sheet_manager/features/documents/createFromChoice';
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { serializeDocumentExport } from '@site/src/sheet_manager/features/sheet/shell/documentFile';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { readDataPath } from '@site/src/sheet_manager/systems/templateBindings';
import { MIRELA_VOSS_DATA } from '@site/src/sheet_manager/systems/v5/modules/vampire/example';
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { setTestLocale } from '../stubs/testLocale';
import { ASHEN_ID, NOW } from './helpers/library';

beforeEach(() => {
    useDocumentStore.setState({ documents: [], entries: [], folders: [], currentDocumentId: null });
    useDocumentTypeStore.setState({ types: {}, settings: {}, defaultPages: {} });
});

const entry = (id: string) => useDocumentStore.getState().entries.find((e) => e.id === id)!;

/** Where each shipped kind keeps its name. */
const NAME_PATHS: ReadonlyArray<[systemId: string, definitionId: string, path: string[]]> = [
    ['wod-2e', 'wod2e-character', ['metadata', 'name']],
    ['star-wars-wod', 'character', ['metadata', 'name']],
    ['star-wars-wod', 'droid', ['metadata', 'name']],
    ['star-wars-wod', 'creature', ['name']],
    ['star-wars-wod', 'vehicle', ['name']],
    ['star-wars-wod', 'fodder-group', ['concept']],
    ['wod-v5', 'v5-character', ['name']],
    ['wod-v5', 'hunter', ['name']],
    ['wod-v5', 'vampire', ['name']],
];

describe('creating from a choice (spec 039, US2)', () => {
    it.each(NAME_PATHS)(
        'names a %s %s in its title and its name value',
        (systemId, definitionId, path) => {
            const created = createFromChoice(
                { systemId, definitionId },
                { name: '  Night watch ' }
            );
            expect(created.metadata.title).toBe('Night watch');
            expect(readDataPath(created.data, path)).toBe('Night watch');
            expect(entry(created.id).name).toBe('Night watch');
        }
    );

    it('keeps the default naming without a name', () => {
        const created = createFromChoice({ systemId: 'wod-v5', definitionId: 'hunter' });
        expect(created.metadata.title).toBe('');
        expect((created.data as { name: string }).name).toBe('');
        expect(useDocumentStore.getState().currentDocumentId).toBe(created.id);
    });

    it('only adds the document when it should not open', () => {
        const created = createFromChoice(
            { systemId: 'wod-v5', definitionId: 'hunter' },
            { activate: false }
        );
        expect(useDocumentStore.getState().currentDocumentId).toBeNull();
        expect(entry(created.id)).toBeTruthy();
    });

    it('places the document in the chosen folder, or the top level when it is gone', () => {
        useDocumentStore.setState({
            folders: [
                {
                    id: 'f1',
                    name: 'Campaign',
                    parentId: null,
                    rank: 1,
                    createdAt: NOW,
                    changedAt: NOW,
                    updatedAt: 0,
                },
            ],
        });
        const kept = createFromChoice(
            { systemId: 'wod-v5', definitionId: 'hunter' },
            { parentId: 'f1' }
        );
        expect(entry(kept.id).parentId).toBe('f1');
        const moved = createFromChoice(
            { systemId: 'wod-v5', definitionId: 'hunter' },
            { parentId: 'gone' }
        );
        expect(entry(moved.id).parentId).toBeNull();
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['document-folder-missing']);
    });

    it('opens a core kind of a user setting on the setting page and records it as recent', () => {
        useDocumentTypeStore.setState({
            settings: {
                [ASHEN_ID]: {
                    id: ASHEN_ID,
                    name: 'Ashen Realms',
                    systemId: 'wod-v5',
                    pages: { 'v5-character': 'tpl-ashpage1' },
                    createdAt: NOW,
                    updatedAt: NOW,
                } as never,
            },
        });
        const created = createFromChoice({
            systemId: 'wod-v5',
            definitionId: 'v5-character',
            settingId: ASHEN_ID,
        });
        expect(created.metadata).toMatchObject({ settingId: ASHEN_ID, templateId: 'tpl-ashpage1' });
        createFromChoice({ systemId: 'wod-v5', definitionId: 'vampire' });
        expect(readCreatePreferences().recent).toEqual([
            'wod-v5/vampire',
            `wod-v5/v5-character/${ASHEN_ID}`,
        ]);
    });

    it('opens a shipped kind on the page the library chose', () => {
        useDocumentTypeStore.setState({ defaultPages: { 'wod-v5:vampire': 'v5-vampire-brief' } });
        const created = createFromChoice({ systemId: 'wod-v5', definitionId: 'vampire' });
        expect(created.metadata.preferredViewId).toBe('v5-vampire-brief');
    });
});

describe('starting from an example (spec 039, US3)', () => {
    const vampire = { systemId: 'wod-v5', definitionId: 'vampire' };
    const definition = () => systemRegistry.getDocumentDefinition('wod-v5', 'vampire')!;
    afterEach(() => vi.restoreAllMocks());

    it('copies the example under a new id, named after it, with its portrait', () => {
        const copy = createFromChoice(vampire, { exampleId: 'mirela-voss::example' });
        expect(copy.id).not.toBe('mirela-voss::example');
        expect(copy.metadata.title).toBe('Mirela Voss');
        expect(copy.data).toEqual(MIRELA_VOSS_DATA);
        expect((copy.data as { metadata: { imageUrl: string } }).metadata.imageUrl).toBe(
            '/img/mirela_voss.webp'
        );
        expect(copy.metadata.preferredViewId).toBe(definition().defaultViewId);
    });

    it('keeps a typed name over the example name, in the title and the name value', () => {
        const copy = createFromChoice(vampire, {
            exampleId: 'mirela-voss::example',
            name: 'Mira',
        });
        expect(copy.metadata.title).toBe('Mira');
        expect((copy.data as { name: string }).name).toBe('Mira');
        expect((copy.data as { clan: string }).clan).toBe('Toreador');
    });

    it('makes independent copies that leave the example unchanged', () => {
        const first = createFromChoice(
            { systemId: 'wod-v5', definitionId: 'hunter' },
            { exampleId: 'lena-varga::example' }
        );
        const second = createFromChoice(
            { systemId: 'wod-v5', definitionId: 'hunter' },
            { exampleId: 'lena-varga::example' }
        );
        expect(second.id).not.toBe(first.id);
        useDocumentStore
            .getState()
            .updateDocumentData(first.id, (data) => ({ ...(data as object), name: 'Changed' }));
        const stored = (id: string) =>
            useDocumentStore.getState().documents.find((document) => document.id === id)!;
        expect((stored(first.id).data as { name: string }).name).toBe('Changed');
        expect((stored(second.id).data as { name: string }).name).toBe('Lena Varga');
        const example = systemRegistry
            .getDocumentDefinition('wod-v5', 'hunter')!
            .examples![0]!.create();
        expect((example.data as { name: string }).name).toBe('Lena Varga');
    });

    it('migrates an older example and copies its template values', () => {
        const [example] = definition().examples!;
        const original = example!.create();
        vi.spyOn(example!, 'create').mockReturnValue({
            ...original,
            schemaVersion: 0,
            templateValues: { 'night-notes': 'kept' },
        });
        const migrate = vi.spyOn(definition(), 'migrate');
        const copy = createFromChoice(vampire, { exampleId: example!.id });
        expect(migrate).toHaveBeenCalledWith(original.data, 0);
        expect(copy.templateValues).toEqual({ 'night-notes': 'kept' });
        expect(copy.schemaVersion).toBe(1);
    });

    it('refuses an example the kind does not ship', () => {
        expect(() =>
            createFromChoice(
                { systemId: 'star-wars-wod', definitionId: 'droid' },
                {
                    exampleId: 'jax-vorn::preset',
                }
            )
        ).toThrow(CreateUnavailableError);
        expect(useDocumentStore.getState().entries).toHaveLength(0);
    });
});

describe('the copied portrait on the sheet', () => {
    afterEach(() => {
        cleanup();
        setTestLocale('en');
    });

    it('loads from the Russian site base', () => {
        setTestLocale('ru');
        createFromChoice(
            { systemId: 'wod-v5', definitionId: 'vampire' },
            { exampleId: 'mirela-voss::example' }
        );
        render(createElement(CharacterSheet));
        const portrait = document.querySelector('[data-template-root] img');
        expect(portrait?.getAttribute('src')).toBe('/ru/img/mirela_voss.webp');
    });
});

describe('copying a group example with its members (spec 040, US5)', () => {
    it('copies the members first and links the group copy to the member copies', () => {
        const group = createFromChoice(
            { systemId: 'wod-v5', definitionId: 'v5-group' },
            { exampleId: 'lantern-choir::example' }
        );
        const { documents } = useDocumentStore.getState();
        const members = group.templateValues.members as string[];
        expect(members).toHaveLength(3);
        expect(members.some((id) => id.endsWith('::example'))).toBe(false);
        expect(
            members.map((id) => documents.find((document) => document.id === id)?.metadata.title)
        ).toEqual(['The thing in the pines', 'Bruno Kessel', 'Sheriff Ottilie Brandt']);
        // The group opens; its members are only added.
        expect(useDocumentStore.getState().currentDocumentId).toBe(group.id);
        expect(readCreatePreferences().recent).toEqual(['wod-v5/v5-group']);
    });

    it('makes copies that export and import back without errors (FR-010)', () => {
        createFromChoice(
            { systemId: 'wod-v5', definitionId: 'v5-group' },
            { exampleId: 'lantern-choir::example' }
        );
        for (const document of useDocumentStore.getState().documents) {
            const exported = JSON.parse(serializeDocumentExport(document));
            expect(() => systemRegistry.parseDocument(exported)).not.toThrow();
        }
    });

    it('ships Storyteller examples that parse', () => {
        const definition = systemRegistry.getDocumentDefinition('wod-v5', 'v5-storyteller')!;
        expect(definition.examples!.map(({ id }) => id)).toEqual([
            'ines-ruiz::example',
            'bruno-kessel::example',
            'yard-dogs::example',
            'pine-thing::example',
        ]);
        for (const example of definition.examples!) {
            expect(() => definition.schema.parse(example.create().data)).not.toThrow();
        }
    });
});
