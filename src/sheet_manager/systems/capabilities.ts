import type { ConditionMark } from '../types/condition';
import type { ArmorItem, ImplantItem, Item, WeaponItem } from '../types/equipment';
import type { TraitValue } from '../types/trait';

/**
 * What generic sheet code reads of a character: its id, its name and kind, its traits, health,
 * and the equipment lists. A system's character schema satisfies it; everything else stays inside the system.
 */
export interface CharacterView {
    id: string;
    metadata: { name: string; type: string };
    attributes: Record<string, TraitValue>;
    skills: Record<string, TraitValue>;
    health: { levels: ConditionMark[] };
    inventory: Item[];
    armor: ArmorItem[];
    weapons: WeaponItem[];
    implants: ImplantItem[];
}

export interface CharacterDocumentCapability {
    read(documentId: string, data: unknown): CharacterView;
    applyUpdates(data: unknown, updates: Partial<CharacterView>): unknown;
}

export interface DocumentCapabilities {
    character?: CharacterDocumentCapability;
}

type CharacterRead = { character: CharacterView } | { error: unknown };

const characterReads = new WeakMap<CharacterDocumentCapability, WeakMap<object, CharacterRead>>();

/**
 * The character view of a stored document, parsed once per document object: every bound element
 * of a sheet reads it, and stored documents are replaced, never mutated, on change. Throws what
 * the capability throws.
 */
export function readCharacter(
    capability: CharacterDocumentCapability,
    document: { id: string; data?: unknown }
): CharacterView {
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
