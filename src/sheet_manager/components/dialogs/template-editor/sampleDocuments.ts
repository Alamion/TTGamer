import { systemRegistry } from '../../../systems';
import type { DocumentDefinition, DocumentExample } from '../../../systems/types';
import type { UnknownDocumentEnvelope } from '../../../types/document';

export const SAMPLE_DOCUMENT_ID = 'template-editor-sample';

/** The definition a template of this system and kind renders (the first registered one). */
export function findTemplateDefinition(
    systemId: string,
    documentKind: string,
    definitionId?: string
): DocumentDefinition | undefined {
    const entries = systemRegistry
        .listDefinitions()
        .filter(
            ({ system, definition }) => system.id === systemId && definition.kind === documentKind
        );
    return (
        entries.find(({ definition }) => definition.id === definitionId)?.definition ??
        entries[0]?.definition
    );
}

export function blankDocument(
    systemId: string,
    definition: DocumentDefinition
): UnknownDocumentEnvelope {
    return {
        id: SAMPLE_DOCUMENT_ID,
        kind: definition.kind,
        systemId: systemId as UnknownDocumentEnvelope['systemId'],
        definitionId: definition.id,
        schemaVersion: definition.schemaVersion,
        metadata: { title: '', tags: [] },
        templateValues: {},
        data: definition.schema.parse(definition.createDefault()),
    };
}

/** Whether a stored document can stand in for the template's sample data. */
export function isCompatibleDocument(
    document: UnknownDocumentEnvelope | undefined,
    systemId: string,
    documentKind: string
): document is UnknownDocumentEnvelope {
    return (
        document !== undefined && document.systemId === systemId && document.kind === documentKind
    );
}

export function definitionExamples(definition: DocumentDefinition): readonly DocumentExample[] {
    return definition.examples ?? [];
}
