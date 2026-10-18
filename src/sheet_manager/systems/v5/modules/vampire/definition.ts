import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import {
    DocumentDefinitionIdSchema,
    DocumentKindSchema,
    DocumentViewIdSchema,
} from '../../../../types/document';
import type { DocumentDefinition, DocumentViewLabel } from '../../../types';
import { OTTILIE_BRANDT_DOCUMENT } from './antagonist';
import { MIRELA_VOSS_DOCUMENT } from './example';
import { createVampireDefault, VampireSchema } from './schema';

const views = uiMessages.sheet.v5Vampire.views;

function templateView(id: string, label: DocumentViewLabel) {
    return {
        id: DocumentViewIdSchema.parse(id),
        label,
        layout: { type: 'declarative' as const, templateId: id },
    };
}

export const VAMPIRE_SHEET_VIEW = templateView('v5-vampire-sheet', views.sheet);
export const VAMPIRE_BRIEF_VIEW = templateView('v5-vampire-brief', views.brief);

export const vampireDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse('vampire'),
    kind: DocumentKindSchema.parse('vampire'),
    label: uiMessages.sheet.documents.types.character,
    schemaVersion: 1,
    schema: VampireSchema,
    createDefault: createVampireDefault,
    defaultViewId: VAMPIRE_SHEET_VIEW.id,
    views: [VAMPIRE_SHEET_VIEW, VAMPIRE_BRIEF_VIEW],
    // Schema version 1 is the first; later versions add steps here.
    migrate: (data) => data,
    module: {
        id: 'vampire',
        label: uiMessages.sheet.v5Vampire.module,
        policies: ['dark-pack'],
    },
    examples: [
        {
            id: MIRELA_VOSS_DOCUMENT.id,
            label: uiMessages.sheet.documents.examples.mirelaVoss,
            create: () => MIRELA_VOSS_DOCUMENT,
        },
        {
            id: OTTILIE_BRANDT_DOCUMENT.id,
            label: uiMessages.sheet.documents.examples.ottilieBrandt,
            create: () => OTTILIE_BRANDT_DOCUMENT,
        },
    ],
};
