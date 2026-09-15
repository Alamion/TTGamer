import {
    buildDocumentExport,
    exportFileName,
    parseImportedDocument,
    serializeDocumentExport,
} from '@site/src/sheet_manager/features/sheet/shell/documentFile';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { PUBLISHER_POLICIES } from '@site/src/sheet_manager/systems';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod/schema';
import { LENA_VARGA_DOCUMENT } from '@site/src/sheet_manager/systems/v5/modules/hunter/example';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import { describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../../../setup/sheetIssues';

const hunter: UnknownDocumentEnvelope = { ...LENA_VARGA_DOCUMENT, id: 'lena-1' };
const starWars = {
    id: 'jax',
    kind: 'character',
    systemId: 'star-wars-wod',
    definitionId: 'character',
    schemaVersion: 1,
    metadata: { title: 'Jax Vorn', tags: [] },
    templateValues: {},
    data: createDefaultStarWarsCharacterData(),
} as unknown as UnknownDocumentEnvelope;

describe('hunter document files', () => {
    it('exports system, module, and the Dark Pack notice', () => {
        const exported = JSON.parse(serializeDocumentExport(hunter));
        expect(exported).toMatchObject({ systemId: 'v5', definitionId: 'hunter' });
        expect(exported.notices).toEqual([
            {
                policy: 'dark-pack',
                text: [...PUBLISHER_POLICIES['dark-pack'].officialNotice],
                url: PUBLISHER_POLICIES['dark-pack'].url,
            },
        ]);
    });

    it('names files after the title, falling back to the definition id', () => {
        expect(exportFileName(hunter)).toBe('ttgamer_Lena_Varga.json');
        expect(exportFileName({ ...hunter, metadata: { ...hunter.metadata, title: ' ' } })).toBe(
            'ttgamer_hunter.json'
        );
    });

    it('re-imports an identical document and drops the notices', () => {
        const imported = parseImportedDocument(JSON.parse(serializeDocumentExport(hunter)));
        expect(imported).not.toHaveProperty('notices');
        expect(imported.data).toEqual(hunter.data);
        expect(imported.metadata.title).toBe('Lena Varga');
    });

    it('writes no notices for Star Wars documents and still round-trips them', () => {
        expect(buildDocumentExport(starWars)).not.toHaveProperty('notices');
        const imported = parseImportedDocument(JSON.parse(serializeDocumentExport(starWars)));
        expect(imported.definitionId).toBe('character');
    });

    it('rejects out-of-range data and keeps the file in recovery', () => {
        const tampered = JSON.parse(serializeDocumentExport(hunter));
        tampered.data.attributes.strength.value = 9;
        let error: unknown;
        try {
            parseImportedDocument(tampered);
        } catch (caught) {
            error = caught;
        }
        expect(error).toBeDefined();
        takeSheetIssues();
        useDocumentStore.setState({ recoveryEntries: [] });
        useDocumentStore.getState().retainImportForRecovery(tampered, error);
        expect(useDocumentStore.getState().recoveryEntries).toEqual([tampered]);
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['document-recovered']);
    });
});
