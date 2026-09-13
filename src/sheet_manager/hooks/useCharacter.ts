import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useCharacterContext } from '../context/CharacterContext';
import { systemRegistry } from '../systems';
import type { BaseCharacter } from '../types/character';
import { useDocumentSource } from './useDocumentSource';

export function useCharacter() {
    const source = useDocumentSource();
    const { documents, document, updateDocumentData, updateDocumentMetadata } = source;
    const { character: contextChar, readOnly: contextReadOnly } = useCharacterContext();
    const readOnly = contextReadOnly || source.readOnly;

    const storedCharacter = useMemo(() => {
        if (!document) return null;
        const definition = systemRegistry.getDocumentDefinition(
            document.systemId,
            document.definitionId
        );
        return definition?.capabilities?.character?.read(document.id, document.data) ?? null;
    }, [document]);
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
