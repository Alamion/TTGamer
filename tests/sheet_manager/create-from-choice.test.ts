// @vitest-environment happy-dom
import { readCreatePreferences } from '@site/src/sheet_manager/features/documents/createChoices';
import { createFromChoice } from '@site/src/sheet_manager/features/documents/createFromChoice';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { readDataPath } from '@site/src/sheet_manager/systems/templateBindings';
import { beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
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
