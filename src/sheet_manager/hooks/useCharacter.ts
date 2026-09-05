import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useCharacterContext } from '../context/CharacterContext';
import { useDocumentStore } from '../store/documentStore';
import { systemRegistry } from '../systems';
import type { BaseCharacter } from '../types/character';

export function useCharacter() {
    const { currentDocumentId, documents, updateDocumentData, updateDocumentMetadata } =
        useDocumentStore();
    const { character: contextChar, readOnly } = useCharacterContext();

    const storedCharacter = useMemo(() => {
        const document = documents.find(({ id }) => id === currentDocumentId);
        if (!document) return null;
        const definition = systemRegistry.getDocumentDefinition(
            document.systemId,
            document.definitionId
        );
        return definition?.capabilities?.character?.read(document.id, document.data) ?? null;
    }, [currentDocumentId, documents]);
    const character = contextChar ?? storedCharacter;

    const characterRef = useRef(character);
    const readOnlyRef = useRef(readOnly);

    useEffect(() => {
        characterRef.current = character;
        readOnlyRef.current = readOnly;
    }, [character, readOnly]);

    const updateCharacter = useCallback(
        (id: string, updates: Partial<BaseCharacter>) => {
            if (readOnlyRef.current || !characterRef.current) return;
            const document = documents.find((candidate) => candidate.id === id);
            if (!document) return;
            const capability = systemRegistry.getDocumentDefinition(
                document.systemId,
                document.definitionId
            )?.capabilities?.character;
            if (!capability) return;
            updateDocumentData(id, (data) => capability.applyUpdates(data, updates));
            if (updates.metadata?.name !== undefined) {
                updateDocumentMetadata(id, { title: updates.metadata.name });
            }
        },
        [documents, updateDocumentData, updateDocumentMetadata]
    );

    return { character, readOnly, updateCharacter };
}
