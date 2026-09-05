import * as Dialog from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
}

export function ConfirmDialog({
    cancelLabel = 'Cancel',
    confirmLabel = 'Confirm',
    description,
    onConfirm,
    onOpenChange,
    open,
    title,
    variant = 'default',
}: ConfirmDialogProps) {
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-[9999] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-bgSurface p-6 shadow-lg focus:outline-none">
                    <div className="flex items-start gap-3">
                        {variant === 'danger' && (
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                        )}
                        <div className="flex-1">
                            <Dialog.Title className="text-lg font-semibold text-textPrimary">
                                {title}
                            </Dialog.Title>
                            <Dialog.Description className="mt-2 text-sm text-textSecondary">
                                {description}
                            </Dialog.Description>
                        </div>
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="text-textSecondary transition-colors hover:text-textPrimary"
                                aria-label={cancelLabel}
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </Dialog.Close>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="rounded-lg border border-border bg-bgSurface px-4 py-2 text-sm font-medium text-textSecondary transition-colors hover:bg-bgBase"
                            >
                                {cancelLabel}
                            </button>
                        </Dialog.Close>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className={clsx(
                                'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                                variant === 'danger'
                                    ? 'bg-error hover:bg-error/80'
                                    : 'bg-primary hover:bg-primary/80'
                            )}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
