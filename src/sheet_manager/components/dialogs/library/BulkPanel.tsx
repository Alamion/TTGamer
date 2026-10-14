import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import clsx from 'clsx';
import type { ReactNode } from 'react';

import type { LibraryNode } from '../../../features/sheet/data/libraryTree';
import { ACTION_UI } from './actions';

const labels = uiMessages.sheet.library;

export interface BulkPanelProps {
    subjects: readonly LibraryNode[];
    /** How many selected rows cannot be deleted; any holds the delete back. */
    blockedCount: number;
    canMove: boolean;
    onDelete: () => void;
    onMove: () => void;
    /** The move form while it is open. */
    panel?: ReactNode;
}

/** The details side while several rows are selected: what they are and what they can do together. */
export function BulkPanel({
    subjects,
    blockedCount,
    canMove,
    onDelete,
    onMove,
    panel,
}: BulkPanelProps) {
    const plural = usePluralMessage();
    const actions = [
        { id: 'move' as const, run: onMove, disabled: !canMove },
        { id: 'delete' as const, run: onDelete, disabled: blockedCount > 0 },
    ];
    return (
        <section aria-labelledby="library-bulk-title" className="space-y-3 p-4">
            <header className="space-y-1">
                <h3 id="library-bulk-title" className="text-lg font-semibold text-textPrimary">
                    {plural(labels.bulk.title, subjects.length)}
                </h3>
                <p className="text-xs text-textSecondary">
                    {translate(labels.bulk.hint)} {translate(labels.bulk.touchHint)}
                </p>
            </header>
            <ul
                aria-label={translate(labels.bulk.names)}
                className="max-h-48 space-y-0.5 overflow-y-auto text-sm text-textPrimary"
            >
                {subjects.map((node) => (
                    <li key={node.key} className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate">{node.name}</span>
                        <span className="shrink-0 text-[11px] uppercase tracking-wide text-textSecondary">
                            {translate(labels.levels[node.level])}
                        </span>
                    </li>
                ))}
            </ul>
            {blockedCount > 0 && (
                <p
                    role="note"
                    className="rounded-sm border-l-2 border-secondary bg-secondary/10 px-3 py-2 text-xs text-textPrimary"
                >
                    {plural(labels.bulk.blocked, blockedCount)}
                </p>
            )}
            {!canMove && (
                <p className="text-xs text-textSecondary">{translate(labels.bulk.cannotMove)}</p>
            )}
            <div className="flex flex-wrap gap-2">
                {actions.map(({ id, run, disabled }) => {
                    const { label, icon: Icon, danger } = ACTION_UI[id];
                    return (
                        <button
                            key={id}
                            type="button"
                            data-library-action={id}
                            disabled={disabled}
                            onClick={run}
                            className={clsx(
                                'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40',
                                danger
                                    ? 'border-error/40 text-error hover:bg-error/10'
                                    : 'border-border text-textPrimary hover:border-secondary hover:bg-secondary/10'
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            {translate(label)}
                        </button>
                    );
                })}
            </div>
            {panel}
        </section>
    );
}
