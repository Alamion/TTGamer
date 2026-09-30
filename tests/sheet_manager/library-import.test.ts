import { readLibraryState } from '@site/src/sheet_manager/features/sheet/data/libraryActions';
import {
    buildLibraryTree,
    countDocuments,
} from '@site/src/sheet_manager/features/sheet/data/libraryTree';
import { validateTemplateReferences } from '@site/src/sheet_manager/features/sheet/data/templateReferences';
import {
    buildLibraryPayload,
    exportClosure,
    type LibraryPayload,
    parseLibraryFile,
    serializeLibraryFile,
} from '@site/src/sheet_manager/features/sheet/shell/libraryFile';
import {
    buildImportPreview,
    effectivePicks,
    type ImportEntry,
    initialChoices,
    installImport,
    recordKey,
    setChoice,
    togglePick,
} from '@site/src/sheet_manager/features/sheet/shell/libraryImport';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { UserSetting } from '@site/src/sheet_manager/systems/userTypes';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { TEMPLATE_LIMITS } from '@site/src/sheet_manager/types/templateLimits';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    ASHEN_ID,
    ASHEN_MORTAL_PAGE_ID,
    CULT_ID,
    CULT_PAGE_ID,
    FIREARMS_ID,
    libraryPage,
    RELICS_ID,
    resetLibraryStores,
    seedLibrary,
    userCatalog,
    userSetting,
    userType,
} from './helpers/library';

function installed() {
    const { types, settings, catalogs } = useDocumentTypeStore.getState();
    const { templates, defaultOverrides } = useTemplateStore.getState();
    return { types, settings, templates, defaultOverrides, catalogs };
}

function exportAshen(): LibraryPayload {
    const { types, settings, defaultPages } = useDocumentTypeStore.getState();
    const { templates, defaultOverrides } = useTemplateStore.getState();
    const tree = buildLibraryTree({
        registry: systemRegistry,
        types,
        settings,
        templates,
        defaultOverrides,
        defaultPages,
        counts: countDocuments(useDocumentStore.getState().documents),
    });
    const closure = exportClosure(
        tree,
        new Set([`s:user:${ASHEN_ID}`, `t:user:${CULT_ID}`, `p:user:${CULT_PAGE_ID}`])
    );
    closure.picked.add(`p:user:${ASHEN_MORTAL_PAGE_ID}`);
    const payload = buildLibraryPayload(tree, closure, readLibraryState());
    const parsed = parseLibraryFile(serializeLibraryFile(payload));
    if (!parsed.ok) throw new Error('export did not parse');
    return parsed.payload;
}

function find(entries: readonly ImportEntry[], key: string): ImportEntry | undefined {
    for (const entry of entries) {
        if (entry.key === key) return entry;
        const inner = find(entry.children, key);
        if (inner) return inner;
    }
    return undefined;
}

const preview = (payload: LibraryPayload) =>
    buildImportPreview(payload, installed(), systemRegistry);

