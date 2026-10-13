import { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { BatchSummary, FileOutcome } from '../../features/sheet/shell/importBatch';

const text = uiMessages.sheet.documents.importSummary;

const REPAIR_LABEL: Record<string, { message: string }> = {
    'armor-name': text.repairArmorName,
    'resource-maximum': text.repairResourceMaximum,
};

const REASON_LABEL = {
    'not-json': text.reasonNotJson,
    'unknown-shape': text.reasonUnknownShape,
    'legacy-ended': text.reasonLegacyEnded,
} as const;

function reasonText({ reason }: FileOutcome): string {
    if (!reason) return '';
    if (reason.code === 'invalid') {
        return translate(text.reasonInvalid, { detail: reason.detail ?? '' });
    }
    return translate(REASON_LABEL[reason.code]);
}

interface ImportSummaryDialogProps {
    summary: BatchSummary | null;
    onClose: () => void;
}

/** The one summary a batch ends with when something was repaired or could not be imported. */
export function ImportSummaryDialog({ onClose, summary }: ImportSummaryDialogProps) {
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');
    const repaired = summary?.outcomes.filter(({ repairs }) => repairs.length > 0) ?? [];
    const rejected = summary?.outcomes.filter(({ status }) => status === 'rejected') ?? [];

    return (
        <Dialog.Root open={summary !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-[9999] max-h-[85vh] w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-bgSurface p-6 shadow-xl focus:outline-hidden">
                    <Dialog.Title className="text-lg font-semibold text-textPrimary">
                        {translate(text.title)}
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-textSecondary">
                        {summary &&
                            [
                                translate(text.imported, { count: summary.imported }),
                                translate(text.skipped, { count: summary.skipped }),
                                translate(text.rejected, { count: summary.rejected }),
                                translate(text.repaired, { count: summary.repaired }),
                            ].join(' · ')}
                    </Dialog.Description>
                    {repaired.length > 0 && (
                        <section className="mt-4">
                            <h3 className="text-sm font-semibold text-textPrimary">
                                {translate(text.repairedHeading)}
                            </h3>
                            <ul className="mt-1 grid gap-2 text-xs text-textSecondary">
                                {repaired.map((outcome) => (
                                    <li key={outcome.file}>
                                        <strong className="text-textPrimary">{outcome.file}</strong>
                                        <ul className="ml-4 list-disc">
                                            {outcome.repairs.map(({ kind, path }) => (
                                                <li key={path}>
                                                    {REPAIR_LABEL[kind]
                                                        ? translate(REPAIR_LABEL[kind])
                                                        : `${kind}: ${path}`}
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                    {rejected.length > 0 && (
                        <section className="mt-4">
                            <h3 className="text-sm font-semibold text-textPrimary">
                                {translate(text.rejectedHeading)}
                            </h3>
                            <ul role="alert" className="mt-1 grid gap-1 text-xs text-error">
                                {rejected.map((outcome) => (
                                    <li key={outcome.file}>
                                        <strong>{outcome.file}</strong>: {reasonText(outcome)}
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-2 text-xs text-textSecondary">
                                {translate(text.rejectedKept)}
                            </p>
                        </section>
                    )}
                    <div className="mt-6 flex justify-end">
                        <Dialog.Close className="rounded-sm border border-border bg-bgSurface px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-bgBase">
                            {translate(text.close)}
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
