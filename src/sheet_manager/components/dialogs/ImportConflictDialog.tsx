import Translate from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';

interface ImportConflictDialogProps {
    open: boolean;
    onResolve: (resolution: 'replace' | 'duplicate' | 'cancel', applyToRest: boolean) => void;
    /** More files follow in this import, so the choice may be reused for them. */
    offerApplyToRest?: boolean;
    /** What collides: a document (default) or an installed user document type. */
    subject?: 'document' | 'type';
}

export function ImportConflictDialog({
    offerApplyToRest = false,
    onResolve,
    open,
    subject = 'document',
}: ImportConflictDialogProps) {
    const [applyToRest, setApplyToRest] = useState(false);
    const resolve = (resolution: 'replace' | 'duplicate' | 'cancel') => {
        onResolve(resolution, offerApplyToRest && applyToRest);
        setApplyToRest(false);
    };
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) resolve('cancel');
            }}
        >
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-[9999] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-bgSurface p-6 shadow-xl focus:outline-hidden">
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
                    {offerApplyToRest && (
                        <label className="mt-4 flex items-center gap-2 text-xs text-textPrimary">
                            <input
                                type="checkbox"
                                checked={applyToRest}
                                onChange={(event) => setApplyToRest(event.target.checked)}
                                className="h-3.5 w-3.5"
                            />
                            <Translate id="ttgamer.ui.sheet.documents.conflict.applyToRest" />
                        </label>
                    )}
                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => resolve('cancel')}
                            className="rounded-sm border border-border bg-bgSurface px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-bgBase"
                        >
                            <Translate id="ttgamer.ui.sheet.documents.create.cancel" />
                        </button>
                        <button
                            type="button"
                            onClick={() => resolve('duplicate')}
                            className="rounded-sm border border-border bg-bgSurface px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-bgBase"
                        >
                            <Translate id="ttgamer.ui.sheet.documents.conflict.duplicate" />
                        </button>
                        <button
                            type="button"
                            onClick={() => resolve('replace')}
                            className="rounded-sm border border-transparent bg-primary-muted px-3 py-1.5 text-xs font-medium text-white hover:bg-primary"
                        >
                            <Translate id="ttgamer.ui.sheet.documents.conflict.replace" />
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
