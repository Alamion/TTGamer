import { overrideKey } from '../store/templateStore';
import type { DocumentKind, DocumentViewId } from '../types/document';
import type { CustomTemplate } from '../types/template';
import { systemRegistry } from './index';
import type { DocumentDefinition, DocumentViewDefinition } from './types';

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

export type ResolvedCustomTemplate =
    | CustomTemplate
    | { reason: 'missing' | 'kind-mismatch' | 'system-mismatch' }
    | undefined;

/**
 * Resolves a document's custom page assignment: `undefined` = no assignment (built-in path),
 * `{ reason: 'missing' }` = stale assignment (template deleted or kind mismatch — render the
 * built-in page with a fallback notice), `CustomTemplate` = render the declarative page.
 */

export interface EffectiveTemplate {
    template: CustomTemplate;
    isDefault: boolean;
    modified: boolean;
}

interface OverridesSource {
    templates: readonly CustomTemplate[];
    defaultOverrides: Readonly<Record<string, CustomTemplate>>;
}

/**
 * One resolution for selector, renderer, and library (feature 004): custom template first,
 * then the default template derived from the registered view with its persisted override
 * applied. No migration, no special-case mapping (clarification Q4).
 */
export function resolveEffectiveTemplate(
    id: string,
    state: OverridesSource,
    systemId: string,
    documentKind: DocumentKind
): EffectiveTemplate | undefined {
    // A template authored for another system never renders a document, even with the same kind.
    const custom = state.templates.find(
        (candidate) =>
            candidate.id === id &&
            candidate.documentKind === documentKind &&
            candidate.systemId === systemId
    );
    if (custom) return { template: custom, isDefault: false, modified: false };

    // Feature 005/006: explicit primitive-composed default templates are the only default
    // source (schema v3 dropped the legacy view derivation). Legacy view ids (aliases)
    // resolve to the canonical view's default template — one page, one identity. A view
    // without an explicit default has no declarative page (the built-in layout renders).
    const view = findRegisteredView(systemId, documentKind, id);
    const canonicalId = view?.id ?? id;
    const explicit = systemRegistry
        .getSystem(systemId)
        ?.defaultTemplates?.find((template) => template.id === canonicalId);
    if (!explicit || explicit.documentKind !== documentKind) return undefined;
    // Overrides belong to the canonical page: a legacy alias shared by several kinds (`brief`)
    // must not pick up another kind's edited default.
    const override = state.defaultOverrides[overrideKey(systemId, canonicalId)];
    if (override) return { template: override, isDefault: true, modified: true };
    return { template: explicit, isDefault: true, modified: false };
}

function findRegisteredView(
    systemId: string,
    documentKind: DocumentKind,
    viewId: string
): DocumentViewDefinition | undefined {
    for (const definition of systemRegistry.getSystem(systemId)?.documents ?? []) {
        if (definition.kind !== documentKind) continue;
        const view = definition.views.find(
            (candidate) =>
                candidate.id === (viewId as DocumentViewId) ||
                candidate.legacyIds?.includes(viewId as DocumentViewId)
        );
        if (view) return view;
    }
    return undefined;
}

export function resolveCustomTemplate(
    templateId: string | undefined,
    library: readonly CustomTemplate[],
    documentKind: DocumentKind,
    systemId?: string
): ResolvedCustomTemplate {
    if (!templateId) return undefined;
    const template = library.find((candidate) => candidate.id === templateId);
    if (!template) return { reason: 'missing' };
    if (systemId !== undefined && template.systemId !== systemId) {
        return { reason: 'system-mismatch' };
    }
    if (template.documentKind !== documentKind) return { reason: 'kind-mismatch' };
    return template;
}

/** Whether a template may render a document (same system and document kind). */
export function isTemplateCompatible(
    template: Pick<CustomTemplate, 'systemId' | 'documentKind'>,
    document: { systemId: string; kind: string }
): boolean {
    return template.systemId === document.systemId && template.documentKind === document.kind;
}

/**
 * True when the id is a registered view id (default template identity, FR-11) — of the given
 * system, or of any system when omitted (view ids are unique across systems).
 */
export function isDefaultTemplateId(id: string, systemId?: string): boolean {
    return systemRegistry
        .getSystems()
        .filter((system) => systemId === undefined || system.id === systemId)
        .some((system) =>
            system.documents.some((definition) => definition.views.some((view) => view.id === id))
        );
}
