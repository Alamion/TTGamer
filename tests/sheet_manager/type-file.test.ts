import {
    buildDocumentExport,
    parseImportedDocument,
    readEmbeddedType,
} from '@site/src/sheet_manager/features/sheet/shell/documentFile';
import {
    buildTypePayload,
    installTypePayload,
    parseTypeFile,
    rewriteTypeIdentity,
    serializeTypeFile,
    typeInstallState,
    type TypePayload,
} from '@site/src/sheet_manager/features/sheet/shell/typeFile';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { UserDocumentType } from '@site/src/sheet_manager/systems/userTypes';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const TYPE_ID = 'user-org00001';
const NOW = '2026-09-25T10:00:00.000Z';

function page(id = 'tpl-orgpage1', extra: object[] = []): CustomTemplate {
    return CustomTemplateSchema.parse({
        id,
        name: 'Organization sheet',
        systemId: 'star-wars-wod',
        documentKind: TYPE_ID,
        schemaVersion: 3,
        children: [{ id: 'motto', type: 'text', label: 'Motto' }, ...extra],
    });
}

function typeRecord(overrides: Partial<UserDocumentType> = {}): UserDocumentType {
    return {
        id: TYPE_ID,
        name: 'Organization',
        owner: { systemId: 'star-wars-wod' },
        defaultTemplateId: 'tpl-orgpage1',
        createdAt: NOW,
        updatedAt: NOW,
        ...overrides,
    } as UserDocumentType;
}

function install(payload: TypePayload = { type: typeRecord(), templates: [page()] }) {
    useTemplateStore.setState({
        templates: payload.templates,
        quarantine: [],
        defaultOverrides: {},
    });
    useDocumentTypeStore.setState({ types: { [payload.type.id]: payload.type }, settings: {} });
}

function clear() {
    useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });
    useDocumentTypeStore.setState({ types: {}, settings: {} });
}

const fileWith = (patch: (file: Record<string, unknown>) => void) => {
    const file = JSON.parse(serializeTypeFile({ type: typeRecord(), templates: [page()] }));
    patch(file);
    return JSON.stringify(file);
};

describe('type files (spec 012, US5)', () => {
    beforeEach(clear);
    afterEach(clear);

    it('round-trips a type with its pages', () => {
        install();
        const payload = buildTypePayload(TYPE_ID)!;
        const parsed = parseTypeFile(serializeTypeFile(payload));
        expect(parsed.ok && parsed.payload).toEqual(payload);
    });

    it('rejects malformed, foreign, and inconsistent files before any change', () => {
        expect(parseTypeFile('not json')).toEqual({ ok: false, error: 'parse' });
        expect(parseTypeFile(fileWith((file) => (file.format = 'x')))).toEqual({
            ok: false,
            error: 'format',
        });
        expect(parseTypeFile(fileWith((file) => (file.version = 2)))).toEqual({
            ok: false,
            error: 'version',
        });
        expect(
            parseTypeFile(
                fileWith((file) => {
                    (file.templates as Array<Record<string, unknown>>)[0]!.documentKind =
                        'character';
                })
            )
        ).toEqual({ ok: false, error: 'schema' });
        expect(
            parseTypeFile(
                fileWith((file) => {
                    (file.type as Record<string, unknown>).defaultTemplateId = 'tpl-missing';
                })
            )
        ).toEqual({ ok: false, error: 'schema' });
        expect(
            parseTypeFile(
                fileWith((file) => {
                    (file.type as Record<string, unknown>).owner = { systemId: 'unknown-system' };
                })
            )
        ).toEqual({ ok: false, error: 'system' });
        expect(useDocumentTypeStore.getState().types).toEqual({});
    });

    it('strips unavailable catalogs to manual choice and reports the fields', () => {
        const text = serializeTypeFile({
            type: typeRecord(),
            templates: [
                page('tpl-orgpage1', [
                    {
                        id: 'rank',
                        type: 'select',
                        label: 'Rank',
                        options: [{ id: 'one', label: 'One' }],
                        binding: { catalogId: 'no-such-catalog', fills: {} },
                    },
                ]),
            ],
        });
        const parsed = parseTypeFile(text);
        expect(parsed.ok && parsed.degradedCatalogFields).toEqual(['rank']);
    });

    it('knows new, same, and conflicting installs; keep both renames everything', () => {
        const payload = { type: typeRecord(), templates: [page()] };
        expect(typeInstallState(payload)).toBe('new');
        install(payload);
        expect(typeInstallState(payload)).toBe('same');
        const renamed = { ...payload, type: { ...payload.type, name: 'Cartel' } };
        expect(typeInstallState(renamed)).toBe('conflict');

        const both = rewriteTypeIdentity(renamed);
        expect(both.type.id).not.toBe(TYPE_ID);
        expect(both.templates.every(({ documentKind }) => documentKind === both.type.id)).toBe(
            true
        );
        installTypePayload(both);
        expect(Object.keys(useDocumentTypeStore.getState().types).sort()).toEqual(
            [TYPE_ID, both.type.id].sort()
        );
    });

    it('gives a page a fresh id when another type already uses it', () => {
        useTemplateStore.setState({
            templates: [{ ...page(), documentKind: 'user-other001' as never }],
            quarantine: [],
            defaultOverrides: {},
        });
        const installed = installTypePayload({ type: typeRecord(), templates: [page()] });
        expect(installed.templates[0]!.id).not.toBe('tpl-orgpage1');
        expect(installed.type.defaultTemplateId).toBe(installed.templates[0]!.id);
        expect(useTemplateStore.getState().templates).toHaveLength(2);
    });

    it('embeds the type in document exports and installs it from a document file', () => {
        install();
        const document = {
            id: 'doc-1',
            kind: TYPE_ID,
            systemId: 'star-wars-wod',
            definitionId: TYPE_ID,
            schemaVersion: 1,
            metadata: { title: 'Rebel cell', tags: [] },
            templateValues: { motto: 'Hope' },
            data: {},
        } as unknown as UnknownDocumentEnvelope;
        const file = JSON.parse(JSON.stringify(buildDocumentExport(document)));
        expect(file.documentType.type.id).toBe(TYPE_ID);

        clear();
        const embedded = readEmbeddedType(file);
        expect(embedded?.ok).toBe(true);
        if (!embedded?.ok) return;
        expect(typeInstallState(embedded.payload)).toBe('new');
        installTypePayload(embedded.payload);
        const imported = parseImportedDocument(file);
        expect(imported.templateValues.motto).toBe('Hope');
        expect(systemRegistry.getDocumentDefinition('star-wars-wod', TYPE_ID)?.defaultViewId).toBe(
            'tpl-orgpage1'
        );
    });

    it('never embeds a type in a shipped document', () => {
        const file = buildDocumentExport({
            id: 'sw',
            kind: 'creature',
            systemId: 'star-wars-wod',
            definitionId: 'creature',
            schemaVersion: 1,
            metadata: { title: 'Wampa', tags: [] },
            templateValues: {},
            data: {},
        } as unknown as UnknownDocumentEnvelope);
        expect(file.documentType).toBeUndefined();
        expect(readEmbeddedType(file)).toBeUndefined();
    });
});
