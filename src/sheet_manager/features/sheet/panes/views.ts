import type { DocumentIndexEntry } from '../../../store/documentIndex';
import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import { useTemplateStore } from '../../../store/templateStore';
import type { DocumentDefinition } from '../../../systems';
import { systemRegistry } from '../../../systems';
import { selectableViews } from '../shell/ViewModeSelect';

/** Prefix of a view value that names a custom page instead of a built-in view. */
export const TEMPLATE_VIEW_PREFIX = 'tpl:';

/** Whether a page is a brief (spec 041): a shipped page by its id, else the user's own page. */
function isBriefPage(templateId: string): boolean {
    const shipped = systemRegistry
        .getSystems()
        .flatMap((system) => system.defaultTemplates ?? [])
        .find(({ id }) => id === templateId);
    const page =
        shipped ?? useTemplateStore.getState().templates.find(({ id }) => id === templateId);
    return page?.pageKind === 'brief';
}

/** The brief of a definition: the first view whose page is a brief (spec 041, design D8). */
export function briefViewOf(definition: Pick<DocumentDefinition, 'views'>): string | undefined {
    return definition.views.find(({ layout }) => isBriefPage(layout.templateId))?.id;
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
