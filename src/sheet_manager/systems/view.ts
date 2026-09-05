import type { DocumentKind, DocumentViewId } from '../types/document';
import type { CustomTemplate } from '../types/template';
import type { DocumentDefinition } from './types';

export function resolveDocumentView(
    definition: DocumentDefinition,
    preferredViewId?: DocumentViewId
) {
    if (preferredViewId) {
        const preferred = definition.views.find(
            (view) => view.id === preferredViewId || view.legacyIds?.includes(preferredViewId)
        );
        if (preferred) return preferred;
    }
    return definition.views.find(({ id }) => id === definition.defaultViewId);
}

export type ResolvedCustomTemplate = CustomTemplate | { reason: 'missing' } | undefined;

/**
 * Resolves a document's custom page assignment: `undefined` = no assignment (built-in path),
 * `{ reason: 'missing' }` = stale assignment (template deleted or kind mismatch — render the
 * built-in page with a fallback notice), `CustomTemplate` = render the declarative page.
 */
export function resolveCustomTemplate(
    templateId: string | undefined,
    library: readonly CustomTemplate[],
    documentKind: DocumentKind
): ResolvedCustomTemplate {
    if (!templateId) return undefined;
    const template = library.find((candidate) => candidate.id === templateId);
    if (!template || template.documentKind !== documentKind) return { reason: 'missing' };
    return template;
}
