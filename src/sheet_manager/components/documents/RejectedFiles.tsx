import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { recoveryFileName, serializeRecoveryFile } from '../../features/sheet/shell/recoveryFile';
import { useDocumentStore } from '../../store/documentStore';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';

const labels = uiMessages.sheet.documents.manager;

/** Rejected import files kept for recovery: how many, download them, clear them (spec 031). */
export function RejectedFiles() {
    const recoveryEntries = useDocumentStore((state) => state.recoveryEntries);
    const clearRecoveryEntries = useDocumentStore((state) => state.clearRecoveryEntries);
    const [confirmClear, setConfirmClear] = useState(false);
    if (recoveryEntries.length === 0) return null;

    const download = () => {
        const url = URL.createObjectURL(
            new Blob([serializeRecoveryFile(recoveryEntries)], { type: 'application/json' })
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = recoveryFileName();
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <section
                aria-labelledby="rejected-files-heading"
                className="grid gap-2 border-t border-border p-3 text-xs text-textSecondary"
            >
                <p id="rejected-files-heading" className="m-0 font-semibold text-textPrimary">
                    {translate(labels.rejectedCount, { count: recoveryEntries.length })}
                </p>
                <p className="m-0">{translate(labels.rejectedHint)}</p>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={download}
                        className="flex items-center gap-1.5 rounded-sm border border-border bg-bgSurface px-3 py-1.5 font-medium text-textPrimary hover:bg-bgBase"
                    >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        {translate(labels.rejectedDownload)}
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmClear(true)}
                        className="flex items-center gap-1.5 rounded-sm border border-border bg-bgSurface px-3 py-1.5 font-medium text-error hover:bg-error/10"
                    >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {translate(labels.rejectedClear)}
                    </button>
                </div>
            </section>
            <ConfirmDialog
                open={confirmClear}
                onOpenChange={setConfirmClear}
                onConfirm={() => {
                    clearRecoveryEntries();
                    setConfirmClear(false);
                }}
                title={translate(labels.rejectedClearTitle)}
                description={translate(labels.rejectedClearDescription)}
                confirmLabel={translate(labels.rejectedClear)}
                cancelLabel={translate(uiMessages.sheet.documents.create.cancel)}
                variant="danger"
            />
        </>
    );
}
