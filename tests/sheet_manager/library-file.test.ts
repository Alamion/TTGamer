import { readLibraryState } from '@site/src/sheet_manager/features/sheet/data/libraryActions';
import {
    buildLibraryTree,
    countDocuments,
    findNode,
} from '@site/src/sheet_manager/features/sheet/data/libraryTree';
import {
    buildLibraryFilename,
    buildLibraryPayload,
    exportClosure,
    parseLibraryFile,
    serializeLibraryFile,
    tickState,
    toggleTick,
} from '@site/src/sheet_manager/features/sheet/shell/libraryFile';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    ASHEN_ID,
    ASHEN_MORTAL_PAGE_ID,
    CULT_ID,
    CULT_PAGE_ID,
    libraryPage,
    ORG_ID,
    ORG_PAGE_ID,
    resetLibraryStores,
    seedLibrary,
} from './helpers/library';

function tree() {
    const { types, settings, defaultPages } = useDocumentTypeStore.getState();
    const { templates, defaultOverrides } = useTemplateStore.getState();
    return buildLibraryTree({
        registry: systemRegistry,
        types,
        settings,
        templates,
        defaultOverrides,
        defaultPages,
        counts: countDocuments(useDocumentStore.getState().documents),
    });
}

function exportKeys(keys: string[]) {
    const current = tree();
    const closure = exportClosure(current, new Set(keys));
    return { closure, payload: buildLibraryPayload(current, closure, readLibraryState()) };
}

describe('library export (spec 013, US4)', () => {
    beforeEach(seedLibrary);
    afterEach(resetLibraryStores);

    it('adds the user parents of a picked page and lists shipped places as addresses', () => {
        const { closure, payload } = exportKeys([`p:user:${CULT_PAGE_ID}`]);
        expect([...closure.auto.keys()]).toEqual([`s:user:${ASHEN_ID}`, `t:user:${CULT_ID}`]);
        expect(closure.addresses).toEqual([{ systemId: 'wod-v5' }]);
        expect(payload.settings.map(({ id }) => id)).toEqual([ASHEN_ID]);
        expect(payload.types.map(({ id }) => id)).toEqual([CULT_ID]);
        expect(payload.templates.map(({ id }) => id)).toEqual([CULT_PAGE_ID]);
        expect(payload.included).toEqual({
            [CULT_PAGE_ID]: 'picked',
            [ASHEN_ID]: 'auto',
            [CULT_ID]: 'auto',
        });
        // The setting's page for its mortal is not in the file, so the setting does not name it.
        expect(payload.settings[0]!.pages).toEqual({});
    });

    it('computes tri-state ticks over branches', () => {
        const current = tree();
        const setting = findNode(current, `s:user:${ASHEN_ID}`)!.node;
        expect(tickState(setting, new Set())).toBe('unchecked');
        const all = toggleTick(setting, new Set());
        expect(tickState(setting, all)).toBe('checked');
        expect([...all].sort()).toEqual(
            [
                `p:user:${ASHEN_MORTAL_PAGE_ID}`,
                `p:user:${CULT_PAGE_ID}`,
                `s:user:${ASHEN_ID}`,
                `t:user:${CULT_ID}`,
            ].sort()
        );
        const partial = new Set([`p:user:${CULT_PAGE_ID}`]);
        expect(tickState(setting, partial)).toBe('partial');
        expect(toggleTick(setting, all).size).toBe(0);
        const shipped = findNode(current, 's:rules:wod-2e')!.node;
        expect(tickState(shipped, new Set())).toBe('unchecked');
    });

    it('exports edited shipped pages as overrides and never shipped content', () => {
        const { payload } = exportKeys(['p:star-wars-wod:full-sheet', `t:user:${ORG_ID}`]);
        expect(payload.overrides.map(({ id, name }) => [id, name])).toEqual([
            ['full-sheet', 'Edited full sheet'],
        ]);
        expect(payload.included['star-wars-wod:full-sheet']).toBe('picked');
        expect(payload.addresses).toContainEqual({ systemId: 'star-wars-wod' });
        expect(payload.addresses).toContainEqual({ systemId: 'wod-2e' });
        expect(payload.templates).toEqual([]);
        const text = serializeLibraryFile(payload, new Date('2026-09-26T12:00:00Z'));
        expect(text).not.toContain('"brief"');
        expect(JSON.parse(text).notices).toBeUndefined();
    });

    it('adds publisher notices only for V5 material', () => {
        const { payload } = exportKeys([`t:user:${CULT_ID}`]);
        const parsed = JSON.parse(serializeLibraryFile(payload));
        expect(parsed.notices.map(({ policy }: { policy: string }) => policy)).toEqual([
            'dark-pack',
        ]);
    });

    it('round-trips through the file', () => {
        const { payload } = exportKeys([`s:user:${ASHEN_ID}`, `t:user:${ORG_ID}`]);
        const parsed = parseLibraryFile(serializeLibraryFile(payload));
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(parsed.payload.settings).toEqual(payload.settings);
        expect(parsed.payload.types).toEqual(payload.types);
        expect(parsed.payload.templates).toEqual(payload.templates);
        expect(parsed.payload.included).toEqual(payload.included);
        expect(parsed.payload.addresses).toEqual(payload.addresses);
        expect(buildLibraryFilename('Ashen Realms')).toBe('ttgamer_library_Ashen_Realms.json');
        expect(buildLibraryFilename(undefined)).toBe('ttgamer_library_selection.json');
    });

    it('rejects broken files with the reason and the entry', () => {
        expect(parseLibraryFile('{')).toEqual({ ok: false, error: 'parse' });
        expect(parseLibraryFile('{"format":"x"}')).toEqual({ ok: false, error: 'format' });
        expect(parseLibraryFile('{"format":"ttgamer-library","version":2}')).toEqual({
            ok: false,
            error: 'version',
        });
        expect(
            parseLibraryFile(
                JSON.stringify({
                    format: 'ttgamer-library',
                    version: 1,
                    types: [{ id: 'user-bad', name: 'Broken' }],
                })
            )
        ).toEqual({ ok: false, error: 'schema', entry: 'Broken' });
        expect(parseLibraryFile('{"format":"ttgamer-library","version":1}')).toEqual({
            ok: false,
            error: 'schema',
        });
    });

    it('reads spec 012 type files and single page files', () => {
        const { types, settings } = useDocumentTypeStore.getState();
        const cultPage = useTemplateStore
            .getState()
            .templates.find(({ id }) => id === CULT_PAGE_ID)!;
        const typeFile = parseLibraryFile(
            JSON.stringify({
                format: 'ttgamer-document-type',
                version: 1,
                type: types[CULT_ID],
                setting: settings[ASHEN_ID],
                templates: [cultPage],
            })
        );
        expect(typeFile.ok && typeFile.payload.types.map(({ id }) => id)).toEqual([CULT_ID]);
        expect(typeFile.ok && typeFile.payload.settings.map(({ id }) => id)).toEqual([ASHEN_ID]);

        const pageFile = parseLibraryFile(
            JSON.stringify({
                format: 'ttgamer-template',
                formatVersion: 3,
                template: libraryPage(ORG_PAGE_ID, {
                    systemId: 'star-wars-wod',
                    documentKind: ORG_ID,
                }),
            })
        );
        expect(pageFile.ok && pageFile.payload.templates.map(({ id }) => id)).toEqual([
            ORG_PAGE_ID,
        ]);
        expect(
            parseLibraryFile(JSON.stringify({ format: 'ttgamer-template', formatVersion: 2 }))
        ).toEqual({ ok: false, error: 'version' });
    });
});
