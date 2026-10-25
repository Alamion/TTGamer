import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { SystemPlugin } from '../types';
import { GENERAL_SYSTEM_ID, noteDefinition, noteTemplate, noteTemplateBindings } from './note';
import { noteFileFormat } from './noteFiles';

const library = uiMessages.sheet.general.library;

/**
 * Documents outside every game system (spec 043, D3): a ruleset without dice, publisher policies,
 * or catalogs. Its definitions are core definitions, so a user setting on it holds its own
 * system-neutral types (a "Location" with a markdown description).
 */
export const generalSystem: SystemPlugin = {
    id: GENERAL_SYSTEM_ID,
    label: uiMessages.sheet.general.system,
    documents: [{ ...noteDefinition, files: noteFileFormat }],
    defaultTemplates: [noteTemplate],
    templateBindings: noteTemplateBindings,
    coreDefinitions: [noteDefinition.id],
    library: {
        intro: library.intro,
        ownTypes: library.ownTypes,
        ownTypesNote: library.ownTypesNote,
        coreTypes: library.coreTypes,
        coreTypeNote: library.coreTypeNote,
    },
};
