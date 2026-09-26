import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import clsx from 'clsx';
import { AlertTriangle, ArrowRightLeft } from 'lucide-react';

import type { MovePlan, MoveTarget } from '../../../features/sheet/data/libraryMoves';
import type { LibraryNode } from '../../../features/sheet/data/libraryTree';
import { EditorHelp } from '../template-editor/EditorHelp';

const labels = uiMessages.sheet.library;

export interface MovePanelProps {
    subject: LibraryNode;
    targets: readonly MoveTarget[];
    chosenKey: string | undefined;
    plan: MovePlan | undefined;
    onChoose: (key: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

/** What a move changes, shown before anything moves (FR-014, FR-015a). */
export function MoveConsequences({ plan }: { plan: MovePlan }) {
    const plural = usePluralMessage();
    const values = { from: plan.fromName, to: plan.toName };
    return (
        <div className="space-y-1.5 text-xs text-textPrimary">
            {plan.crossesSystem && (
                <div
                    role="note"
                    className="space-y-1 rounded border border-secondary/60 bg-secondary/10 px-3 py-2"
                >
                    <p className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
                        {translate(labels.move.warningTitle)}
                    </p>
                    <p>{translate(labels.move.warning, values)}</p>
                    {plan.subject.level === 'setting' && (
                        <p>{translate(labels.move.coreChanges, values)}</p>
                    )}
                    {plan.documentsStaying > 0 && (
                        <p>{plural(labels.move.documentsStaying, plan.documentsStaying, values)}</p>
                    )}
                    {plan.pagesStaying > 0 && (
                        <p>{plural(labels.move.pagesStaying, plan.pagesStaying, values)}</p>
                    )}
                </div>
            )}
            {plan.subject.level === 'page' ? (
                <p className="text-textSecondary">{translate(labels.move.pageNote)}</p>
            ) : (
                <p className="text-textSecondary">
                    {plural(labels.move.documentsMoving, plan.documentsMoving)}
                </p>
            )}
        </div>
    );
}

/** "Move…": destinations as buttons with their path, then the consequences and Move. */
export function MovePanel({
    subject,
    targets,
    chosenKey,
    plan,
    onChoose,
    onConfirm,
    onCancel,
}: MovePanelProps) {
    const where =
        subject.level === 'setting'
            ? labels.move.toRuleset
            : subject.level === 'type'
              ? labels.move.toSetting
              : labels.move.toType;
    return (
        <div
            className="space-y-3 rounded-lg border border-border bg-bgBase p-3"
            data-testid="library-move-panel"
        >
            <div className="flex items-center gap-2">
                <h4 className="flex-1 text-sm font-semibold text-textPrimary">
                    {translate(labels.move.title, { name: subject.name })}
                </h4>
                <EditorHelp topic="libraryMove" about={translate(labels.actions.move)} />
            </div>
            <p className="text-xs text-textSecondary">
                {translate(where)} {translate(labels.move.dragHint)}
            </p>
            {targets.length === 0 ? (
                <p className="text-xs text-textSecondary">{translate(labels.move.noTargets)}</p>
            ) : (
                <div
                    role="group"
                    aria-label={translate(labels.move.targets)}
                    className="flex max-h-56 flex-col gap-1 overflow-y-auto"
                >
                    {targets.map(({ node, path, crossesSystem }) => (
                        <button
                            key={node.key}
                            type="button"
                            aria-pressed={node.key === chosenKey}
                            onClick={() => onChoose(node.key)}
                            className={clsx(
                                'flex items-start gap-2 rounded border px-2 py-1.5 text-left text-sm',
                                node.key === chosenKey
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-secondary hover:bg-secondary/10'
                            )}
                        >
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-textPrimary">{node.name}</span>
                                {path && (
                                    <span className="block truncate text-xs text-textSecondary">
                                        {path}
                                    </span>
                                )}
                            </span>
                            {crossesSystem && (
                                <span className="shrink-0 rounded bg-secondary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-textPrimary">
                                    {translate(labels.move.otherRules)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
            {plan && <MoveConsequences plan={plan} />}
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    disabled={!plan}
                    onClick={onConfirm}
                    className="inline-flex items-center gap-1.5 rounded bg-primary-muted px-3 py-1 text-sm font-medium text-white hover:bg-primary disabled:opacity-40"
                >
                    <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    {translate(labels.move.confirm)}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded border border-border px-3 py-1 text-sm text-textPrimary hover:bg-bgSurface"
                >
                    {translate(labels.actions.cancel)}
                </button>
            </div>
        </div>
    );
}
