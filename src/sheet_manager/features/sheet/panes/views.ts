import type { DocumentIndexEntry } from '../../../store/documentIndex';
import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import type { DocumentDefinition } from '../../../systems';
import { systemRegistry } from '../../../systems';
import { selectableViews } from '../shell/ViewModeSelect';

/** Prefix of a view value that names a custom page instead of a built-in view. */
export const TEMPLATE_VIEW_PREFIX = 'tpl:';

/** The brief of a definition: every shipped brief view is named `brief` or `*-brief`. */
export function briefViewOf(definition: Pick<DocumentDefinition, 'views'>): string | undefined {
    return definition.views.find(({ id }) => id === 'brief' || id.endsWith('-brief'))?.id;
}

/**
 * The view a document starts in when it is opened beside another one: its brief, unless a user
 * setting gives its type a page of its own (then there is nothing to choose).
 */
export function defaultPaneView(entry: DocumentIndexEntry): string | undefined {
    const definition = systemRegistry.getDocumentDefinition(entry.systemId, entry.definitionId);
    if (!definition) return undefined;
    const choices = selectableViews(
        definition,
        { definitionId: entry.definitionId, metadata: { settingId: entry.settingId } },
        useDocumentTypeStore.getState().settings
    );
    return choices.length > 0 ? briefViewOf({ views: choices }) : undefined;
}
