import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import {
    createHunterDefault,
    type HunterData,
    HunterSchema,
} from '@site/src/sheet_manager/systems/v5';

export const HUNTER_DOCUMENT_ID = 'doc-hunter';

export function hunterData(overrides: Record<string, unknown> = {}): HunterData {
    return HunterSchema.parse({ ...createHunterDefault(), ...overrides });
}

export function seedHunter(data: HunterData = hunterData(), extra: unknown[] = []) {
    useDocumentStore.setState({
        documents: [
            {
                id: HUNTER_DOCUMENT_ID,
                kind: 'character',
                systemId: 'v5',
                definitionId: 'hunter',
                schemaVersion: 1,
                metadata: { title: 'Lena', tags: [] },
                templateValues: {},
                data,
            } as never,
            ...(extra as never[]),
        ],
        currentDocumentId: HUNTER_DOCUMENT_ID,
    });
}

export function currentHunter(): HunterData {
    const document = useDocumentStore
        .getState()
        .documents.find(({ id }) => id === HUNTER_DOCUMENT_ID)!;
    return document.data as HunterData;
}
