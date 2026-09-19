import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { SystemIdSchema } from '../../types/document';
import type { SystemPlugin } from '../types';
import { hunterTemplateBindings } from './modules/hunter/bindings';
import { hunterCatalogs } from './modules/hunter/catalogs';
import { hunterDefinition } from './modules/hunter/definition';
import { hunterBriefTemplate } from './modules/hunter/templates/brief';
import { hunterSheetTemplate } from './modules/hunter/templates/sheet';

/**
 * World of Darkness 5th Edition (V5) system plugin.
 *
 * Layering (constitution I): this plugin is the **ruleset** — `ruleset/` owns the mechanics every
 * V5 line shares (attributes, skills, Health/Willpower severity tracks, advantages, experience).
 * Each supernatural line is a **module** under `modules/<line>/` that contributes its own document
 * definitions, catalogs, bindings, and templates on top of the ruleset. A document names the
 * ruleset through `systemId: 'wod-v5'` and its module through `DocumentDefinition.module.id`.
 */
export const V5_SYSTEM_ID = SystemIdSchema.parse('wod-v5');

export const v5System: SystemPlugin = {
    id: V5_SYSTEM_ID,
    label: uiMessages.sheet.v5.system,
    policies: ['dark-pack'],
    documents: [hunterDefinition],
    defaultTemplates: [hunterSheetTemplate, hunterBriefTemplate],
    templateBindings: hunterTemplateBindings,
    catalogs: hunterCatalogs,
};

export { hunterDefinition } from './modules/hunter/definition';
export type { HunterData } from './modules/hunter/schema';
export { createHunterDefault, HunterSchema } from './modules/hunter/schema';
