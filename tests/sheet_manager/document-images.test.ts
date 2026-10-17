// @vitest-environment happy-dom
import { deletePortrait } from '@site/src/sheet_manager/persistence/portraitStorage';
import { purgeDeleted } from '@site/src/sheet_manager/store/documentBoot';
import {
    configureRecordStorage,
    createMemoryRecordStorage,
    deviceImageIdsOf,
    purgedIds,
    writeRecord,
} from '@site/src/sheet_manager/store/documentContent';
import {
    type DocumentStoreState,
    useDocumentStore,
} from '@site/src/sheet_manager/store/documentStore';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import type { TemplatePageValues } from '@site/src/sheet_manager/types/templateValues';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@site/src/sheet_manager/persistence/portraitStorage', async (original) => ({
    ...(await original<object>()),
    deletePortrait: vi.fn(async () => {}),
}));

/** Device images in page values are deleted once nothing names them (F-009). */

const device = (blobId: string) => ({ source: 'device' as const, blobId });

const page = CustomTemplateSchema.parse({
    id: 'tpl-images',
    name: 'Images',
    systemId: 'star-wars-wod',
    documentKind: 'character',
    schemaVersion: 3,
    children: [
        { id: 'crest', type: 'image', label: 'Crest', valueKey: 'crest' },
        { id: 'banner', type: 'image', label: 'Banner', valueKey: 'banner' },
        {
            id: 'keepsakes',
            type: 'list',
            valueKey: 'keepsakes',
            title: 'Keepsakes',
            item: { id: 'keepsake', type: 'image', label: 'Keepsake' },
        },
    ],
});

function seed(templateValues: Record<string, unknown>, portraitId?: string) {
    const data = createDefaultStarWarsCharacterData();
    if (portraitId) data.metadata.portraitId = portraitId;
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-images',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'character',
                schemaVersion: 1,
                metadata: { title: 'Mara', tags: [] },
                templateValues,
                data,
            } as never,
        ],
        currentDocumentId: 'doc-images',
    });
}

const write = (updater: (values: TemplatePageValues) => TemplatePageValues) =>
    useDocumentStore.getState().updateTemplateValues('doc-images', page, updater);
const deleted = () => vi.mocked(deletePortrait).mock.calls.map(([id]) => id);

beforeEach(() => {
    vi.mocked(deletePortrait).mockClear();
});

describe('device images of a document (F-009)', () => {
    it('collects the portrait and images at any depth of the page values', () => {
        const document = {
            data: { metadata: { portraitId: 'p1' } },
            templateValues: {
                crest: device('a'),
                banner: { source: 'url', url: 'https://example.test/x.webp' },
                keepsakes: [{ id: 'e1', value: device('b') }, { id: 'e2' }],
            },
        };
        expect([...deviceImageIdsOf(document)].sort()).toEqual(['a', 'b', 'p1']);
        expect(deviceImageIdsOf(null).size).toBe(0);
    });

    it('deletes a replaced or removed image and keeps the rest', () => {
        seed({ crest: device('old'), banner: device('kept') });
        write((values) => ({ ...values, crest: device('new') }));
        expect(deleted()).toEqual(['old']);

        write((values) => {
            const next = { ...values };
            delete next.crest;
            return next;
        });
        expect(deleted()).toEqual(['old', 'new']);
    });

    it('deletes the image of a removed list entry', () => {
        seed({
            keepsakes: [
                { id: 'e1', value: device('ring') },
                { id: 'e2', value: device('letter') },
            ],
        });
        write((values) => ({
            ...values,
            keepsakes: (values.keepsakes as { id: string }[]).filter(({ id }) => id !== 'e1'),
        }));
        expect(deleted()).toEqual(['ring']);
    });

    it('keeps an image another value of the document still names', () => {
        seed({ crest: device('shared'), banner: device('shared') });
        write((values) => ({ ...values, crest: device('other') }));
        expect(deleted()).toEqual([]);
    });

    it('deletes the page images and the portrait on reset', () => {
        seed({ crest: device('crest'), keepsakes: [{ id: 'e1', value: device('ring') }] }, 'face');
        useDocumentStore.getState().resetDocument('doc-images');
        expect(new Set(deleted())).toEqual(new Set(['crest', 'ring', 'face']));
    });

    it('deletes every image of a purged document', async () => {
        const storage = createMemoryRecordStorage();
        configureRecordStorage(storage);
        purgedIds.clear();
        seed({});
        const stored = {
            ...(useDocumentStore.getState().documents[0] as UnknownDocumentEnvelope),
            templateValues: { crest: device('crest') },
        };
        (stored.data as { metadata: { portraitId?: string } }).metadata.portraitId = 'face';
        await writeRecord('doc-images', stored as UnknownDocumentEnvelope);
        useDocumentStore.setState({ documents: [], entries: [], pendingPurge: ['doc-images'] });

        await purgeDeleted({
            getState: () => useDocumentStore.getState(),
            setState: (partial: Partial<DocumentStoreState>) => useDocumentStore.setState(partial),
            openDocument: (id: string) => useDocumentStore.getState().openDocument(id),
        });
        expect(new Set(deleted())).toEqual(new Set(['crest', 'face']));
        expect(storage.dump().size).toBe(0);
    });
});
