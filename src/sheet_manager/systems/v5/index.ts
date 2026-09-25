import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { SystemIdSchema } from '../../types/document';
import type { SystemPlugin } from '../types';
import { v5CharacterDefinition } from './core/definition';
import { v5CoreBriefTemplate, v5CoreSheetTemplate } from './core/templates';
import { hunterTemplateBindings } from './modules/hunter/bindings';
import { hunterCatalogs } from './modules/hunter/catalogs';
import { hunterDefinition } from './modules/hunter/definition';
import { desperationDiceLine } from './modules/hunter/dice';
import { hunterBriefTemplate } from './modules/hunter/templates/brief';
import { hunterSheetTemplate } from './modules/hunter/templates/sheet';
import { hungerDiceLine } from './modules/vampire/dice';
import { buildV5CoreBindings } from './ruleset/bindings';
import { createV5DiceRules } from './ruleset/dice';

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
    documents: [hunterDefinition, v5CharacterDefinition],
    defaultTemplates: [
        hunterSheetTemplate,
        hunterBriefTemplate,
        v5CoreSheetTemplate,
        v5CoreBriefTemplate,
    ],
    templateBindings: [...hunterTemplateBindings, ...buildV5CoreBindings(new Set(['mortal']))],
    catalogs: hunterCatalogs,
    dice: createV5DiceRules([hungerDiceLine, desperationDiceLine]),
    coreDefinitions: [v5CharacterDefinition.id],
};

export { hunterDefinition } from './modules/hunter/definition';
export { desperationDiceLine } from './modules/hunter/dice';
export type { HunterData } from './modules/hunter/schema';
export { createHunterDefault, HunterSchema } from './modules/hunter/schema';
export { hungerDiceLine } from './modules/vampire/dice';
export { createV5DiceReading } from './ruleset/dice';
