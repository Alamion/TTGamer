import Translate, { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useDiceTab } from '@site/src/integrations/sheet-dice/diceTab';
import { useShownDocumentPublisher } from '@site/src/integrations/sheet-dice/shownDocument';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { ConfirmDialog } from '../../../components/dialogs/ConfirmDialog';
import { DocumentCreateDialog } from '../../../components/dialogs/DocumentCreateDialog';
import { ImportConflictDialog } from '../../../components/dialogs/ImportConflictDialog';
import { ImportSummaryDialog } from '../../../components/dialogs/ImportSummaryDialog';
import { useDocumentStore } from '../../../store/documentStore';
import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import { useTemplateStore } from '../../../store/templateStore';
import {
    resolveCustomTemplate,
    resolveDocumentPolicies,
    resolveDocumentView,
    systemRegistry,
} from '../../../systems';
import { assignedTemplateId, templateMatchesSetting } from '../../../systems/userTypes';
import { countUnfilledRequired } from '../declarative/DeclarativeSheetView';
import { DocumentLinkContext } from '../declarative/documentLinks';
import { FloatingTabs } from '../panes/FloatingTabs';
import { openKeys } from '../panes/layoutTree';
import { PaneArea } from '../panes/PaneArea';
import { openTool, usePaneStore } from '../panes/paneStore';
import { registerSheetTools } from '../panes/sheetTools';
import { documentIdOf, tabKindOf } from '../panes/tabKeys';
import { exportFileName, serializeDocumentExport } from './documentFile';
import { useDocumentHistory } from './documentHistory';
import { GameTermsMenu, TermHintNotice } from './GameTermsMenu';
import { type BatchSummary, type ConflictAnswer, runImportBatch } from './importBatch';
import { type BadgePlace, PolicyBadges } from './PolicyNotice';
import { SheetToolbar } from './SheetToolbar';
import { selectableViews, templateSelectValue, ViewModeSelect } from './ViewModeSelect';

interface SheetWorkspaceProps {
    /** Draws one document's page; the workspace decides how many documents are shown. */
    renderDocument: (documentId: string, viewId?: string) => React.ReactNode;
}

