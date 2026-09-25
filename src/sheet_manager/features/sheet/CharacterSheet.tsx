import Translate, { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

import { reportSheetIssue } from '../../diagnostics';
import { useDocumentStore } from '../../store/documentStore';
import { useDocumentTypesHydrated, useDocumentTypeStore } from '../../store/documentTypeStore';
import { useTemplateStore } from '../../store/templateStore';
import {
    resolveCustomTemplate,
    resolveDocumentView,
    resolveEffectiveTemplate,
    systemRegistry,
} from '../../systems';
import { assignedTemplateId, isUserKind, STORED_VALUES_VIEW_ID } from '../../systems/userTypes';
import { buildOrphanPage } from './data/orphanPage';
import { DeclarativeSheetView } from './declarative/DeclarativeSheetView';
import { SheetWorkspace } from './shell/SheetWorkspace';

const page = uiMessages.sheet.templates.page;

function FallbackNotice() {
    return (
        <div
            role="alert"
            className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-border bg-bgSurface p-4 lg:mx-6"
        >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
            <div>
                <p className="text-sm font-semibold text-textPrimary">
                    <Translate id="ttgamer.ui.sheet.templates.page.fallbackTitle" />
                </p>
                <p className="mt-1 text-xs text-textSecondary">
                    {translate(page.fallbackDescription)}
                </p>
            </div>
        </div>
    );
}

function TypeMissingNotice() {
    return (
        <div
            role="alert"
            className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-border bg-bgSurface p-4 lg:mx-6"
        >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
            <div>
                <p className="text-sm font-semibold text-textPrimary">
                    {translate(page.typeMissingTitle)}
                </p>
                <p className="mt-1 text-xs text-textSecondary">
                    {translate(page.typeMissingDescription)}
                </p>
            </div>
        </div>
    );
}

type FallbackReason =
    | 'missing'
    | 'kind-mismatch'
    | 'system-mismatch'
    | 'unknown-view'
    | 'no-default'
    | 'type-missing';

/** Reports a page fallback once per distinct document/reason (degradation stays observable). */
function FallbackReport({
    documentId,
    reason,
    requested,
}: {
    documentId: string;
    reason: FallbackReason;
    requested?: string;
}) {
    useEffect(() => {
        const incompatible = reason === 'kind-mismatch' || reason === 'system-mismatch';
        reportSheetIssue({
            code: incompatible ? 'template-incompatible' : 'template-fallback',
            message: incompatible
                ? 'Assigned template belongs to another system or document kind; default page rendered'
                : 'Document rendered a fallback page instead of the requested one',
            details: { documentId, reason, requested },
        });
    }, [documentId, reason, requested]);
    return null;
}

function CurrentDocumentSheet() {
    const { currentDocumentId, documents } = useDocumentStore();
    const { templates, defaultOverrides } = useTemplateStore();
    // Subscribed so the page follows installed or removed user types (the registry overlay).
    useDocumentTypeStore((state) => state.types);
    const settings = useDocumentTypeStore((state) => state.settings);
    const typesHydrated = useDocumentTypesHydrated();
    const document = documents.find(({ id }) => id === currentDocumentId);
    if (!document) return null;
    const definition = systemRegistry.getDocumentDefinition(
        document.systemId,
        document.definitionId
    );
    if (!definition) return null;
    if (isUserKind(document.definitionId) && definition.defaultViewId === STORED_VALUES_VIEW_ID) {
        // Until the stored types are read, a missing type is only not loaded yet.
        if (!typesHydrated) {
            return (
                <p role="status" className="p-4 text-sm text-textSecondary">
                    {translate(page.typeLoading)}
                </p>
            );
        }
        return (
            <>
                <FallbackReport
                    documentId={document.id}
                    reason="type-missing"
                    requested={document.definitionId}
                />
                <TypeMissingNotice />
                <DeclarativeSheetView template={buildOrphanPage(document)} />
            </>
        );
    }

    const assignedId = assignedTemplateId(document, settings);
    const resolved = resolveCustomTemplate(assignedId, templates, document.kind, document.systemId);

    if (resolved && !('reason' in resolved)) {
        return <DeclarativeSheetView template={resolved} />;
    }
    const customFallback = resolved && 'reason' in resolved && (
        <FallbackReport documentId={document.id} reason={resolved.reason} requested={assignedId} />
    );
    const preferredViewId = document.metadata.preferredViewId;
    const viewFallback = preferredViewId &&
        !definition.views.some(
            (view) => view.id === preferredViewId || view.legacyIds?.includes(preferredViewId)
        ) && (
            <FallbackReport
                documentId={document.id}
                reason="unknown-view"
                requested={preferredViewId}
            />
        );

    // Feature 004: the selected view IS a default template — render it declaratively with its
    // persisted override applied (no migration, no special-case mapping).
    // Resolve through the document's own definition: several definitions share a kind (character
    // and droid), and legacy aliases map to that definition's canonical view.
    const viewId = resolveDocumentView(definition, document.metadata.preferredViewId)?.id;
    if (viewId) {
        const effective = resolveEffectiveTemplate(
            viewId,
            { templates, defaultOverrides },
            document.systemId,
            document.kind
        );
        if (effective) {
            return (
                <>
                    {customFallback}
                    {viewFallback}
                    {resolved && 'reason' in resolved && <FallbackNotice />}
                    <DeclarativeSheetView template={effective.template} />
                </>
            );
        }
    }

    // Every view is a shipped template (registry test guarded); reaching here means the view's
    // template is missing — show the notice, never throw.
    return (
        <>
            {customFallback}
            {viewFallback}
            <FallbackReport documentId={document.id} reason="no-default" requested={viewId} />
            <FallbackNotice />
        </>
    );
}

export function CharacterSheet() {
    return (
        <SheetWorkspace>
            <CurrentDocumentSheet />
        </SheetWorkspace>
    );
}
