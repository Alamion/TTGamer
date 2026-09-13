import { useCallback, useMemo } from 'react';

import { useCharacterContext } from '../../../context/CharacterContext';
import { describeError, reportSheetIssue } from '../../../diagnostics';
import { useDocumentSource } from '../../../hooks/useDocumentSource';
import { systemRegistry } from '../../../systems';
import type { BaseCharacter } from '../../../types/character';

export interface BoundDocument {
    /** Document data as bindings address it (the character view for character documents). */
    data: Readonly<Record<string, unknown>>;
    readOnly: boolean;
    /** Merges top-level keys into document data; a schema rejection is reported, not thrown. */
    update: (updates: Record<string, unknown>) => void;
    /** Renames the document (entity pages keep the title in step with their name field). */
    setTitle: (title: string) => void;
    /** Display name for roll labels, when the document has one. */
    name?: string;
}

/**
 * Data access for bound template elements, independent of document kind: character documents
 * go through their character capability (droids map damage/built-in equipment); every other
 * kind reads and writes its typed document data directly, re-parsed by its schema on write.
 */
export function useBoundDocument(): BoundDocument | undefined {
    const source = useDocumentSource();
    const { character: contextCharacter, readOnly: contextReadOnly } = useCharacterContext();
    const { document, updateDocumentData, updateDocumentMetadata } = source;
    const readOnly = contextReadOnly || source.readOnly;

    const capability = useMemo(() => {
        if (!document) return undefined;
        return systemRegistry.getDocumentDefinition(document.systemId, document.definitionId)
            ?.capabilities?.character;
    }, [document]);

    const character = useMemo<BaseCharacter | undefined>(() => {
        if (contextCharacter) return contextCharacter;
        if (!document || !capability) return undefined;
        try {
            return capability.read(document.id, document.data);
        } catch {
            // Bound elements that need the data report their own degraded state.
            return undefined;
        }
    }, [capability, contextCharacter, document]);

    const documentId = document?.id;

    const update = useCallback(
        (updates: Record<string, unknown>) => {
            if (readOnly || !documentId) return;
            try {
                updateDocumentData(documentId, (data) =>
                    capability
                        ? capability.applyUpdates(data, updates as Partial<BaseCharacter>)
                        : { ...(data as Record<string, unknown>), ...updates }
                );
                const metadata = updates.metadata as { name?: unknown } | undefined;
                if (capability && typeof metadata?.name === 'string') {
                    updateDocumentMetadata(documentId, { title: metadata.name });
                }
            } catch (error) {
                reportSheetIssue({
                    code: 'template-value-write-rejected',
                    message: 'Bound document write failed schema validation; nothing was written',
                    details: {
                        documentId,
                        keys: Object.keys(updates),
                        error: describeError(error),
                    },
                });
            }
        },
        [capability, documentId, readOnly, updateDocumentData, updateDocumentMetadata]
    );

    const setTitle = useCallback(
        (title: string) => {
            if (readOnly || !documentId) return;
            updateDocumentMetadata(documentId, { title });
        },
        [documentId, readOnly, updateDocumentMetadata]
    );

    return useMemo(() => {
        if (character) {
            return {
                data: character as unknown as Record<string, unknown>,
                readOnly,
                update,
                setTitle,
                name: character.metadata.name,
            };
        }
        if (capability || !document || typeof document.data !== 'object' || !document.data) {
            return undefined;
        }
        return {
            data: document.data as Record<string, unknown>,
            readOnly,
            update,
            setTitle,
            name: document.metadata.title || undefined,
        };
    }, [capability, character, document, readOnly, setTitle, update]);
}
