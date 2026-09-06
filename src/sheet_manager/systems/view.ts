import type { DocumentKind, DocumentViewId } from '../types/document';
import type { CustomTemplate } from '../types/template';
import { CustomTemplateSchema } from '../types/template';
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

export type ResolvedCustomTemplate = CustomTemplate | { reason: 'missing' } | undefined;

/**
 * Resolves a document's custom page assignment: `undefined` = no assignment (built-in path),
 * `{ reason: 'missing' }` = stale assignment (template deleted or kind mismatch — render the
 * built-in page with a fallback notice), `CustomTemplate` = render the declarative page.
 */
/**
 * Derives a default template from a registered built-in view (feature 004): the view id IS the
 * default template's identity — no migration, no special-case mapping. Pure; the pristine
 * reset source. Returns undefined for views without a built-in layout.
 */
export function viewToDefaultTemplate(
    view: DocumentViewDefinition,
    systemId: string,
    documentKind: DocumentKind
): CustomTemplate | undefined {
    if (view.layout.type !== 'built-in') return undefined;
    return CustomTemplateSchema.parse({
        id: view.id,
        name: view.label.message,
        systemId,
        documentKind,
        schemaVersion: 1,
        sections: [
            {
                id: `${view.id}-page`,
                title: view.label.message,
                // Built-in pages stack blocks directly — no section chrome (parity with the
                // original view; the extra "view name" collapsible was wrong).
                presentation: 'plain',
                blocks: view.layout.blocks.map((placement) => ({
                    id: placement.id,
                    type: 'built-in',
                    blockId: placement.id,
                })),
            },
        ],
    });
}

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
    const custom = state.templates.find((candidate) => candidate.id === id);
    if (custom) return { template: custom, isDefault: false, modified: false };

    // Feature 005: explicit primitive-composed default templates win; legacy view derivation
    // stays as the fallback for setups without explicit defaults. Legacy view ids (aliases)
    // resolve to the canonical view's default template — one page, one identity.
    const view = findRegisteredView(systemId, documentKind, id);
    const canonicalId = view?.id ?? id;
    const explicit = systemRegistry
        .getSystem(systemId)
        ?.defaultTemplates?.find((template) => template.id === canonicalId);
    if (explicit && explicit.documentKind === documentKind) {
        const override = state.defaultOverrides[id];
        if (override) return { template: override, isDefault: true, modified: true };
        return { template: explicit, isDefault: true, modified: false };
    }

    if (!view) return undefined;
    const override = state.defaultOverrides[id];
    if (override) return { template: override, isDefault: true, modified: true };
    const pristine = viewToDefaultTemplate(view, systemId, documentKind);
    return pristine ? { template: pristine, isDefault: true, modified: false } : undefined;
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
    documentKind: DocumentKind
): ResolvedCustomTemplate {
    if (!templateId) return undefined;
    const template = library.find((candidate) => candidate.id === templateId);
    if (!template || template.documentKind !== documentKind) return { reason: 'missing' };
    return template;
}
