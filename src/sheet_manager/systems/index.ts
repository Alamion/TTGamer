import { SystemRegistry } from './registry';
import { starWarsWodSystem } from './star-wars-wod';
import { v5System } from './v5';

export const systemRegistry = new SystemRegistry([starWarsWodSystem, v5System]);

export type { CharacterDocumentCapability, DocumentCapabilities } from './capabilities';
export type {
    CatalogBindingEntry,
    CatalogBrowse,
    CatalogBrowseColumn,
    CatalogDetailRow,
    CatalogDetailValue,
    CatalogFillableDetail,
    CatalogFillKind,
    CatalogLike,
    CatalogMessage,
} from './catalogs';
export { anyCatalog, defineCatalog } from './catalogs';
export type { PolicyId, PublisherPolicy } from './policies';
export {
    exportNotices,
    PUBLISHER_POLICIES,
    resolveDocumentPolicies,
    resolveSystemPolicies,
} from './policies';
export { documentSettingLabel, SystemRegistry } from './registry';
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
    DeclarativeDocumentLayout,
    DocumentDefinition,
    DocumentLayout,
    DocumentModule,
    DocumentViewDefinition,
    DocumentViewLabel,
    ParsedRegisteredDocument,
    SystemPlugin,
} from './types';
export type { EffectiveTemplate, ResolvedCustomTemplate } from './view';
export {
    isTemplateCompatible,
    resolveCustomTemplate,
    resolveDocumentView,
    resolveEffectiveTemplate,
} from './view';
export * from './wod-like';