describe('library import (spec 013, US5)', () => {
    beforeEach(seedLibrary);
    afterEach(resetLibraryStores);

    it('marks entries new, same, conflict, and unavailable', () => {
        const payload = exportAshen();
        const changed: LibraryPayload = {
            ...payload,
            templates: payload.templates.map((template) =>
                template.id === CULT_PAGE_ID ? { ...template, name: 'Cult card v2' } : template
            ),
            settings: [
                ...payload.settings,
                userSetting({
                    id: 'user-setting-far00001',
                    name: 'Far Future',
                    systemId: 'wod-9e' as UserSetting['systemId'],
                }),
            ],
            types: [
                ...payload.types,
                userType({
                    id: 'user-far00001',
                    name: 'Starship',
                    owner: { settingId: 'user-setting-far00001' },
                    defaultTemplateId: undefined,
                }),
            ],
        };
        const entries = preview(changed);
        expect(entries.map(({ key }) => key)).toEqual(['r:wod-v5', 'r:unavailable']);
        expect(find(entries, `s:user:${ASHEN_ID}`)?.record?.state).toBe('same');
        expect(find(entries, `p:user:${CULT_PAGE_ID}`)?.record?.state).toBe('conflict');
        expect(find(entries, 's:user:user-setting-far00001')?.record).toMatchObject({
            state: 'unavailable',
            reason: 'rules',
        });
        expect(find(entries, 't:user:user-far00001')?.record?.state).toBe('unavailable');

        const choices = initialChoices(entries);
        expect(choices[recordKey('setting', ASHEN_ID)]?.picked).toBe(false);
        expect(choices[recordKey('template', CULT_PAGE_ID)]).toEqual({
            picked: true,
            choice: 'replace',
        });
        expect(choices[recordKey('setting', 'user-setting-far00001')]?.picked).toBe(false);
    });

    it('writes nothing before install and replaces by id', () => {
        const payload = exportAshen();
        payload.templates = payload.templates.map((template) =>
            template.id === CULT_PAGE_ID ? { ...template, name: 'Cult card v2' } : template
        );
        const before = JSON.stringify(installed());
        const entries = preview(payload);
        const choices = initialChoices(entries);
        expect(JSON.stringify(installed())).toBe(before);
        const summary = installImport(payload, entries, choices, installed(), systemRegistry);
        expect(summary).toEqual({ settings: 0, types: 0, pages: 1, catalogs: 0 });
        const pages = useTemplateStore
            .getState()
            .templates.filter(({ documentKind }) => documentKind === CULT_ID);
        expect(pages.map(({ id, name }) => [id, name])).toEqual([[CULT_PAGE_ID, 'Cult card v2']]);
    });

    it('keeps both with new identities that follow into references', () => {
        const payload = exportAshen();
        payload.settings = payload.settings.map((setting) => ({ ...setting, name: 'Ashen v2' }));
        const entries = preview(payload);
        let choices = initialChoices(entries);
        const settingKey = recordKey('setting', ASHEN_ID);
        expect(choices[settingKey]?.picked).toBe(true);
        choices = setChoice(choices, settingKey, 'keep-both');
        // The same type and pages below the kept setting come along under new ids.
        const settingEntry = find(entries, `s:user:${ASHEN_ID}`)!;
        choices = togglePick(settingEntry, togglePick(settingEntry, choices));
        installImport(payload, entries, choices, installed(), systemRegistry);

        const settings = Object.values(useDocumentTypeStore.getState().settings);
        expect(settings).toHaveLength(2);
        const copy = settings.find(({ id }) => id !== ASHEN_ID)!;
        expect(copy.name).toBe('Ashen v2 (imported)');
        expect(useDocumentTypeStore.getState().settings[ASHEN_ID]!.name).toBe('Ashen Realms');
    });

    it('auto-picks a new parent of a picked child', () => {
        const payload = exportAshen();
        resetLibraryStores();
        const entries = preview(payload);
        let choices = initialChoices(entries);
        const settingEntry = find(entries, `s:user:${ASHEN_ID}`)!;
        choices = togglePick(settingEntry, choices);
        choices = togglePick(find(entries, `p:user:${CULT_PAGE_ID}`)!, choices);
        const picks = effectivePicks(entries, choices);
        expect([...picks.picked]).toEqual([recordKey('template', CULT_PAGE_ID)]);
        expect([...picks.auto].sort()).toEqual(
            [recordKey('setting', ASHEN_ID), recordKey('type', CULT_ID)].sort()
        );
    });

    it('reproduces an export in an empty profile (SC-004)', () => {
        const payload = exportAshen();
        resetLibraryStores();
        const entries = preview(payload);
        const summary = installImport(
            payload,
            entries,
            initialChoices(entries),
            installed(),
            systemRegistry
        );
        expect(summary).toEqual({ settings: 1, types: 1, pages: 2, catalogs: 0 });
        const { settings, types } = useDocumentTypeStore.getState();
        expect(settings[ASHEN_ID]?.pages).toEqual({ 'v5-character': ASHEN_MORTAL_PAGE_ID });
        expect(types[CULT_ID]?.defaultTemplateId).toBe(CULT_PAGE_ID);
        expect(
            useTemplateStore
                .getState()
                .templates.map(({ id }) => id)
                .sort()
        ).toEqual([ASHEN_MORTAL_PAGE_ID, CULT_PAGE_ID].sort());
    });

    it('re-issues templates that collide with unrelated or shipped ids', () => {
        const payload: LibraryPayload = {
            settings: [],
            types: [],
            templates: [
                libraryPage('brief', { systemId: 'star-wars-wod', documentKind: 'character' }),
                libraryPage(CULT_PAGE_ID, { systemId: 'star-wars-wod', documentKind: 'creature' }),
            ],
            overrides: [],
            catalogs: [],
            included: {},
            addresses: [],
        };
        const entries = preview(payload);
        installImport(payload, entries, initialChoices(entries), installed(), systemRegistry);
        const templates = useTemplateStore.getState().templates;
        expect(templates.filter(({ id }) => id === 'brief')).toEqual([]);
        expect(templates.filter(({ id }) => id === CULT_PAGE_ID)).toHaveLength(1);
        expect(templates.filter(({ documentKind }) => documentKind === 'creature')).toHaveLength(1);
    });
});

