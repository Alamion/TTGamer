import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import {
    DocumentDefinitionIdSchema,
    DocumentKindSchema,
    DocumentViewIdSchema,
} from '../../../../types/document';
import type { DocumentDefinition, DocumentViewLabel } from '../../../types';
import { createHunterDefault, HunterSchema } from './schema';

const views = uiMessages.sheet.v5Hunter.views;

function templateView(id: string, label: DocumentViewLabel) {
    return {
        id: DocumentViewIdSchema.parse(id),
        label,
        layout: { type: 'declarative' as const, templateId: id },
    };
}

export const HUNTER_SHEET_VIEW = templateView('v5-hunter-sheet', views.sheet);
export const HUNTER_BRIEF_VIEW = templateView('v5-hunter-brief', views.brief);

export const hunterDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse('hunter'),
    kind: DocumentKindSchema.parse('character'),
    label: uiMessages.sheet.documents.types.character,
    schemaVersion: 1,
    schema: HunterSchema,
    createDefault: createHunterDefault,
    defaultViewId: HUNTER_SHEET_VIEW.id,
    views: [HUNTER_SHEET_VIEW, HUNTER_BRIEF_VIEW],
    // Schema version 1 is the first; later versions add steps here.
    migrate: (data) => data,
    module: { id: 'hunter', label: uiMessages.sheet.v5Hunter.module, policies: ['dark-pack'] },
};
