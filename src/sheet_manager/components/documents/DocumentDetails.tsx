import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { ExternalLink, Trash2 } from 'lucide-react';

import { entryTitle } from '../../features/documents/rows';
import { kindLabel, kindSettingLabel } from '../../features/sheet/data/documentLabels';
import type { DocumentIndexEntry } from '../../store/documentIndex';
import { systemRegistry } from '../../systems';

const labels = uiMessages.sheet.documents.manager;

export interface DocumentDetailsProps {
    /** The selected documents; one shows its fields, several show a count. */
    documents: readonly DocumentIndexEntry[];
    onOpen: (entry: DocumentIndexEntry) => void;
    onDelete: () => void;
}

function formatTime(iso: string | undefined): string {
    if (!iso) return translate(labels.details.unknown);
    const time = new Date(iso);
    return Number.isNaN(time.getTime()) ? translate(labels.details.unknown) : time.toLocaleString();
}

function Field({ name, value }: { name: string; value: string }) {
    return (
        <div className="grid gap-0.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-textSecondary">
                {name}
            </dt>
            <dd className="m-0 break-words text-sm text-textPrimary">{value}</dd>
        </div>
    );
}

const actionButton =
    'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors [@media(pointer:coarse)]:px-3 [@media(pointer:coarse)]:py-2.5';

/** The right side of the documents window: the selected document's fields and what to do with it. */
export function DocumentDetails({ documents, onOpen, onDelete }: DocumentDetailsProps) {
    const plural = usePluralMessage();
    if (documents.length === 0) {
        return (
            <p className="p-4 text-sm text-textSecondary">{translate(labels.details.nothing)}</p>
        );
    }
    const [entry] = documents;
    const deleteButton = (
        <button
            type="button"
            onClick={onDelete}
            className={`${actionButton} border-error/40 text-error hover:bg-error/10`}
        >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {translate(labels.details.delete)}
        </button>
    );
    if (documents.length > 1 || !entry) {
        return (
            <section aria-labelledby="documents-details-title" className="space-y-3 p-4">
                <h3 id="documents-details-title" className="text-lg font-semibold">
                    {plural(labels.details.selected, documents.length)}
                </h3>
                <p className="text-xs text-textSecondary">{translate(labels.details.hint)}</p>
                <ul className="max-h-48 space-y-0.5 overflow-y-auto text-sm">
                    {documents.map((document) => (
                        <li key={document.id} className="truncate">
                            {entryTitle(document)}
                        </li>
                    ))}
                </ul>
                <div className="flex flex-wrap gap-2">{deleteButton}</div>
            </section>
        );
    }
    const system = systemRegistry.getSystem(entry.systemId);
    return (
        <section aria-labelledby="documents-details-title" className="space-y-3 p-4">
            <h3
                id="documents-details-title"
                className="break-words text-lg font-semibold text-textPrimary"
            >
                {entryTitle(entry)}
            </h3>
            <dl className="m-0 grid gap-3">
                <Field
                    name={translate(labels.details.kind)}
                    value={kindLabel(entry.systemId, entry.kind)}
                />
                <Field
                    name={translate(labels.details.system)}
                    value={system ? translate(system.label) : entry.systemId}
                />
                <Field
                    name={translate(labels.details.setting)}
                    value={kindSettingLabel(entry.systemId, entry.kind)}
                />
                <Field
                    name={translate(labels.details.place)}
                    value={translate(labels.details.top)}
                />
                <Field
                    name={translate(labels.details.created)}
                    value={formatTime(entry.createdAt)}
                />
                <Field
                    name={translate(labels.details.changed)}
                    value={formatTime(entry.changedAt)}
                />
            </dl>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => onOpen(entry)}
                    className={`${actionButton} border-border text-textPrimary hover:border-secondary hover:bg-secondary/10`}
                >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    {translate(labels.details.open)}
                </button>
                {deleteButton}
            </div>
        </section>
    );
}