describe('catalogs in library files (spec 015, US4)', () => {
    const boundPage = (id: string) =>
        CustomTemplateSchema.parse({
            id,
            name: `Relic page ${id}`,
            systemId: 'wod-v5',
            documentKind: 'mortal',
            settingId: ASHEN_ID,
            schemaVersion: 3,
            children: [
                {
                    id: 'relic',
                    type: 'select',
                    label: 'Relic',
                    options: [{ id: 'none', label: 'None' }],
                    binding: { catalogId: RELICS_ID, fills: {} },
                },
                {
                    id: 'guns',
                    type: 'list',
                    valueKey: 'guns',
                    catalog: { catalogId: FIREARMS_ID },
                },
            ],
        });

    function libraryTree() {
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

    function exportPicked(keys: string[]) {
        const tree = libraryTree();
        const closure = exportClosure(tree, new Set(keys));
        return { closure, payload: buildLibraryPayload(tree, closure, readLibraryState()) };
    }

    beforeEach(() => {
        seedLibrary();
        useTemplateStore.setState((state) => ({
            templates: [...state.templates, boundPage('tpl-relicpg1')],
        }));
    });
    afterEach(resetLibraryStores);

    it('adds the catalogs a picked page binds, with their parents and addresses', () => {
        const { closure, payload } = exportPicked(['p:user:tpl-relicpg1']);
        expect([...closure.auto.keys()].sort()).toEqual(
            [`c:user:${FIREARMS_ID}`, `c:user:${RELICS_ID}`, `s:user:${ASHEN_ID}`].sort()
        );
        expect(closure.addresses).toContainEqual({ systemId: 'wod-v5' });
        expect(payload.catalogs.map(({ id }) => id).sort()).toEqual(
            [FIREARMS_ID, RELICS_ID].sort()
        );
        expect(payload.included[RELICS_ID]).toBe('auto');
    });

    it('round-trips version 2 and recreates catalogs exactly in an empty profile (SC-003)', () => {
        const { payload } = exportPicked([`c:user:${RELICS_ID}`, 'p:user:tpl-relicpg1']);
        const text = serializeLibraryFile(payload);
        expect(JSON.parse(text).version).toBe(2);
        const parsed = parseLibraryFile(text);
        if (!parsed.ok) throw new Error('did not parse');
        expect(parsed.payload.catalogs).toEqual(payload.catalogs);
        // The page keeps its user catalog bindings even before the catalogs are installed.
        expect(parsed.payload.templates[0]!.children[0]).toMatchObject({
            binding: { catalogId: RELICS_ID },
        });

        const catalogsBefore = useDocumentTypeStore.getState().catalogs;
        resetLibraryStores();
        const entries = preview(parsed.payload);
        expect(find(entries, `c:user:${RELICS_ID}`)?.record?.state).toBe('new');
        expect(find(entries, `c:user:${FIREARMS_ID}`)?.record?.state).toBe('new');
        expect(find(entries, 'r:wod-v5')?.children[0]?.key).toBe(`c:user:${FIREARMS_ID}`);
        const summary = installImport(
            parsed.payload,
            entries,
            initialChoices(entries),
            installed(),
            systemRegistry
        );
        expect(summary.catalogs).toBe(2);
        expect(useDocumentTypeStore.getState().catalogs).toEqual({
            [RELICS_ID]: catalogsBefore[RELICS_ID],
            [FIREARMS_ID]: catalogsBefore[FIREARMS_ID],
        });
    });

    it('keeps both copies and rebinds the file pages to the copy', () => {
        const { payload } = exportPicked([`c:user:${RELICS_ID}`]);
        const incoming: LibraryPayload = {
            ...payload,
            catalogs: payload.catalogs.map((catalog) => ({ ...catalog, name: 'Relics (edited)' })),
            templates: [boundPage('tpl-relicpg2')],
            included: { ...payload.included, 'tpl-relicpg2': 'picked' },
        };
        const entries = preview(incoming);
        const key = recordKey('catalog', RELICS_ID);
        expect(find(entries, `c:user:${RELICS_ID}`)?.record?.state).toBe('conflict');
        installImport(
            incoming,
            entries,
            setChoice(initialChoices(entries), key, 'keep-both'),
            installed(),
            systemRegistry
        );
        const catalogs = Object.values(useDocumentTypeStore.getState().catalogs);
        const copy = catalogs.find(({ name }) => name.startsWith('Relics (edited)'))!;
        expect(copy.id).not.toBe(RELICS_ID);
        expect(useDocumentTypeStore.getState().catalogs[RELICS_ID]!.name).toBe('Relics');
        const page = useTemplateStore.getState().templates.find(({ id }) => id === 'tpl-relicpg2')!;
        expect(page.children[0]).toMatchObject({ binding: { catalogId: copy.id } });
    });

    it('marks catalogs beyond the owner limit unavailable', () => {
        const many = Object.fromEntries(
            Array.from({ length: TEMPLATE_LIMITS.catalogsPerOwner }, (_, i) => {
                const id = `user-catalog-${String(i).padStart(8, '0')}`;
                return [id, userCatalog({ id, name: `Catalog ${i}` })];
            })
        );
        const { payload } = exportPicked([`c:user:${RELICS_ID}`]);
        useDocumentTypeStore.setState({ catalogs: many });
        const entries = preview(payload);
        expect(find(entries, `c:user:${RELICS_ID}`)?.record).toMatchObject({
            state: 'unavailable',
            reason: 'limit',
        });
    });

    it('still imports version 1 files and older template files with table catalog columns', () => {
        const v1 = parseLibraryFile(
            JSON.stringify({
                format: 'ttgamer-library',
                version: 1,
                settings: [userSetting()],
            })
        );
        expect(v1.ok && v1.payload.catalogs).toEqual([]);

        const table = CustomTemplateSchema.parse({
            id: 'tpl-armory01',
            name: 'Armory',
            systemId: 'star-wars-wod',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'armory',
                    type: 'table',
                    columns: [
                        {
                            id: 'weapon',
                            type: 'select',
                            label: 'Weapon',
                            options: [{ id: 'none', label: 'None' }],
                            binding: {
                                catalogId: 'melee-weapons',
                                fills: { damage: { targetFieldId: 'damage' } },
                            },
                        },
                        { id: 'damage', type: 'text', label: 'Damage' },
                    ],
                },
                { id: 'notes', type: 'text', label: 'Notes' },
            ],
        });
        const file = parseLibraryFile(
            JSON.stringify({ format: 'ttgamer-template', formatVersion: 3, template: table })
        );
        expect(file.ok && file.degradedCatalogFields).toEqual([]);
        expect(file.ok && validateTemplateReferences(file.payload.templates[0]!)).toEqual([]);
    });
});
