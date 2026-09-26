import { newDocumentPage } from '@site/src/sheet_manager/features/sheet/data/libraryPages';
import {
    buildLibraryTree,
    countDocuments,
    filterTree,
    findNode,
    flattenVisible,
    type LibraryInput,
    type PageNode,
    type RulesetNode,
    type TypeNode,
} from '@site/src/sheet_manager/features/sheet/data/libraryTree';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { UserSetting } from '@site/src/sheet_manager/systems/userTypes';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import {
    ASHEN_ID,
    ASHEN_MORTAL_PAGE_ID,
    CULT_ID,
    CULT_PAGE_ID,
    libraryPage,
    ORG_ID,
    resetLibraryStores,
    seedLibrary,
    userSetting,
    userType,
} from './helpers/library';

function input(overrides: Partial<LibraryInput> = {}): LibraryInput {
    const { types, settings, defaultPages } = useDocumentTypeStore.getState();
    const { templates, defaultOverrides } = useTemplateStore.getState();
    return {
        registry: systemRegistry,
        types,
        settings,
        templates,
        defaultOverrides,
        defaultPages,
        counts: countDocuments(useDocumentStore.getState().documents),
        ...overrides,
    };
}

const names = (nodes: readonly { name: string }[]) => nodes.map(({ name }) => name);
const node = (tree: RulesetNode[], key: string) => findNode(tree, key)?.node;

