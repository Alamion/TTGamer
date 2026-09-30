import {
    applyLibraryWrites,
    deletePlan,
    readLibraryState,
} from '@site/src/sheet_manager/features/sheet/data/libraryActions';
import {
    canMove,
    moveTargets,
    planMove,
} from '@site/src/sheet_manager/features/sheet/data/libraryMoves';
import {
    buildLibraryTree,
    countDocuments,
    findNode,
} from '@site/src/sheet_manager/features/sheet/data/libraryTree';
import { planTemplateRetarget } from '@site/src/sheet_manager/features/sheet/data/templateRetarget';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { UserDocumentType, UserSetting } from '@site/src/sheet_manager/systems/userTypes';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    ASHEN_ID,
    ASHEN_MORTAL_PAGE_ID,
    CULT_ID,
    CULT_PAGE_ID,
    FIREARMS_ID,
    ORG_ID,
    ORG_PAGE_ID,
    RELICS_ID,
    resetLibraryStores,
    seedLibrary,
    userSetting,
    userType,
} from './helpers/library';

const MIST_ID = 'user-setting-mist0001';

function tree() {
    const { types, settings, defaultPages, catalogs } = useDocumentTypeStore.getState();
    const { templates, defaultOverrides } = useTemplateStore.getState();
    return buildLibraryTree({
        registry: systemRegistry,
        types,
        settings,
        catalogs,
        templates,
        defaultOverrides,
        defaultPages,
        counts: countDocuments(useDocumentStore.getState().documents),
    });
}

const plan = (subject: string, target: string) =>
    planMove(subject, target, tree(), readLibraryState(), systemRegistry);

const doc = (id: string) => useDocumentStore.getState().documents.find((d) => d.id === id)!;
const template = (id: string) => useTemplateStore.getState().templates.find((t) => t.id === id);

