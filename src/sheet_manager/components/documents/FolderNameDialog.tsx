import * as Dialog from '@radix-ui/react-dialog';
import { type FormEvent, useId, useState } from 'react';

export interface FolderNameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    nameLabel: string;
    initialName: string;
    confirmLabel: string;
    cancelLabel: string;
    onSubmit: (name: string) => void;
}

const MAX_NAME = 200;

/** A small dialog that asks for a folder's name (create and rename). */
export function FolderNameDialog(props: FolderNameDialogProps) {
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');
    return (
        <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/50" />
                <Dialog.Content
                    aria-describedby={undefined}
                    className="fixed left-1/2 top-1/2 z-[9999] w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-bgSurface p-6 shadow-lg focus:outline-hidden"
                >
                    <NameForm {...props} />
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

/** Mounted with the dialog, so every opening starts from the name it is given. */
function NameForm({
    cancelLabel,
    confirmLabel,
    initialName,
    nameLabel,
    onOpenChange,
    onSubmit,
    title,
}: FolderNameDialogProps) {
    const inputId = useId();
    const [name, setName] = useState(initialName);
    const trimmed = name.trim();
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!trimmed) return;
        onSubmit(trimmed);
        onOpenChange(false);
    };
    return (
        <form onSubmit={submit} className="space-y-4">
            <Dialog.Title className="text-lg font-semibold text-textPrimary">{title}</Dialog.Title>
            <div className="space-y-1">
                <label htmlFor={inputId} className="text-sm text-textSecondary">
                    {nameLabel}
                </label>
                <input
                    id={inputId}
                    value={name}
                    maxLength={MAX_NAME}
                    onChange={(event) => setName(event.target.value)}
                    onFocus={(event) => event.target.select()}
                    // The name is the one thing this dialog asks for.
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    className="w-full rounded-lg border border-border bg-bgBase px-3 py-2 text-sm text-textPrimary focus:border-primary focus:outline-hidden [@media(pointer:coarse)]:py-3"
                />
            </div>
            <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                    <button
                        type="button"
                        className="rounded-lg border border-border bg-bgSurface px-4 py-2 text-sm font-medium text-textSecondary transition-colors hover:bg-bgBase"
                    >
                        {cancelLabel}
                    </button>
                </Dialog.Close>
                <button
                    type="submit"
                    disabled={!trimmed}
                    className="rounded-lg bg-primary-muted px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary disabled:opacity-50"
                >
                    {confirmLabel}
                </button>
            </div>
        </form>
    );
}
