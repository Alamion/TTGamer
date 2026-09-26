import { useDocumentTypeStore } from '../store/documentTypeStore';
import { useTemplateStore } from '../store/templateStore';
import { SystemRegistry } from './registry';
import { starWarsWodSystem } from './star-wars-wod';
import { v5System } from './v5';
import { wod2eSystem } from './wod2e';

export const systemRegistry = new SystemRegistry([starWarsWodSystem, wod2eSystem, v5System]);

/** Keeps the registry's user-type overlay in step with the type and template stores. */
function syncUserDocumentTypes(): void {
    const { types, settings } = useDocumentTypeStore.getState();
    systemRegistry.setUserDocumentTypes({
        types,
        settings,
        templates: useTemplateStore.getState().templates,
    });
}
syncUserDocumentTypes();
useDocumentTypeStore.subscribe(syncUserDocumentTypes);
useTemplateStore.subscribe(syncUserDocumentTypes);

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
export { anyCatalog, bookNameLabel, bookNameOf, defineCatalog } from './catalogs';
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
    DiceOutcome,
    DiceReadingLine,
    DocumentDefinition,
    DocumentLayout,
    DocumentModule,
    DocumentViewDefinition,
    DocumentViewLabel,
    ParsedRegisteredDocument,
    RollReadingRules,
    SystemDiceRules,
    SystemPlugin,
    TraitPoolFlags,
} from './types';
export type { EffectiveTemplate, ResolvedCustomTemplate } from './view';
export {
    isTemplateCompatible,
    resolveCustomTemplate,
    resolveDocumentView,
    resolveEffectiveTemplate,
} from './view';
export * from './wod-like';
