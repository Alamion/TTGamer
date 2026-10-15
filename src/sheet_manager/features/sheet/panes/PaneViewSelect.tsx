import { useDocumentStore } from '../../../store/documentStore';
import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import { useTemplateStore } from '../../../store/templateStore';
import { resolveCustomTemplate, resolveDocumentView, systemRegistry } from '../../../systems';
import { assignedTemplateId, templateMatchesSetting } from '../../../systems/userTypes';
import type { DocumentViewId } from '../../../types/document';
import { selectableViews, templateSelectValue, ViewModeSelect } from '../shell/ViewModeSelect';
import { TEMPLATE_VIEW_PREFIX } from './views';

/**
 * The view selector of one pane. It lists what the toolbar's selector lists for the document, but
 * its choice belongs to the pane (`view`), never to the document's preferred view.
 */
export function PaneViewSelect({
    documentId,
    onChange,
    view,
}: {
    documentId: string;
    onChange: (view: string) => void;
    view: string | undefined;
}) {
    const document = useDocumentStore((state) =>
        state.documents.find(({ id }) => id === documentId)
    );
    const templates = useTemplateStore((state) => state.templates);
    useDocumentTypeStore((state) => state.types);
    const settings = useDocumentTypeStore((state) => state.settings);
    if (!document) return null;
    const definition = systemRegistry.getDocumentDefinition(
        document.systemId,
        document.definitionId
    );
    if (!definition) return null;

    let value: string;
    if (view?.startsWith(TEMPLATE_VIEW_PREFIX)) {
        value = view;
    } else {
        const shown = resolveDocumentView(
            definition,
            (view as DocumentViewId | undefined) ?? document.metadata.preferredViewId
        );
        const assigned = view
            ? undefined
            : resolveCustomTemplate(
                  assignedTemplateId(document, settings),
                  templates,
                  document.kind,
                  document.systemId
              );
        value = templateSelectValue(
            assigned && !('reason' in assigned) ? assigned.id : undefined,
            shown?.id ?? definition.defaultViewId
        );
    }
    return (
        <ViewModeSelect
            compact
            views={selectableViews(definition, document, settings)}
            value={value}
            onChangeTemplate={(templateId) => {
                if (templateId) onChange(`${TEMPLATE_VIEW_PREFIX}${templateId}`);
            }}
            onChangeView={onChange}
            templateOptions={templates
                .filter(
                    (template) =>
                        template.documentKind === document.kind &&
                        template.systemId === document.systemId &&
                        templateMatchesSetting(template, document)
                )
                .map((template) => ({ id: template.id, name: template.name }))}
        />
    );
}
