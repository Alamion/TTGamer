import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import {
    DocumentDefinitionIdSchema,
    DocumentKindSchema,
    DocumentViewIdSchema,
} from '../../../types/document';
import type { DocumentDefinition, DocumentViewLabel } from '../../types';
import { createV5CoreDefault, V5CoreSchema } from '../ruleset/schema';

const views = uiMessages.sheet.v5.core.views;

function templateView(id: string, label: DocumentViewLabel) {
    return {
        id: DocumentViewIdSchema.parse(id),
        label,
        layout: { type: 'declarative' as const, templateId: id },
    };
}

/**
 * The V5 character without a module (spec 012, research R18). Its kind is `mortal`, not
 * `character`: template compatibility and bindings key on system + kind, so Hunter pages and
 * Hunter-only bindings never apply to it, and the reverse.
 */
export const v5CharacterDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse('v5-character'),
    kind: DocumentKindSchema.parse('mortal'),
    label: uiMessages.sheet.v5.core.type,
    schemaVersion: 1,
    schema: V5CoreSchema,
    createDefault: createV5CoreDefault,
    defaultViewId: DocumentViewIdSchema.parse('v5-core-sheet'),
    views: [templateView('v5-core-sheet', views.sheet), templateView('v5-core-brief', views.brief)],
    migrate: (data) => data,
};
