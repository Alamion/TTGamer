import { useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

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
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
}: ConfirmDialogProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onOpenChange(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onOpenChange]);

    useEffect(() => {
        if (open && contentRef.current) {
            contentRef.current.focus();
        }
    }, [open]);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            {open && (
                <>
                    <div
                        ref={overlayRef}
                        className="bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                        onClick={() => onOpenChange(false)}
                        aria-hidden="true"
                    />
                    <div
                        ref={contentRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="dialog-title"
                        aria-describedby="dialog-description"
                        className="bg-bgSurface border border-border rounded-lg shadow-lg p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                        style={{
                            position: 'fixed',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '100%',
                            maxWidth: '28rem',
                            zIndex: 9999,
                        }}
                        tabIndex={-1}
                    >
                        <div className="flex items-start gap-3">
                            {variant === 'danger' && (
                                <AlertTriangle className="w-5 h-5 text-error mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1">
                                <Dialog.Title
                                    id="dialog-title"
                                    className="text-lg font-semibold text-textPrimary"
                                >
                                    {title}
                                </Dialog.Title>
                                <Dialog.Description
                                    id="dialog-description"
                                    className="text-sm text-textSecondary mt-2"
                                >
                                    {description}
                                </Dialog.Description>
                            </div>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="absolute top-4 right-4 text-textSecondary hover:text-textPrimary transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => onOpenChange(false)}
                                className="px-4 py-2 text-sm font-medium text-textSecondary bg-bgSurface border border-border rounded-lg hover:bg-bgBase transition-colors"
                                aria-label={cancelLabel}
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={clsx(
                                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                                    variant === 'danger'
                                        ? 'bg-error text-white hover:bg-error/80'
                                        : 'bg-primary text-white hover:bg-primary/80'
                                )}
                                aria-label={confirmLabel}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </Dialog.Root>
    );
}
