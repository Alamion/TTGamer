import Translate from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';

interface ImportConflictDialogProps {
    open: boolean;
    onResolve: (resolution: 'replace' | 'duplicate' | 'cancel') => void;
    /** What collides: a document (default) or an installed user document type. */
    subject?: 'document' | 'type';
}

export function ImportConflictDialog({
    onResolve,
    open,
    subject = 'document',
}: ImportConflictDialogProps) {
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) onResolve('cancel');
            }}
        >
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-[9999] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-bgSurface p-6 shadow-xl focus:outline-none">
                    <Dialog.Title className="text-lg font-semibold text-textPrimary">
                        {subject === 'type' ? (
                            <Translate id="ttgamer.ui.sheet.documents.conflict.typeTitle" />
                        ) : (
                            <Translate id="ttgamer.ui.sheet.documents.conflict.title" />
                        )}
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-textSecondary">
                        {subject === 'type' ? (
                            <Translate id="ttgamer.ui.sheet.documents.conflict.typePrompt" />
                        ) : (
                            <Translate id="ttgamer.ui.sheet.documents.conflict.prompt" />
                        )}
                    </Dialog.Description>
                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => onResolve('cancel')}
                            className="rounded border border-border bg-bgSurface px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-bgBase"
                        >
                            <Translate id="ttgamer.ui.sheet.documents.create.cancel" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onResolve('duplicate')}
                            className="rounded border border-border bg-bgSurface px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-bgBase"
                        >
                            <Translate id="ttgamer.ui.sheet.documents.conflict.duplicate" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onResolve('replace')}
                            className="rounded border border-transparent bg-primary-muted px-3 py-1.5 text-xs font-medium text-white hover:bg-primary"
                        >
                            <Translate id="ttgamer.ui.sheet.documents.conflict.replace" />
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
