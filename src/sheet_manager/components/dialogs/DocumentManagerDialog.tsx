import Translate, { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { Trash2, Users, X } from 'lucide-react';
import { useState } from 'react';

import { useDocumentStore } from '../../store/documentStore';
import { documentSettingLabel, systemRegistry } from '../../systems';
import { ConfirmDialog } from './ConfirmDialog';

export interface DocumentManagerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DocumentManagerDialog({ open, onOpenChange }: DocumentManagerDialogProps) {
    const { currentDocumentId, deleteDocument, documents, setCurrentDocument } = useDocumentStore();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const pluralMessage = usePluralMessage();
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setSelectedIds(new Set());
            setDeleteDialogOpen(false);
        }
        onOpenChange(newOpen);
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds((previous) => {
            const next = new Set(previous);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        setSelectedIds(
            selectedIds.size === documents.length
                ? new Set()
                : new Set(documents.map(({ id }) => id))
        );
    };

    const handleDeleteSelected = () => {
        selectedIds.forEach(deleteDocument);
        const remaining = documents.find(({ id }) => !selectedIds.has(id));
        if (currentDocumentId && selectedIds.has(currentDocumentId)) {
            setCurrentDocument(remaining?.id ?? null);
        }
        setSelectedIds(new Set());
        setDeleteDialogOpen(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content
                    aria-describedby={undefined}
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[85vh] bg-bgSurface border border-border rounded-lg shadow-xl overflow-hidden flex flex-col focus:outline-none"
                >
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-textSecondary" aria-hidden="true" />
                            <Dialog.Title className="text-lg font-semibold text-textPrimary">
                                <Translate id="ttgamer.ui.sheet.documents.manager.title" />
                            </Dialog.Title>
                        </div>
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="text-textSecondary hover:text-textPrimary"
                                aria-label={translate(uiMessages.sheet.documents.manager.close)}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {documents.length === 0 ? (
                            <p className="text-sm text-textSecondary italic text-center py-8">
                                <Translate id="ttgamer.ui.sheet.documents.manager.empty" />
                            </p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-textSecondary text-xs border-b border-border">
                                        <th scope="col" className="w-10 py-2 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === documents.length}
                                                onChange={handleSelectAll}
                                                aria-label={translate(
                                                    uiMessages.sheet.documents.manager.selectAll
                                                )}
                                            />
                                        </th>
                                        <th scope="col" className="py-2 text-left font-medium">
                                            <Translate id="ttgamer.ui.sheet.documents.manager.name" />
                                        </th>
                                        <th scope="col" className="py-2 text-left font-medium">
                                            <Translate id="ttgamer.ui.sheet.documents.manager.type" />
                                        </th>
                                        <th scope="col" className="py-2 text-left font-medium">
                                            <Translate id="ttgamer.ui.sheet.documents.manager.setting" />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map((document) => {
                                        const system = systemRegistry.getSystem(document.systemId);
                                        const definition = systemRegistry.getDocumentDefinition(
                                            document.systemId,
                                            document.definitionId
                                        );
                                        const title =
                                            document.metadata.title ||
                                            (definition
                                                ? translate(definition.label)
                                                : document.definitionId);
                                        return (
                                            <tr
                                                key={document.id}
                                                className="border-b border-border"
                                            >
                                                <td className="py-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(document.id)}
                                                        onChange={() =>
                                                            handleToggleSelect(document.id)
                                                        }
                                                        aria-label={translate(
                                                            uiMessages.sheet.documents.manager
                                                                .selectDocument,
                                                            { title }
                                                        )}
                                                    />
                                                </td>
                                                <td className="py-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCurrentDocument(document.id);
                                                            onOpenChange(false);
                                                        }}
                                                        className="text-textPrimary hover:text-primary hover:underline text-left"
                                                    >
                                                        {title}
                                                        {currentDocumentId === document.id && (
                                                            <span className="ml-2 text-xs text-primary">
                                                                (
                                                                <Translate id="ttgamer.ui.sheet.documents.manager.current" />
                                                                )
                                                            </span>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="py-2 text-textSecondary">
                                                    {definition
                                                        ? translate(definition.label)
                                                        : document.definitionId}
                                                </td>
                                                <td className="py-2 text-textSecondary">
                                                    {system && definition
                                                        ? translate(
                                                              documentSettingLabel(
                                                                  system,
                                                                  definition
                                                              )
                                                          )
                                                        : document.systemId}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="flex justify-end p-4 border-t border-border bg-bgBase/30">
                        <button
                            type="button"
                            onClick={() => setDeleteDialogOpen(true)}
                            disabled={selectedIds.size === 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-error bg-bgSurface border border-border rounded hover:bg-error/10 disabled:opacity-50"
                        >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <Translate id="ttgamer.ui.sheet.documents.manager.deleteSelected" />
                            {selectedIds.size > 0 && <span>({selectedIds.size})</span>}
                        </button>
                    </div>

                    <ConfirmDialog
                        open={deleteDialogOpen}
                        onOpenChange={setDeleteDialogOpen}
                        onConfirm={handleDeleteSelected}
                        title={translate(uiMessages.sheet.documents.manager.deleteTitle)}
                        description={pluralMessage(
                            uiMessages.sheet.documents.manager.deleteDescription,
                            selectedIds.size
                        )}
                        confirmLabel={translate(uiMessages.sheet.documents.manager.deleteSelected)}
                        cancelLabel={translate(uiMessages.sheet.documents.create.cancel)}
                        variant="danger"
                    />
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
