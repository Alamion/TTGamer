import { BaseCharacterSchema } from '../../types/character';
import type { UnknownDocumentEnvelope } from '../../types/document';
import {
    STAR_WARS_WOD_SYSTEM_ID,
    starWarsCharacterDefinition,
    starWarsDroidDefinition,
} from './index';
import { DroidDataSchema, StarWarsCharacterDataSchema } from './schema';

/**
 * Wraps a flat `BaseCharacter` (legacy persisted records, bundled presets) into a Star Wars
 * document envelope: droids select the droid definition and map inventory/health to
 * built-in equipment/damage; the payload id moves to the envelope.
 */
export function characterDocumentFromBase(input: unknown): UnknownDocumentEnvelope {
    const character = BaseCharacterSchema.parse(input);
    const { id, ...characterData } = character;
    const isDroid = character.metadata.type === 'droid';
    const definition = isDroid ? starWarsDroidDefinition : starWarsCharacterDefinition;
    const data = isDroid
        ? DroidDataSchema.parse({
              ...characterData,
              builtInEquipment: character.inventory,
              damage: character.health,
          })
        : StarWarsCharacterDataSchema.parse(characterData);

    return {
        id,
        kind: definition.kind,
        systemId: STAR_WARS_WOD_SYSTEM_ID,
        definitionId: definition.id,
        schemaVersion: definition.schemaVersion,
        metadata: {
            title: character.metadata.name,
            tags: [],
            preferredViewId: definition.defaultViewId,
        },
        templateValues: {},
        data,
    };
}
