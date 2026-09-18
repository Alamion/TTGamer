import { parseImportedDocument } from '@site/src/sheet_manager/features/sheet/shell/documentFile';
import { migrateDocumentStoreState } from '@site/src/sheet_manager/store/documentStore';
import { migrateTemplateStoreState } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { LENA_VARGA_DOCUMENT } from '@site/src/sheet_manager/systems/v5/modules/hunter/example';
import { describe, expect, it } from 'vitest';

// Hunters saved before the rename carry `systemId: 'v5'`.
const legacyDocument = { ...LENA_VARGA_DOCUMENT, systemId: 'v5' };

describe('renamed V5 system id', () => {
    it('registers the system as wod-v5 only', () => {
        expect(systemRegistry.getSystem('wod-v5')).toBeDefined();
        expect(systemRegistry.getSystem('v5')).toBeUndefined();
    });

    it('reads stored hunters with the old id', () => {
        const state = migrateDocumentStoreState({
            documents: [legacyDocument],
            currentDocumentId: legacyDocument.id,
        });
        expect(state.recoveryEntries).toEqual([]);
        expect(state.documents.map(({ systemId }) => systemId)).toEqual(['wod-v5']);
    });

    it('imports files exported with the old id', () => {
        expect(parseImportedDocument(JSON.parse(JSON.stringify(legacyDocument))).systemId).toBe(
            'wod-v5'
        );
    });

    it('keeps user template copies made with the old id', () => {
        const shipped = systemRegistry
            .getSystem('wod-v5')!
            .defaultTemplates!.find(({ id }) => id === 'v5-hunter-sheet')!;
        const state = migrateTemplateStoreState({
            templates: [{ ...shipped, id: 'my-hunter', systemId: 'v5' }],
        });
        expect(state.quarantine).toEqual([]);
        expect(state.templates.map(({ systemId }) => systemId)).toEqual(['wod-v5']);
    });
});
