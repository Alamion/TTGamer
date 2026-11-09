import { readLibraryState } from '@site/src/sheet_manager/features/sheet/data/libraryActions';
import {
    buildLibraryTree,
    countDocuments,
    findNode,
} from '@site/src/sheet_manager/features/sheet/data/libraryTree';
import { shippedPageFor } from '@site/src/sheet_manager/features/sheet/data/shippedRevision';
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
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
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
    return {
        closure,
        payload: buildLibraryPayload(current, closure, {
            ...readLibraryState(),
            overrideBases: useTemplateStore.getState().overrideBases,
        }),
    };
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

    it('exports bases only for included edited pages, without revisions or dismissals', () => {
        const shipped = shippedPageFor('star-wars-wod', 'full-sheet')!;
        const key = 'star-wars-wod:full-sheet';
        const base = { ...shipped, name: 'Earlier shipped page' };
        const store = useTemplateStore.getState();
        store.setDefaultOverride({ ...shipped, name: 'My copy' }, { base });
        store.dismissUpdate(shipped.systemId, shipped.id, 'device-dismissal');
        const brief = shippedPageFor('star-wars-wod', 'brief')!;
        store.setDefaultOverride({ ...brief, name: 'My brief' }, { base: brief });
        const { payload } = exportKeys(['p:star-wars-wod:full-sheet', `p:user:${CULT_PAGE_ID}`]);
        expect(payload.overrideBases).toEqual({ [key]: base });
        const text = serializeLibraryFile(payload);
        expect(JSON.parse(text).overrideBases).toEqual({ [key]: base });
        expect(text).not.toContain('dismissed');
        expect(text).not.toContain('device-dismissal');
        expect(text).not.toContain('"revision"');
    });

    it.each([true, false])(
        'omits the bases field when none is recorded (dismissed: %s)',
        (dismissed) => {
            if (dismissed)
                useTemplateStore.getState().dismissUpdate('star-wars-wod', 'full-sheet', 'later');
            const { payload } = exportKeys(['p:star-wars-wod:full-sheet']);
            expect(payload.overrideBases).toEqual({});
            expect(JSON.parse(serializeLibraryFile(payload))).not.toHaveProperty('overrideBases');
        }
    );

    it('reads a version 2 file with bases and ignores unknown additive fields', () => {
        const copy = libraryPage('general-note', { systemId: 'general', documentKind: 'note' });
        const base = CustomTemplateSchema.parse({
            ...copy,
            children: [
                {
                    id: 'choice',
                    type: 'select',
                    label: 'Choice',
                    options: [{ id: 'none', label: 'None' }],
                    binding: { catalogId: 'missing-shipped-catalog', fills: {} },
                },
            ],
        });
        const parsed = parseLibraryFile(
            JSON.stringify({
                format: 'ttgamer-library',
                version: 2,
                overrides: [copy],
                overrideBases: { 'general:general-note': { ...base, unknown: 'stripped' } },
                futureField: { ignored: true },
            })
        );
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(parsed.payload.overrideBases).toEqual({ 'general:general-note': base });
        expect(parsed.payload.overrides).toEqual([copy]);
        expect(parsed.degradedCatalogFields).toEqual([]);
        expect(parsed.convertedPages).toEqual([]);
    });

    it('drops unreadable and unmatched bases, reports their keys, and keeps the copy', () => {
        const { payload } = exportKeys(['p:star-wars-wod:full-sheet']);
        const copy = payload.overrides[0]!;
        const key = 'star-wars-wod:full-sheet';
        const parsed = parseLibraryFile(
            JSON.stringify({
                ...JSON.parse(serializeLibraryFile(payload)),
                overrideBases: { [key]: { ...copy, children: 'broken' }, 'general:missing': copy },
            })
        );
        expect(parsed.ok && parsed.payload.overrides).toEqual([copy]);
        expect(parsed.ok && parsed.payload.overrideBases).toEqual({});
        expect(takeSheetIssues()).toEqual(
            [key, 'general:missing'].map((key) =>
                expect.objectContaining({
                    code: 'template-update-unreadable',
                    details: { key },
                })
            )
        );
    });

    it('upgrades an older base without adding it to the conversion summary', () => {
        const copy = libraryPage('general-note', { systemId: 'general', documentKind: 'note' });
        const parsed = parseLibraryFile(
            JSON.stringify({
                format: 'ttgamer-library',
                version: 2,
                overrides: [copy],
                overrideBases: { 'general:general-note': { ...copy, schemaVersion: 3 } },
            })
        );
        expect(parsed.ok && parsed.payload.overrideBases['general:general-note']).toEqual(copy);
        expect(parsed.ok && parsed.convertedPages).toEqual([]);
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

    it('carries custom list entry templates and old lists unchanged (spec 016)', () => {
        const { payload } = exportKeys([`s:user:${ASHEN_ID}`, `t:user:${ORG_ID}`]);
        const lists = CustomTemplateSchema.parse({
            id: 'tpl-listskit',
            name: 'Lists',
            systemId: 'wod-v5',
            documentKind: 'mortal',
            settingId: ASHEN_ID,
            schemaVersion: 3,
            children: [
                { id: 'old-list', type: 'list', valueKey: 'old-list' },
                {
                    id: 'bond-list',
                    type: 'list',
                    valueKey: 'bond-list',
                    item: { id: 'bond', type: 'resource', label: 'Bond', max: 10 },
                },
            ],
        });
        const parsed = parseLibraryFile(serializeLibraryFile({ ...payload, templates: [lists] }));
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(parsed.payload.templates).toEqual([lists]);
        expect(parsed.payload.templates[0]!.children[0]).not.toHaveProperty('item');
    });

    it('rejects broken files with the reason and the entry', () => {
        expect(parseLibraryFile('{')).toEqual({ ok: false, error: 'parse' });
        expect(parseLibraryFile('{"format":"x"}')).toEqual({ ok: false, error: 'format' });
        expect(parseLibraryFile('{"format":"ttgamer-library","version":3}')).toEqual({
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
