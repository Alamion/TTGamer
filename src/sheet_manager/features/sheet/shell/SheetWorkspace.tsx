import Translate, { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
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
import { useDocumentStore } from '../../../store/documentStore';
import { useTemplateStore } from '../../../store/templateStore';
import {
    resolveCustomTemplate,
    resolveDocumentPolicies,
    resolveDocumentView,
    systemRegistry,
} from '../../../systems';
import type { UnknownDocumentEnvelope } from '../../../types/document';
import { countUnfilledRequired } from '../declarative/DeclarativeSheetView';
import { exportFileName, parseImportedDocument, serializeDocumentExport } from './documentFile';
import { GameTermsMenu, TermHintNotice } from './GameTermsMenu';
import { PolicyBadges } from './PolicyNotice';
import { SheetToolbar } from './SheetToolbar';
import { templateSelectValue, ViewModeSelect } from './ViewModeSelect';

interface SheetWorkspaceProps {
    children: React.ReactNode;
}

export function SheetWorkspace({ children }: SheetWorkspaceProps) {
    const {
        currentDocumentId,
        documents,
        importDocument,
        retainImportForRecovery,
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
              currentDocument.kind,
              currentDocument.systemId
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
    const pluralMessage = usePluralMessage();
    const [managerDialogOpen, setManagerDialogOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);
    const [importConflict, setImportConflict] = useState<UnknownDocumentEnvelope | null>(null);
    const conflictResolverRef = useRef<
        ((resolution: 'replace' | 'duplicate' | 'cancel') => void) | null
    >(null);

    const handleExport = () => {
        if (!currentDocument) return;
        // Device-backed images are stripped and publisher notices added (documentFile.ts).
        const data = serializeDocumentExport(currentDocument);
        const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = exportFileName(currentDocument);
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
                toast(pluralMessage(uiMessages.sheet.templates.page.requiredUnfilled, unfilled));
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
        // Capture files before resetting the input — clearing the value empties the live FileList.
        const files = Array.from(event.target.files ?? []);
        if (files.length === 0) return;
        event.target.value = '';

        for (const file of files) {
            let raw: unknown;
            try {
                raw = JSON.parse(await file.text());
                let imported = parseImportedDocument(raw);
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
            } catch (error) {
                // A readable file that fails validation is kept for recovery, never dropped.
                if (raw !== undefined) retainImportForRecovery(raw, error);
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
                            <>
                                <ViewModeSelect
                                    definition={currentDefinition}
                                    value={templateSelectValue(activeTemplateId, currentView.id)}
                                    onChangeTemplate={(templateId) =>
                                        updateDocumentMetadata(currentDocument.id, {
                                            templateId: templateId ?? undefined,
                                        })
                                    }
                                    onChangeView={(preferredViewId) =>
                                        updateDocumentMetadata(currentDocument.id, {
                                            preferredViewId,
                                        })
                                    }
                                    templateOptions={templateOptions}
                                />
                                <GameTermsMenu />
                            </>
                        ) : undefined
                    }
                />
                {currentDocument && <TermHintNotice />}
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
            {/* Outside the template tree: no page template, shipped or custom, can remove it. */}
            {currentDocument && (
                <PolicyBadges policies={resolveDocumentPolicies(systemRegistry, currentDocument)} />
            )}
        </>
    );
}