export function SheetWorkspace({ renderDocument }: SheetWorkspaceProps) {
    const {
        currentDocumentId,
        documents,
        forgetRecoveryEntry,
        importDocument,
        resetDocument,
        retainImportForRecovery,
        updateDocumentMetadata,
    } = useDocumentStore();
    const { templates } = useTemplateStore();
    // Following a link leaves a history entry: browser Back returns to the document (T-057).
    const followLink = useDocumentHistory();
    // The registry lists installed user types; subscribing re-renders when they change.
    useDocumentTypeStore((state) => state.types);
    const settings = useDocumentTypeStore((state) => state.settings);
    // With several documents each pane has its own view selector (spec 034, D8).
    const several = usePaneStore(
        (state) => openKeys(state).filter((key) => documentIdOf(key) !== null).length > 1
    );
    const currentDocument = documents.find(({ id }) => id === currentDocumentId) ?? null;
    const [noticeSlot, setNoticeSlot] = useState<HTMLElement | null>(null);
    /**
     * The publisher badges of the shown documents (constitution VIII), outside the template tree
     * so no page template, shipped or custom, can remove them; the layout says where they go.
     */
    const notices = (ids: readonly string[], place: BadgePlace) => (
        <PolicyBadges
            place={place}
            policies={ids.flatMap((id) => {
                const document = documents.find((candidate) => candidate.id === id);
                return document ? resolveDocumentPolicies(systemRegistry, document) : [];
            })}
        />
    );
    // The header's pending roll follows the shown document, with its Hunger (spec 037 D2).
    const shownSpecialDice = currentDocument
        ? systemRegistry
              .getSystem(currentDocument.systemId)
              ?.dice?.reading?.specialDice?.(currentDocument.definitionId, currentDocument.data)
        : undefined;
    useShownDocumentPublisher(
        currentDocument
            ? {
                  systemId: currentDocument.systemId,
                  definitionId: currentDocument.definitionId,
                  ...(shownSpecialDice ? { specialDice: shownSpecialDice } : {}),
              }
            : null
    );
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
              assignedTemplateId(currentDocument, settings),
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
                      template.systemId === currentDocument.systemId &&
                      templateMatchesSetting(template, currentDocument)
              )
              .map((template) => ({ id: template.id, name: template.name }))
        : [];
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const pluralMessage = usePluralMessage();
    // The documents window and the library are tools of the layout (spec 036).
    useEffect(() => registerSheetTools(), []);
    useDiceTab();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [importConflict, setImportConflict] = useState<'document' | 'type' | null>(null);
    const [offerApplyToRest, setOfferApplyToRest] = useState(false);
    const [importSummary, setImportSummary] = useState<BatchSummary | null>(null);
    const conflictResolverRef = useRef<((answer: ConflictAnswer) => void) | null>(null);

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
        if (currentDocument) resetDocument(currentDocument.id);
        setResetDialogOpen(false);
    };

    const requestConflictResolution = (subject: 'document' | 'type') =>
        new Promise<ConflictAnswer>((resolve) => {
            conflictResolverRef.current = resolve;
            setImportConflict(subject);
        });

    const resolveConflict = (choice: ConflictAnswer['choice'], applyToRest: boolean) => {
        conflictResolverRef.current?.({ choice, applyToRest });
        conflictResolverRef.current = null;
        setImportConflict(null);
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        // Capture files before resetting the input — clearing the value empties the live FileList.
        const selected = Array.from(event.target.files ?? []);
        if (selected.length === 0) return;
        event.target.value = '';

        setOfferApplyToRest(selected.length > 1);
        const files = await Promise.all(
            selected.map(async (file) => ({ name: file.name, text: await file.text() }))
        );
        const summary = await runImportBatch(files, {
            hasDocument: (id) =>
                useDocumentStore.getState().entries.some((entry) => entry.id === id),
            importDocument,
            retain: retainImportForRecovery,
            forget: forgetRecoveryEntry,
            askConflict: requestConflictResolution,
        });

        if (summary.repaired > 0 || summary.rejected > 0) {
            setImportSummary(summary);
        } else if (summary.imported === 1) {
            toast.success(
                translate(uiMessages.sheet.documents.toolbar.importSuccess, {
                    title:
                        summary.outcomes.find(({ status }) => status === 'imported')?.title ?? '',
                })
            );
        } else if (summary.imported > 1) {
            toast.success(
                pluralMessage(
                    uiMessages.sheet.documents.importSummary.importedMany,
                    summary.imported
                )
            );
        }
    };

    return (
        <DocumentLinkContext.Provider value={followLink}>
            <div className="bg-bgSurface p-4">
                <SheetToolbar
                    hasDocument={Boolean(currentDocument)}
                    onCreate={() => setCreateDialogOpen(true)}
                    onExport={handleExport}
                    onImport={handleImport}
                    onManage={() => openTool('documents')}
                    onReset={() => setResetDialogOpen(true)}
                    onManageTemplates={() => openTool('library')}
                    end={<div ref={setNoticeSlot} className="contents" />}
                    viewMode={
                        currentDocument && currentDefinition && currentView ? (
                            <>
                                {!several && (
                                    <ViewModeSelect
                                        views={selectableViews(
                                            currentDefinition,
                                            currentDocument,
                                            settings
                                        )}
                                        value={templateSelectValue(
                                            activeTemplateId,
                                            currentView.id
                                        )}
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
                                )}
                                <GameTermsMenu />
                            </>
                        ) : undefined
                    }
                />
                {currentDocument && <TermHintNotice />}
                {!currentDocument && currentDocumentId !== null && (
                    <p role="status" className="py-6 text-center text-sm text-textSecondary">
                        {translate(uiMessages.sheet.documents.toolbar.openingDocument)}
                    </p>
                )}
                {!currentDocument && currentDocumentId === null && (
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
            <DocumentCreateDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
            <ImportSummaryDialog summary={importSummary} onClose={() => setImportSummary(null)} />
            <ImportConflictDialog
                offerApplyToRest={offerApplyToRest}
                open={importConflict !== null}
                subject={importConflict ?? 'document'}
                onResolve={resolveConflict}
            />

            {currentDocument ? (
                <PaneArea
                    documentId={currentDocument.id}
                    renderDocument={renderDocument}
                    notices={notices}
                    toolbarSlot={noticeSlot}
                />
            ) : (
                // With no document there is no layout to dock in: the tools float.
                <FloatingTabs
                    notices={notices}
                    renderDocument={renderDocument}
                    titleOf={(key) => tabKindOf(key)?.title() ?? key}
                />
            )}
        </DocumentLinkContext.Provider>
    );
}
