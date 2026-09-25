import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import {
    DocumentDefinitionIdSchema,
    DocumentKindSchema,
    DocumentViewIdSchema,
    SystemIdSchema,
} from '../../types/document';
import type { DocumentDefinition, DocumentViewLabel, SystemPlugin } from '../types';
import { classicWodTraitPool } from '../wod-like/dicePool';
import { buildWod2eCoreBindings } from './ruleset/bindings';
import { wod2eProfile } from './ruleset/profile';
import { createDefaultWod2eCharacterData, Wod2eCharacterDataSchema } from './ruleset/schema';
import { WOD2E_SYSTEM_ID, wod2eTemplates } from './templates';

/**
 * The classic World of Darkness 2nd Edition engine as its own system (spec 012, T-041): an
 * engine-only character with the classic abilities, the base for user settings. No publisher
 * policy applies — the Dark Pack covers World of Darkness 5th Edition material only
 * (constitution 1.4.2).
 */

function templateView(id: string, label: DocumentViewLabel) {
    return {
        id: DocumentViewIdSchema.parse(id),
        label,
        layout: { type: 'declarative' as const, templateId: id },
    };
}

const views = uiMessages.sheet.wod2e.views;
const SHEET_VIEW = templateView('wod2e-sheet', views.sheet);
const BRIEF_VIEW = templateView('wod2e-brief', views.brief);

export const wod2eCharacterDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse('wod2e-character'),
    kind: DocumentKindSchema.parse('character'),
    label: uiMessages.sheet.documents.types.character,
    schemaVersion: 1,
    schema: Wod2eCharacterDataSchema,
    createDefault: createDefaultWod2eCharacterData,
    defaultViewId: SHEET_VIEW.id,
    views: [SHEET_VIEW, BRIEF_VIEW],
    migrate: (data) => data,
};

export const wod2eSystem: SystemPlugin = {
    id: SystemIdSchema.parse(WOD2E_SYSTEM_ID),
    label: uiMessages.sheet.wod2e.system,
    documents: [wod2eCharacterDefinition],
    defaultTemplates: wod2eTemplates,
    templateBindings: buildWod2eCoreBindings(wod2eProfile, new Set(['character'])),
    dice: { traitPool: classicWodTraitPool },
    coreDefinitions: [wod2eCharacterDefinition.id],
};
