import { createContext, useContext, useMemo } from 'react';

import type { DocumentStoreState } from '../store/documentStore';
import { useDocumentStore } from '../store/documentStore';
import type { UnknownDocumentEnvelope } from '../types/document';

/**
 * Where sheet renderers read and write their document. By default the editable store's current
 * document; a `DocumentSourceContext` provider substitutes another source (e.g. a read-only
 * preset embedded in documentation) without the renderers knowing.
 */
export interface DocumentSource {
    documents: readonly UnknownDocumentEnvelope[];
    document: UnknownDocumentEnvelope | undefined;
    readOnly: boolean;
    updateDocumentData: DocumentStoreState['updateDocumentData'];
    updateDocumentMetadata: DocumentStoreState['updateDocumentMetadata'];
    updateTemplateValues: DocumentStoreState['updateTemplateValues'];
}

export const DocumentSourceContext = createContext<DocumentSource | null>(null);

const ignoreWrite = () => undefined;

/** A read-only source around one fixed document; every write is ignored. */
export function createStaticDocumentSource(document: UnknownDocumentEnvelope): DocumentSource {
    return {
        documents: [document],
        document,
        readOnly: true,
        updateDocumentData: ignoreWrite,
        updateDocumentMetadata: ignoreWrite,
        updateTemplateValues: ignoreWrite,
    };
}

export function useDocumentSource(): DocumentSource {
    const override = useContext(DocumentSourceContext);
    const {
        currentDocumentId,
        documents,
        updateDocumentData,
        updateDocumentMetadata,
        updateTemplateValues,
    } = useDocumentStore();
    const storeSource = useMemo<DocumentSource>(
        () => ({
            documents,
            document: documents.find(({ id }) => id === currentDocumentId),
            readOnly: false,
            updateDocumentData,
            updateDocumentMetadata,
            updateTemplateValues,
        }),
        [
            currentDocumentId,
            documents,
            updateDocumentData,
            updateDocumentMetadata,
            updateTemplateValues,
        ]
    );
    return override ?? storeSource;
}

/** The shown document's system and definition, handed to the dice roller with each roll. */
export function useDocumentRollSource(): { systemId: string; definitionId: string } | undefined {
    const { document } = useDocumentSource();
    const systemId = document?.systemId;
    const definitionId = document?.definitionId;
    return useMemo(
        () => (systemId && definitionId ? { systemId, definitionId } : undefined),
        [systemId, definitionId]
    );
}
