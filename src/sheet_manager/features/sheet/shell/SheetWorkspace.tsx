import Translate, { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { generateId } from '@site/src/shared/utils/random';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

import {
    ConfirmDialog,
    DocumentCreateDialog,
    DocumentManagerDialog,
    ImportConflictDialog,
    TemplateLibraryDialog,
} from '../../../components';
import { migrateDocumentStoreState, useDocumentStore } from '../../../store/documentStore';
import { useTemplateStore } from '../../../store/templateStore';
import { resolveCustomTemplate, resolveDocumentView, systemRegistry } from '../../../systems';
import type { UnknownDocumentEnvelope } from '../../../types/document';
import { countUnfilledRequired } from '../declarative/DeclarativeSheetView';
import { SheetToolbar } from './SheetToolbar';
import { templateSelectValue, ViewModeSelect } from './ViewModeSelect';

interface SheetWorkspaceProps {
    children: React.ReactNode;
}

function parseImportedDocument(input: unknown): UnknownDocumentEnvelope {
    try {
        return systemRegistry.parseDocument(input).envelope;
    } catch (envelopeError) {
        const migrated = migrateDocumentStoreState({
            characters: [input],
            currentCharacter: input,
        });
        const document = migrated.documents[0];
        if (!document) throw envelopeError;
        return document;
    }
}

export function SheetWorkspace({ children }: SheetWorkspaceProps) {
    const {
        currentDocumentId,
        documents,
        importDocument,
        updateDocumentData,
        updateDocumentMetadata,
    } = useDocumentStore();
    const { templates } = useTemplateStore();
    const currentDocument = documents.find(({ id }) => id === currentDocumentId) ?? null;
    const currentDefinition = currentDocument
        ? systemRegistry.getDocumentDefinition(
              currentDocument.systemId,
              currentDocument.definitionId
          )
        : undefined;
    const currentView = currentDefinition
        ? resolveDocumentView(currentDefinition, currentDocument?.metadata.preferredViewId)
        : undefined;
    const activeTemplate = currentDocument
        ? resolveCustomTemplate(
              currentDocument.metadata.templateId,
              templates,
              currentDocument.kind
          )
        : undefined;
    const activeTemplateId =
        activeTemplate && !('reason' in activeTemplate) ? activeTemplate.id : undefined;
    const templateOptions = currentDocument
        ? templates
              .filter(
                  (template) =>
                      template.documentKind === currentDocument.kind &&
                      template.systemId === currentDocument.systemId
              )
              .map((template) => ({ id: template.id, name: template.name }))
        : [];
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [managerDialogOpen, setManagerDialogOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);
    const [importConflict, setImportConflict] = useState<UnknownDocumentEnvelope | null>(null);
    const conflictResolverRef = useRef<
        ((resolution: 'replace' | 'duplicate' | 'cancel') => void) | null
    >(null);

    const handleExport = () => {
        if (!currentDocument) return;
        // Device-backed template images live in IndexedDB blobs; the JSON export strips them
        // (URL values and document data travel) — feature 006 FR-16.
        const values = currentDocument.templateValues ?? {};
        const exportableValues = Object.fromEntries(
            Object.entries(values).filter(
                ([, value]) =>
                    !(
                        typeof value === 'object' &&
                        value !== null &&
                        !Array.isArray(value) &&
                        (value as { source?: unknown }).source === 'device'
                    )
            )
        );
        const data = JSON.stringify(
            { ...currentDocument, templateValues: exportableValues },
            (key, value) => (key === 'portraitId' ? undefined : value),
            2
        );
        const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        const link = document.createElement('a');
        const safeName = currentDocument.metadata.title.trim().replace(/[^\p{L}\p{N}_-]+/gu, '_');
        link.href = url;
        link.download = `ttgamer_${safeName || currentDocument.definitionId}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success(
            translate(uiMessages.sheet.documents.toolbar.exportSuccess, {
                title: currentDocument.metadata.title || currentDocument.definitionId,
            })
        );
        // FR-4a: unfilled required fields are noted on export, never blocking.
        if (activeTemplateId) {
            const template = useTemplateStore.getState().getTemplate(activeTemplateId);
            const unfilled = template
                ? countUnfilledRequired(template, currentDocument.templateValues ?? {})
                : 0;
            if (unfilled > 0) {
                toast(
                    translate(uiMessages.sheet.templates.page.requiredUnfilled, { count: unfilled })
                );
            }
        }
    };

    const handleResetConfirm = () => {
        if (!currentDocument) return;
        const definition = systemRegistry.getDocumentDefinition(
            currentDocument.systemId,
            currentDocument.definitionId
        );
        if (!definition) return;
        updateDocumentData(currentDocument.id, () => definition.createDefault());
        updateDocumentMetadata(currentDocument.id, { title: '' });
        setResetDialogOpen(false);
    };

    const requestConflictResolution = (document: UnknownDocumentEnvelope) =>
        new Promise<'replace' | 'duplicate' | 'cancel'>((resolve) => {
            conflictResolverRef.current = resolve;
            setImportConflict(document);
        });

    const resolveConflict = (resolution: 'replace' | 'duplicate' | 'cancel') => {
        conflictResolverRef.current?.(resolution);
        conflictResolverRef.current = null;
        setImportConflict(null);
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files?.length) return;
        event.target.value = '';

        for (const file of Array.from(files)) {
            try {
                let imported = parseImportedDocument(JSON.parse(await file.text()));
                if (documents.some(({ id }) => id === imported.id)) {
                    const resolution = await requestConflictResolution(imported);
                    if (resolution === 'cancel') continue;
                    if (resolution === 'duplicate') imported = { ...imported, id: generateId() };
                }
                importDocument(imported);
                toast.success(
                    translate(uiMessages.sheet.documents.toolbar.importSuccess, {
                        title: imported.metadata.title || imported.definitionId,
                    })
                );
            } catch {
                toast.error(
                    translate(uiMessages.sheet.documents.toolbar.importError, {
                        filename: file.name,
                    })
                );
            }
        }
    };

    return (
        <>
            <div className="bg-bgSurface p-4">
                <SheetToolbar
                    hasDocument={Boolean(currentDocument)}
                    onCreate={() => setCreateDialogOpen(true)}
                    onExport={handleExport}
                    onImport={handleImport}
                    onManage={() => setManagerDialogOpen(true)}
                    onReset={() => setResetDialogOpen(true)}
                    onManageTemplates={() => setTemplatesDialogOpen(true)}
                    viewMode={
                        currentDocument && currentDefinition && currentView ? (
                            <ViewModeSelect
                                definition={currentDefinition}
                                value={templateSelectValue(activeTemplateId, currentView.id)}
                                onChangeTemplate={(templateId) =>
                                    updateDocumentMetadata(currentDocument.id, {
                                        templateId: templateId ?? undefined,
                                    })
                                }
                                onChangeView={(preferredViewId) =>
                                    updateDocumentMetadata(currentDocument.id, { preferredViewId })
                                }
                                templateOptions={templateOptions}
                            />
                        ) : undefined
                    }
                />
                {!currentDocument && (
                    <div className="py-6 text-center">
                        <h2 className="mb-2 text-xl font-bold text-textPrimary">
                            <Translate id="ttgamer.ui.sheet.documents.toolbar.noDocumentTitle" />
                        </h2>
                        <p className="mb-4 text-sm text-textSecondary">
                            <Translate id="ttgamer.ui.sheet.documents.toolbar.noDocumentDescription" />
                        </p>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleResetConfirm}
                title={translate(uiMessages.sheet.documents.toolbar.resetTitle)}
                description={translate(uiMessages.sheet.documents.toolbar.resetDescription)}
                confirmLabel={translate(uiMessages.sheet.documents.toolbar.reset)}
                cancelLabel={translate(uiMessages.sheet.documents.create.cancel)}
                variant="danger"
            />
            <DocumentManagerDialog open={managerDialogOpen} onOpenChange={setManagerDialogOpen} />
            <DocumentCreateDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
            <TemplateLibraryDialog
                open={templatesDialogOpen}
                onOpenChange={setTemplatesDialogOpen}
            />
            <ImportConflictDialog open={importConflict !== null} onResolve={resolveConflict} />

            {currentDocument && children}
        </>
    );
}
