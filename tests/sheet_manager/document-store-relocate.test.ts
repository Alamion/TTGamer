import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { beforeEach, describe, expect, it } from 'vitest';

import { ASHEN_ID, CULT_ID, libraryDocument } from './helpers/library';

describe('documentStore.relocateDocuments (spec 013)', () => {
    beforeEach(() => {
        useDocumentStore.setState({
            documents: [
                libraryDocument(
                    'cult-1',
                    { systemId: 'wod-v5', definitionId: CULT_ID, kind: CULT_ID },
                    { settingId: ASHEN_ID, templateId: 'tpl-cultpag1' }
                ),
                libraryDocument(
                    'mortal-1',
                    { systemId: 'wod-v5', definitionId: 'v5-character' },
                    { settingId: ASHEN_ID }
                ),
                libraryDocument('untouched', { systemId: 'wod-v5', definitionId: 'hunter' }),
            ],
            currentDocumentId: null,
        });
    });

    it('applies a batch in one write', () => {
        const before = useDocumentStore.getState().documents;
        let writes = 0;
        const unsubscribe = useDocumentStore.subscribe(() => writes++);
        useDocumentStore.getState().relocateDocuments([
            { id: 'cult-1', systemId: 'wod-2e', settingId: 'user-setting-mist0001' },
            { id: 'mortal-1', settingId: null, templateId: 'tpl-ashmort1' },
        ]);
        unsubscribe();
        expect(writes).toBe(1);
        const [cult, mortal, untouched] = useDocumentStore.getState().documents;
        expect(cult?.systemId).toBe('wod-2e');
        expect(cult?.metadata.settingId).toBe('user-setting-mist0001');
        expect(cult?.metadata.templateId).toBe('tpl-cultpag1');
        expect(mortal?.metadata.settingId).toBeUndefined();
        expect(mortal?.metadata.templateId).toBe('tpl-ashmort1');
        expect(untouched).toBe(before[2]);
    });

    it('clears fields with null and never re-systems shipped definitions', () => {
        useDocumentStore.getState().relocateDocuments([
            { id: 'cult-1', templateId: null },
            { id: 'mortal-1', systemId: 'wod-2e' },
        ]);
        const [cult, mortal] = useDocumentStore.getState().documents;
        expect(cult?.metadata.templateId).toBeUndefined();
        expect(mortal?.systemId).toBe('wod-v5');
    });
});
