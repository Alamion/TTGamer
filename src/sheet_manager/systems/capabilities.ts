import type { BaseCharacter } from '../types/character';

export interface CharacterDocumentCapability {
    read: (documentId: string, data: unknown) => BaseCharacter;
    applyUpdates: (data: unknown, updates: Partial<BaseCharacter>) => unknown;
}

export interface DocumentCapabilities {
    character?: CharacterDocumentCapability;
}

type CharacterRead = { character: BaseCharacter } | { error: unknown };

const characterReads = new WeakMap<CharacterDocumentCapability, WeakMap<object, CharacterRead>>();

/**
 * The character view of a stored document, parsed once per document object: every bound element
 * of a sheet reads it, and stored documents are replaced, never mutated, on change. Throws what
 * the capability throws.
 */
export function readCharacter(
    capability: CharacterDocumentCapability,
    document: { id: string; data?: unknown }
): BaseCharacter {
    let reads = characterReads.get(capability);
    if (!reads) characterReads.set(capability, (reads = new WeakMap()));
    let read = reads.get(document);
    if (!read) {
        try {
            read = { character: capability.read(document.id, document.data) };
        } catch (error) {
            read = { error };
        }
        reads.set(document, read);
    }
    if ('error' in read) throw read.error;
    return read.character;
}
