import type { BaseCharacter } from '../types/character';

export interface CharacterDocumentCapability {
    read: (documentId: string, data: unknown) => BaseCharacter;
    applyUpdates: (data: unknown, updates: Partial<BaseCharacter>) => unknown;
}

export interface DocumentCapabilities {
    character?: CharacterDocumentCapability;
}
