import { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { describeDegradedFields, parseTemplateFile } from '../../features/sheet/shell/templateFile';
import { useTemplateStore } from '../../store/templateStore';
import type { CustomTemplate } from '../../types/template';

const transfer = uiMessages.sheet.templates.transfer;

export interface TemplateImportDialogProps {
    onClose: () => void;
    open: boolean;
}

export function TemplateImportDialog({ onClose, open }: TemplateImportDialogProps) {
    const { saveTemplate, templates } = useTemplateStore();
    const t = (descriptor: { message: string }) => translate(descriptor);
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pending, setPending] = useState<CustomTemplate | null>(null);
    const conflictResolverRef = useRef<
        ((resolution: 'replace' | 'duplicate' | 'cancel') => void) | null
    >(null);

    const applyImport = (template: CustomTemplate) => {
        saveTemplate(template);
        toast.success(translate(transfer.importSuccess, { title: template.name }));
    };

    const handleFiles = async (fileList: FileList | null) => {
        // Capture files before resetting the input — clearing the value detaches the FileList.
        const files = Array.from(fileList ?? []);
        if (files.length === 0) return;
        const input = fileInputRef.current;
        if (input) input.value = '';

        for (const file of files) {
            let parsed;
            try {
                parsed = parseTemplateFile(await file.text());
            } catch {
                parsed = { ok: false as const, error: 'parse' as const };
            }

            if (!parsed.ok) {
                const reasonMessage = {
                    parse: transfer.importErrorFormat,
                    format: transfer.importErrorFormat,
                    version: transfer.importErrorVersion,
                    schema: transfer.importErrorSchema,
                }[parsed.error];
                toast.error(translate(reasonMessage, { filename: file.name }));
                continue;
            }

            const degradedLabels = describeDegradedFields(
                parsed.template,
                parsed.degradedCatalogFields
            );

            if (templates.some(({ id }) => id === parsed.template.id)) {
                // Identity collision — replace / duplicate / cancel, applied atomically.
                const resolution = await new Promise<'replace' | 'duplicate' | 'cancel'>(
                    (resolve) => {
                        conflictResolverRef.current = resolve;
                        setPending(parsed.template);
                    }
                );
                conflictResolverRef.current = null;
                setPending(null);
                if (resolution === 'cancel') continue;
                if (resolution === 'duplicate') {
                    applyImport({
                        ...parsed.template,
                        id: `tpl-${Date.now().toString(36)}${Math.random()
                            .toString(36)
                            .slice(2, 6)}`,
                    });
                } else {
                    applyImport(parsed.template);
                }
            } else {
                applyImport(parsed.template);
            }

            if (degradedLabels.length > 0) {
                toast(
                    translate(transfer.degradedReport, {
                        fields: degradedLabels.join(', '),
                    })
                );
            }
        }
        onClose();
    };

    const resolveConflict = (resolution: 'replace' | 'duplicate' | 'cancel') => {
        conflictResolverRef.current?.(resolution);
    };

    return (
        <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-[9999] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-bgSurface p-6 shadow-xl focus:outline-none">
                    <Dialog.Title className="text-lg font-semibold text-textPrimary">
                        {t(transfer.importTitle)}
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-textSecondary">
                        {t(transfer.importLabel)}
                    </Dialog.Description>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={(event) => void handleFiles(event.target.files)}
                        aria-label={t(transfer.importLabel)}
                        className="mt-4 w-full rounded border border-border bg-bgBase p-2 text-sm text-textPrimary file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:text-white"
                        multiple
                    />

                    <div className="mt-6 flex justify-end gap-2">
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="rounded border border-border bg-bgSurface px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-bgBase"
                            >
                                {t(uiMessages.sheet.templates.editor.cancel)}
                            </button>
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>

            <Dialog.Root
                open={pending !== null}
                onOpenChange={(isOpen) => {
                    if (!isOpen) resolveConflict('cancel');
                }}
            >
                <Dialog.Portal container={modalRoot ?? undefined}>
                    <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/50" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-[9999] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-bgSurface p-6 shadow-xl focus:outline-none">
                        <Dialog.Title className="text-lg font-semibold text-textPrimary">
                            {t(transfer.conflictTitle)}
                        </Dialog.Title>
                        <Dialog.Description className="mt-2 text-sm text-textSecondary">
                            {t(transfer.conflictPrompt)}
                        </Dialog.Description>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => resolveConflict('cancel')}
                                className="rounded border border-border bg-bgSurface px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-bgBase"
                            >
                                {t(uiMessages.sheet.documents.create.cancel)}
                            </button>
                            <button
                                type="button"
                                onClick={() => resolveConflict('duplicate')}
                                className="rounded border border-border bg-bgSurface px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-bgBase"
                            >
                                {t(uiMessages.sheet.documents.conflict.duplicate)}
                            </button>
                            <button
                                type="button"
                                onClick={() => resolveConflict('replace')}
                                className="rounded border border-transparent bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                            >
                                {t(uiMessages.sheet.documents.conflict.replace)}
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </Dialog.Root>
    );
}
