import { useCallback, useMemo } from 'react';

import type { TraitDiceRoll } from '../../../components/stat-fields/StatDiceButton';
import { useCharacterContext } from '../../../context/CharacterContext';
import { describeError, reportSheetIssue } from '../../../diagnostics';
import { useDocumentSource } from '../../../hooks/useDocumentSource';
import { systemRegistry } from '../../../systems';
import type { CharacterView } from '../../../systems/capabilities';
import { readCharacter } from '../../../systems/capabilities';
import { kindLabel, rollNameOf } from '../data/documentLabels';

export interface BoundDocument {
    /** Document data as bindings address it (the character view for character documents). */
    data: Readonly<Record<string, unknown>>;
    readOnly: boolean;
    /** Merges top-level keys into document data; a schema rejection is reported, not thrown. */
    update: (updates: Record<string, unknown>) => void;
    /** Renames the document (entity pages keep the title in step with their name field). */
    setTitle: (title: string) => void;
    /** The document's name, when it has one. */
    name?: string;
    /** What rolls are named after: the name, else the document's kind (spec 045, D7). */
    rollName?: string;
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

    const character = useMemo<CharacterView | undefined>(() => {
        if (contextCharacter) return contextCharacter;
        if (!document || !capability) return undefined;
        try {
            return readCharacter(capability, document);
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
                        ? capability.applyUpdates(data, updates as Partial<CharacterView>)
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
                rollName:
                    character.metadata.name ||
                    (document ? kindLabel(document.systemId, document.kind) : undefined),
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
            rollName: rollNameOf(document),
        };
    }, [capability, character, document, readOnly, setTitle, update]);
}

/** The document system's stat pool builder; `undefined` when the system rolls no stat dice. */
export function useDocumentTraitDiceRoll(): TraitDiceRoll | undefined {
    const { document } = useDocumentSource();
    const systemId = document?.systemId;
    return useMemo(() => {
        const traitPool = systemId
            ? systemRegistry.getSystem(systemId)?.dice?.traitPool
            : undefined;
        if (!traitPool) return undefined;
        return (value, specialization, experienced, practiced) =>
            traitPool(value, { specialization, experienced, practiced });
    }, [systemId]);
}