describe('library tree (spec 013)', () => {
    beforeEach(seedLibrary);
    afterEach(resetLibraryStores);

    it('groups rulesets, then settings in their fixed order', () => {
        const tree = buildLibraryTree(input());
        expect(tree.map(({ key }) => key)).toEqual(['r:wod-2e', 'r:wod-v5']);
        const [wod2e, v5] = tree;
        expect(wod2e!.settings.map(({ key }) => key)).toEqual([
            's:rules:wod-2e',
            's:system:star-wars-wod',
        ]);
        expect(v5!.settings.map(({ key }) => key)).toEqual([
            's:rules:wod-v5',
            's:module:wod-v5:hunter',
            `s:user:${ASHEN_ID}`,
        ]);
        expect(v5!.settings[2]).toMatchObject({ name: 'Ashen Realms', ownership: 'user' });
    });

    it('places core characters, user types, and their pages', () => {
        const tree = buildLibraryTree(input());
        const ashen = findNode(tree, `s:user:${ASHEN_ID}`)!.node as { types: TypeNode[] };
        expect(ashen.types.map(({ key }) => key)).toEqual([
            `t:core:${ASHEN_ID}:v5-character`,
            `t:user:${CULT_ID}`,
        ]);
        const [mortal, cult] = ashen.types;
        expect(mortal).toMatchObject({ ownership: 'shipped', documentCount: 3 });
        expect(mortal!.pages.map(({ key }) => key)).toEqual([`p:user:${ASHEN_MORTAL_PAGE_ID}`]);
        expect(mortal!.pages[0]!.isDefault).toBe(true);
        expect(cult).toMatchObject({ ownership: 'user', documentCount: 1 });
        expect(cult!.defaultPageKey).toBe(`p:user:${CULT_PAGE_ID}`);

        const starWars = findNode(tree, 's:system:star-wars-wod')!.node as { types: TypeNode[] };
        expect(starWars.types.at(-1)).toMatchObject({ key: `t:user:${ORG_ID}`, documentCount: 1 });
        const rulesOnly = findNode(tree, 's:rules:wod-v5')!.node as { types: TypeNode[] };
        expect(names(rulesOnly.types[0]!.pages)).toHaveLength(2);
    });

    it('flags edited shipped pages and the default page', () => {
        const tree = buildLibraryTree(input());
        const full = node(tree, 'p:star-wars-wod:full-sheet') as PageNode;
        expect(full.ref).toMatchObject({ kind: 'shipped', edited: true });
        expect(full.name).toBe('Edited full sheet');
        expect(full.isDefault).toBe(true);
        const brief = node(tree, 'p:star-wars-wod:brief') as PageNode;
        expect(brief.ref).toMatchObject({ edited: false });
        expect(brief.isDefault).toBe(false);
    });

    it('sums document counts up the tree', () => {
        const tree = buildLibraryTree(input());
        expect(node(tree, `s:user:${ASHEN_ID}`)?.documentCount).toBe(4);
        expect(node(tree, 'r:wod-v5')?.documentCount).toBe(4);
        expect(node(tree, 'r:wod-2e')?.documentCount).toBe(1);
    });

    it('marks types without pages with their fallback', () => {
        useDocumentTypeStore.setState({
            types: {
                ...useDocumentTypeStore.getState().types,
                'user-ship0001': userType({
                    id: 'user-ship0001',
                    name: 'Ship',
                    defaultTemplateId: undefined,
                }),
            },
            settings: {
                ...useDocumentTypeStore.getState().settings,
                'user-setting-mist0001': userSetting({
                    id: 'user-setting-mist0001',
                    name: 'Misty Archipelago',
                    systemId: 'wod-2e' as UserSetting['systemId'],
                    pages: {},
                }),
            },
        });
        const tree = buildLibraryTree(input());
        expect(node(tree, 't:user:user-ship0001')).toMatchObject({ fallback: 'stored-values' });
        expect(node(tree, 't:core:user-setting-mist0001:wod2e-character')).toMatchObject({
            fallback: 'rules-only',
            pages: [],
        });
    });

    it('filters by search and ownership, keeping ancestors', () => {
        const tree = buildLibraryTree(input());
        const found = filterTree(tree, { query: 'cult', filter: 'all' });
        expect(found.map(({ key }) => key)).toEqual(['r:wod-v5']);
        expect(names(found[0]!.settings)).toEqual(['Ashen Realms']);
        expect(names(found[0]!.settings[0]!.types)).toEqual(['Cult']);

        const edited = filterTree(tree, { query: '', filter: 'edited' });
        expect(edited.map(({ key }) => key)).toEqual(['r:wod-2e']);
        expect(edited[0]!.settings[0]!.types[0]!.pages.map(({ key }) => key)).toEqual([
            'p:star-wars-wod:full-sheet',
        ]);

        const yours = filterTree(tree, { query: '', filter: 'yours' });
        const v5 = yours.find(({ key }) => key === 'r:wod-v5')!;
        expect(v5.settings.map(({ key }) => key)).toEqual([`s:user:${ASHEN_ID}`]);
        expect(filterTree(tree, { query: 'no such thing', filter: 'all' })).toEqual([]);
    });

    it('flattens only expanded branches', () => {
        const tree = buildLibraryTree(input());
        const rows = flattenVisible(tree, new Set(['r:wod-v5']));
        expect(rows.map(({ node: row }) => row.key)).toEqual([
            'r:wod-2e',
            'r:wod-v5',
            's:rules:wod-v5',
            's:module:wod-v5:hunter',
            `s:user:${ASHEN_ID}`,
        ]);
        expect(rows[2]).toMatchObject({ depth: 2, parentKey: 'r:wod-v5' });
    });

    it('keeps settings on an unknown ruleset and orphaned types in an unavailable group', () => {
        useDocumentTypeStore.setState({
            settings: {
                ...useDocumentTypeStore.getState().settings,
                'user-setting-gone0001': userSetting({
                    id: 'user-setting-gone0001',
                    name: 'Far Future',
                    systemId: 'wod-9e' as UserSetting['systemId'],
                }),
            },
            types: {
                ...useDocumentTypeStore.getState().types,
                'user-lost0001': userType({
                    id: 'user-lost0001',
                    name: 'Lost',
                    owner: { settingId: 'user-setting-none0001' },
                    defaultTemplateId: undefined,
                }),
            },
        });
        const tree = buildLibraryTree(input());
        const unavailable = tree.at(-1)!;
        expect(unavailable).toMatchObject({ key: 'r:unavailable', unavailable: true });
        expect(names(unavailable.settings)).toContain('Far Future');
        expect(node(tree, 't:user:user-lost0001')).toMatchObject({ unavailable: true });
        expect(takeSheetIssues().map(({ code }) => code)).toContain('library-placement');
    });

    it('builds 300 pages quickly (SC-007 guard)', () => {
        const pages = Array.from({ length: 300 }, (_, index) =>
            libraryPage(`tpl-bulk${String(index).padStart(4, '0')}`, {
                systemId: 'wod-v5',
                documentKind: CULT_ID,
                settingId: ASHEN_ID,
            })
        );
        const started = performance.now();
        buildLibraryTree(
            input({ templates: [...useTemplateStore.getState().templates, ...pages] })
        );
        expect(performance.now() - started).toBeLessThan(100);
    });

    it('picks the page of new documents', () => {
        const state = { templates: useTemplateStore.getState().templates, defaultPages: {} };
        expect(newDocumentPage(systemRegistry, 'wod-v5', CULT_ID, ASHEN_ID, state)).toEqual({});
        expect(newDocumentPage(systemRegistry, 'wod-v5', 'v5-character', ASHEN_ID, state)).toEqual(
            {}
        );
        expect(
            newDocumentPage(systemRegistry, 'star-wars-wod', 'character', undefined, state)
        ).toEqual({});
        expect(
            newDocumentPage(systemRegistry, 'star-wars-wod', 'character', undefined, {
                ...state,
                defaultPages: { 'star-wars-wod:character': 'brief' },
            })
        ).toEqual({ preferredViewId: 'brief' });
        const pilot = libraryPage('tpl-pilot001', {
            systemId: 'star-wars-wod',
            documentKind: 'character',
        });
        expect(
            newDocumentPage(systemRegistry, 'star-wars-wod', 'character', undefined, {
                templates: [pilot],
                defaultPages: { 'star-wars-wod:character': 'tpl-pilot001' },
            })
        ).toEqual({ templateId: 'tpl-pilot001' });
        expect(
            newDocumentPage(systemRegistry, 'star-wars-wod', 'character', undefined, {
                templates: [],
                defaultPages: { 'star-wars-wod:character': 'tpl-gone0001' },
            })
        ).toEqual({});
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['template-fallback']);
    });
});
