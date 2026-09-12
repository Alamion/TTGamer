import { SystemRegistry } from './registry';
import { starWarsWodSystem } from './star-wars-wod';

export const systemRegistry = new SystemRegistry([starWarsWodSystem]);

export type { CharacterDocumentCapability, DocumentCapabilities } from './capabilities';
export { SystemRegistry } from './registry';
export type {
    CreatureData,
    DroidData,
    FodderData,
    StarWarsCharacterData,
    VehicleData,
} from './star-wars-wod';
export {
    starWarsCharacterDefinition,
    starWarsCreatureDefinition,
    starWarsDroidDefinition,
    starWarsFodderDefinition,
    starWarsVehicleDefinition,
    starWarsWodProfile,
    starWarsWodSystem,
} from './star-wars-wod';
export type {
    DocumentBindingDescriptor,
    DocumentBindingKind,
    EquipmentBinding,
    FieldBinding,
    ListBinding,
    ResourceBinding,
    SystemListShape,
    TrackBinding,
    TraitBinding,
} from './templateBindings';
export type {
    BuiltInDocumentLayout,
    DeclarativeDocumentLayout,
    DocumentDefinition,
    DocumentLayout,
    DocumentViewDefinition,
    ParsedRegisteredDocument,
    SheetBlockPlacement,
    SystemPlugin,
} from './types';
export type { EffectiveTemplate, ResolvedCustomTemplate } from './view';
export { resolveCustomTemplate, resolveDocumentView, resolveEffectiveTemplate } from './view';
export * from './wod-like';