describe('library moves (spec 013)', () => {
    beforeEach(() => {
        seedLibrary();
        useDocumentTypeStore.setState((state) => ({
            settings: {
                ...state.settings,
                [MIST_ID]: userSetting({
                    id: MIST_ID,
                    name: 'Misty Archipelago',
                    systemId: 'wod-2e' as UserSetting['systemId'],
                    pages: {},
                }),
            },
        }));
    });
    afterEach(resetLibraryStores);

    it('refuses shipped items, core types, and unchanged places', () => {
        const current = tree();
        expect(moveTargets('s:rules:wod-v5', current)).toEqual([]);
        expect(moveTargets('t:wod-v5:hunter', current)).toEqual([]);
        expect(moveTargets(`t:core:${ASHEN_ID}:v5-character`, current)).toEqual([]);
        expect(moveTargets('p:star-wars-wod:full-sheet', current)).toEqual([]);
        expect(canMove(`t:user:${CULT_ID}`, `s:user:${ASHEN_ID}`, current)).toBe(false);
        expect(canMove(`t:user:${CULT_ID}`, 's:rules:wod-2e', current)).toBe(false);
        expect(canMove(`t:user:${CULT_ID}`, `t:user:${CULT_ID}`, current)).toBe(false);
        expect(canMove(`s:user:${ASHEN_ID}`, 'r:wod-v5', current)).toBe(false);
        const settingTargets = moveTargets(`s:user:${ASHEN_ID}`, current);
        expect(settingTargets.map(({ node }) => node.key)).toEqual(['r:wod-2e']);
        expect(settingTargets[0]!.crossesSystem).toBe(true);
    });

    it('moves a page with the T-070 retarget rules', () => {
        const moved = plan(`p:user:${CULT_PAGE_ID}`, 't:wod-v5:hunter')!;
        expect(moved.crossesSystem).toBe(false);
        const cultPage = useTemplateStore
            .getState()
            .templates.find(({ id }) => id === CULT_PAGE_ID)!;
        const expected = planTemplateRetarget(
            { ...cultPage, settingId: undefined, documentKind: 'character' } as never,
            readLibraryState()
        );
        expect(moved.writes.saveTypes?.map(({ id }) => id)).toEqual(
            expected.types.map(({ id }) => id)
        );
        applyLibraryWrites(moved.writes);
        expect(template(CULT_PAGE_ID)).toMatchObject({ documentKind: 'character' });
        expect(template(CULT_PAGE_ID)?.settingId).toBeUndefined();
        expect(useDocumentTypeStore.getState().types[CULT_ID]?.defaultTemplateId).toBeUndefined();
    });

    it('moves a type within its system with pages and documents', () => {
        useDocumentTypeStore.setState((state) => ({
            settings: {
                ...state.settings,
                'user-setting-dusk0001': userSetting({
                    id: 'user-setting-dusk0001',
                    name: 'Dusk',
                    pages: {},
                }),
            },
        }));
        const moved = plan(`t:user:${CULT_ID}`, 's:user:user-setting-dusk0001')!;
        expect(moved).toMatchObject({ crossesSystem: false, documentsMoving: 1 });
        applyLibraryWrites(moved.writes);
        expect(useDocumentTypeStore.getState().types[CULT_ID]?.owner).toEqual({
            settingId: 'user-setting-dusk0001',
        });
        expect(template(CULT_PAGE_ID)?.settingId).toBe('user-setting-dusk0001');
        expect(doc('cult-1').metadata.settingId).toBe('user-setting-dusk0001');
    });

    it('moves a type across systems after flagging it', () => {
        const moved = plan(`t:user:${CULT_ID}`, `s:user:${MIST_ID}`)!;
        expect(moved).toMatchObject({ crossesSystem: true, documentsMoving: 1 });
        applyLibraryWrites(moved.writes);
        expect(template(CULT_PAGE_ID)?.systemId).toBe('wod-2e');
        expect(doc('cult-1')).toMatchObject({ systemId: 'wod-2e' });
        expect(doc('cult-1').metadata.settingId).toBe(MIST_ID);
    });

    it('moves a setting to other rules, leaving the rules character behind (FR-015a)', () => {
        const moved = plan(`s:user:${ASHEN_ID}`, 'r:wod-2e')!;
        expect(moved).toMatchObject({
            crossesSystem: true,
            documentsMoving: 1,
            documentsStaying: 3,
            pagesStaying: 1,
        });
        applyLibraryWrites(moved.writes);
        const setting = useDocumentTypeStore.getState().settings[ASHEN_ID]!;
        expect(setting.systemId).toBe('wod-2e');
        expect(setting.pages).toEqual({});
        expect(template(ASHEN_MORTAL_PAGE_ID)?.settingId).toBeUndefined();
        expect(template(ASHEN_MORTAL_PAGE_ID)?.systemId).toBe('wod-v5');
        for (const id of ['mortal-1', 'mortal-2', 'mortal-3']) {
            expect(doc(id).systemId).toBe('wod-v5');
            expect(doc(id).metadata.settingId).toBeUndefined();
            // Pinned to the page it used (followed the setting's page, or its own).
            expect(doc(id).metadata.templateId).toBe(ASHEN_MORTAL_PAGE_ID);
        }
        expect(doc('cult-1').systemId).toBe('wod-2e');
        expect(template(CULT_PAGE_ID)?.systemId).toBe('wod-2e');
        const after = tree();
        const rulesOnly = after[1]!.settings[0]!;
        expect(rulesOnly.types[0]!.pages.map(({ key }) => key)).toContain(
            `p:user:${ASHEN_MORTAL_PAGE_ID}`
        );
    });

    it('asks for confirmation when a Star Wars type leaves for its ruleset', () => {
        const moved = plan(`t:user:${ORG_ID}`, `s:user:${MIST_ID}`)!;
        expect(moved.crossesSystem).toBe(true);
        applyLibraryWrites(moved.writes);
        expect(template(ORG_PAGE_ID)?.systemId).toBe('wod-2e');
        expect(doc('org-1').systemId).toBe('wod-2e');
    });

    it('keeps a type without pages valid after its last page leaves', () => {
        useDocumentTypeStore.setState((state) => ({
            types: {
                ...state.types,
                'user-ship0001': userType({
                    id: 'user-ship0001',
                    name: 'Ship',
                    owner: { settingId: MIST_ID } as UserDocumentType['owner'],
                    defaultTemplateId: undefined,
                }),
            },
        }));
        const moved = plan(`p:user:${ORG_PAGE_ID}`, 't:user:user-ship0001')!;
        applyLibraryWrites(moved.writes);
        const types = useDocumentTypeStore.getState().types;
        expect(types['user-ship0001']?.defaultTemplateId).toBe(ORG_PAGE_ID);
        expect(types[ORG_ID]?.defaultTemplateId).toBeUndefined();
        expect(template(ORG_PAGE_ID)?.systemId).toBe('wod-2e');
    });
});

