import { createContext, useContext, useMemo } from 'react';
import { create } from 'zustand';

import { reportSheetIssue } from '../diagnostics';
import { applyTemplateValueWrites } from '../features/sheet/data/templateValueWrites';
import type { DocumentStoreState } from '../store/documentStore';
import { useDocumentStore } from '../store/documentStore';
import type { DocumentDefinition } from '../systems/types';
import type { UnknownDocumentEnvelope } from '../types/document';
import { DocumentMetadataSchema } from '../types/document';
import type { TemplatePageValues } from '../types/templateValues';

/**
 * Where sheet renderers read and write their document. By default the editable store's current
 * document; a `DocumentSourceContext` provider substitutes another source (e.g. a read-only
 * preset embedded in documentation) without the renderers knowing.
 */
export interface DocumentSource {
    documents: readonly UnknownDocumentEnvelope[];
    document: UnknownDocumentEnvelope | undefined;
    readOnly: boolean;
    /**
     * A preview never leaves itself: reference fields do not switch the workspace's document
     * and missing reference targets are not reported. Static and scratch sources are previews.
     */
    preview: boolean;
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
        preview: true,
        updateDocumentData: ignoreWrite,
        updateDocumentMetadata: ignoreWrite,
        updateTemplateValues: ignoreWrite,
    };
}

export interface ScratchDocumentSource {
    /** Subscribes React to the scratch envelope; returns the current source. */
    useSource(): DocumentSource;
    getDocument(): UnknownDocumentEnvelope;
    reset(document: UnknownDocumentEnvelope): void;
}

/**
 * A writable, in-memory copy of one document (the template editor's sample data). Writes follow
 * the document store's rules — data re-parsed with the definition schema, metadata merged,
 * template values validated through the shared write path — but never reach the store.
 */
export function createScratchDocumentSource(
    initial: UnknownDocumentEnvelope,
    definition: Pick<DocumentDefinition, 'schema'>
): ScratchDocumentSource {
    const store = create<{ document: UnknownDocumentEnvelope }>(() => ({ document: initial }));
    const update = (change: (document: UnknownDocumentEnvelope) => UnknownDocumentEnvelope) =>
        store.setState(({ document }) => ({ document: change(document) }));

    const updateDocumentData: DocumentSource['updateDocumentData'] = (id, updater) => {
        const { document } = store.getState();
        if (document.id !== id) return;
        const parsed = definition.schema.safeParse(updater(document.data));
        if (!parsed.success) {
            reportSheetIssue({
                code: 'template-value-write-rejected',
                message: 'Sample data write failed validation; the write was discarded',
                details: { documentId: id, key: '<data>', reason: 'schema' },
            });
            return;
        }
        update((current) => ({ ...current, data: parsed.data }));
    };
    const updateDocumentMetadata: DocumentSource['updateDocumentMetadata'] = (id, updates) => {
        if (store.getState().document.id !== id) return;
        update((current) => ({
            ...current,
            metadata: DocumentMetadataSchema.parse({ ...current.metadata, ...updates }),
        }));
    };
    const updateTemplateValues: DocumentSource['updateTemplateValues'] = (
        id,
        template,
        updater
    ) => {
        const { document } = store.getState();
        if (document.id !== id) return;
        const previous = (document.templateValues ?? {}) as TemplatePageValues;
        const result = applyTemplateValueWrites(template, previous, updater(previous));
        if (!result.ok) {
            reportSheetIssue({
                code: 'template-value-write-rejected',
                message: 'Template value failed validation; the write was discarded',
                details: {
                    documentId: id,
                    templateId: template.id,
                    key: result.key,
                    reason: result.reason,
                },
            });
            return;
        }
        update((current) => ({ ...current, templateValues: result.values }));
    };

    const toSource = (document: UnknownDocumentEnvelope): DocumentSource => ({
        documents: [document],
        document,
        readOnly: false,
        preview: true,
        updateDocumentData,
        updateDocumentMetadata,
        updateTemplateValues,
    });

    return {
        useSource() {
            const document = store((state) => state.document);
            return useMemo(() => toSource(document), [document]);
        },
        getDocument: () => store.getState().document,
        reset: (document) => store.setState({ document }),
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
            preview: false,
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
