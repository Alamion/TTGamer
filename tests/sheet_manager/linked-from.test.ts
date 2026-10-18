// @vitest-environment happy-dom
import {
    findLinkingDocuments,
    LINKED_FROM_LIMIT,
    type LinkedFromScope,
} from '@site/src/sheet_manager/features/documents/linkedFrom';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import { beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

const doc = (
    id: string,
    kind: string,
    templateValues: Record<string, unknown> = {},
    settingId?: string
) =>
    ({
        id,
        kind,
        systemId: 'wod-v5',
        definitionId: kind,
        schemaVersion: 1,
        metadata: { title: id, tags: [], ...(settingId ? { settingId } : {}) },
        templateValues,
        data: {},
    }) as unknown as UnknownDocumentEnvelope;

const groups: LinkedFromScope = {
    systemId: 'wod-v5',
    settingId: undefined,
    kinds: new Set(['v5-group']),
};

beforeEach(() => useDocumentStore.setState({ documents: [], currentDocumentId: null }));

describe('documents linking here (spec 040, D7)', () => {
    it('finds the groups naming a document under any key, by name', async () => {
        useDocumentStore.setState({
            documents: [
                doc('ruiz', 'storyteller'),
                doc('Red Dawn', 'v5-group', { members: ['ruiz', 'mara'] }),
                doc('Archive', 'v5-group', { renamedKey: ['ruiz'] }),
                doc('Lone', 'v5-group', { members: ['mara'] }),
                doc('Cell', 'character', { allies: ['ruiz'] }),
            ],
        });
        const { documents, truncated } = await findLinkingDocuments('ruiz', groups);
        expect(documents.map(({ name }) => name)).toEqual(['Archive', 'Red Dawn']);
        expect(truncated).toBe(false);
    });

    it('stays within the system and setting of the document', async () => {
        useDocumentStore.setState({
            documents: [
                doc('Moon cult', 'v5-group', { members: ['ruiz'] }, 'user-setting-lunar001'),
                doc('Red Dawn', 'v5-group', { members: ['ruiz'] }),
            ],
        });
        const lunar = { ...groups, settingId: 'user-setting-lunar001' };
        expect((await findLinkingDocuments('ruiz', lunar)).documents.map(({ id }) => id)).toEqual([
            'Moon cult',
        ]);
        expect((await findLinkingDocuments('ruiz', groups)).documents.map(({ id }) => id)).toEqual([
            'Red Dawn',
        ]);
    });

    it('reads at most the first 200 candidates by name and reports the rest', async () => {
        useDocumentStore.setState({
            documents: Array.from({ length: LINKED_FROM_LIMIT + 5 }, (_, index) =>
                doc(`g${String(index).padStart(3, '0')}`, 'v5-group', { members: ['ruiz'] })
            ),
        });
        const { documents, truncated } = await findLinkingDocuments('ruiz', groups);
        expect(documents).toHaveLength(LINKED_FROM_LIMIT);
        expect(truncated).toBe(true);
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['linked-from-truncated']);
    });
});