describe('catalog moves and deletes (spec 015, US4)', () => {
    const bound = (id: string, target: object, catalogId: string, fieldId = 'pick') =>
        CustomTemplateSchema.parse({
            id,
            name: `Page ${id}`,
            schemaVersion: 3,
            ...target,
            children: [
                {
                    id: fieldId,
                    type: 'select',
                    label: 'Pick',
                    options: [{ id: 'none', label: 'None' }],
                    binding: { catalogId, fills: {} },
                },
            ],
        });
    const ashenTarget = { systemId: 'wod-v5', documentKind: 'mortal', settingId: ASHEN_ID };
    const hunterTarget = { systemId: 'wod-v5', documentKind: 'character' };

    beforeEach(() => {
        seedLibrary();
        useTemplateStore.setState((state) => ({
            templates: [
                ...state.templates,
                bound('tpl-ashrelc1', ashenTarget, RELICS_ID),
                bound('tpl-ashguns1', ashenTarget, FIREARMS_ID),
                bound('tpl-huntgun1', hunterTarget, FIREARMS_ID),
            ],
        }));
        useDocumentTypeStore.setState((state) => ({
            settings: {
                ...state.settings,
                [MIST_ID]: userSetting({
                    id: MIST_ID,
                    name: 'Misty Archipelago',
                    systemId: 'wod-2e' as UserSetting['systemId'],
                    pages: {},
                }),
            },
        }));
    });
    afterEach(resetLibraryStores);

    const names = (list: readonly { name: string }[]) => list.map(({ name }) => name);
    const catalog = (id: string) => useDocumentTypeStore.getState().catalogs[id]!;

    it('lists rulesets and settings, Rules only included, as catalog destinations', () => {
        const keys = moveTargets(`c:user:${RELICS_ID}`, tree()).map(({ node }) => node.key);
        expect(keys).toContain('r:wod-v5');
        expect(keys).toContain('s:rules:wod-2e');
        expect(keys).toContain(`s:user:${MIST_ID}`);
        expect(keys).not.toContain(`s:user:${ASHEN_ID}`);
    });

    it('names the templates that lose a catalog moved out of their reach', () => {
        const away = plan(`c:user:${RELICS_ID}`, 's:system:star-wars-wod')!;
        expect(away.crossesSystem).toBe(true);
        expect(names(away.lostBy)).toEqual(['Page tpl-ashrelc1']);
        applyLibraryWrites(away.writes);
        expect(catalog(RELICS_ID).owner).toEqual({ systemId: 'star-wars-wod' });
    });

    it('names the other settings’ templates when a ruleset catalog moves down', () => {
        const down = plan(`c:user:${FIREARMS_ID}`, `s:user:${ASHEN_ID}`)!;
        expect(names(down.lostBy)).toEqual(['Page tpl-huntgun1']);
        const up = plan(`c:user:${RELICS_ID}`, 'r:wod-v5')!;
        expect(up.lostBy).toEqual([]);
        expect(up.crossesSystem).toBe(false);
    });

    it('carries a setting’s catalogs and names what its pages lose on other rules', () => {
        const moved = plan(`s:user:${ASHEN_ID}`, 'r:wod-2e')!;
        expect(moved.catalogsMoving).toBe(1);
        expect(names(moved.lostBy)).toEqual(['Page tpl-ashguns1']);
        applyLibraryWrites(moved.writes);
        expect(catalog(RELICS_ID).owner).toEqual({ settingId: ASHEN_ID });
    });

    it('deletes a setting with its catalogs and names templates bound to a deleted catalog', () => {
        const state = readLibraryState();
        const setting = findNode(tree(), `s:user:${ASHEN_ID}`)!.node;
        const settingDelete = deletePlan(setting, state)!;
        expect(names(settingDelete.catalogs)).toEqual(['Relics']);
        expect(settingDelete.writes.removeCatalogs).toEqual([RELICS_ID]);

        const relics = findNode(tree(), `c:user:${RELICS_ID}`)!.node;
        const catalogDelete = deletePlan(relics, state)!;
        expect(names(catalogDelete.boundTemplates)).toEqual(['Page tpl-ashrelc1']);
        applyLibraryWrites(catalogDelete.writes);
        expect(useDocumentTypeStore.getState().catalogs[RELICS_ID]).toBeUndefined();
    });
});
