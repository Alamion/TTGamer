import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import clsx from 'clsx';
import type { ReactNode } from 'react';

import type { FoundNode, LibraryNode } from '../../../features/sheet/data/libraryTree';
import { systemRegistry } from '../../../systems';
import { ACTION_UI, type LibraryActionId } from './actions';

const labels = uiMessages.sheet.library;

export interface DetailsPaneProps {
    found: FoundNode | undefined;
    actions: readonly LibraryActionId[];
    onAction: (id: LibraryActionId) => void;
    /** An open inline form or panel (create, edit, move) shown under the actions. */
    panel?: ReactNode;
}

function Note({ children }: { children: ReactNode }) {
    return (
        <p className="rounded border-l-2 border-secondary bg-secondary/10 px-3 py-2 text-xs text-textPrimary">
            {children}
        </p>
    );
}

function notesFor(node: LibraryNode, plural: ReturnType<typeof usePluralMessage>): ReactNode[] {
    const notes: ReactNode[] = [];
    if (node.unavailable) {
        notes.push(translate(labels.details.unavailableNote));
        return notes;
    }
    switch (node.level) {
        case 'ruleset': {
            notes.push(translate(labels.details.rulesetIntro));
            const system = systemRegistry.getSystem(node.systemId);
            const names = (system?.coreDefinitions ?? [])
                .map((id) => systemRegistry.getDocumentDefinition(node.systemId, id))
                .map((definition) => (definition ? translate(definition.label) : undefined))
                .filter(Boolean)
                .join(', ');
            if (names) notes.push(translate(labels.details.coreCharacters, { names }));
            break;
        }
        case 'setting':
            if (node.ref.kind === 'rules') notes.push(translate(labels.details.rulesOnlyNote));
            else if (node.ownership === 'shipped')
                notes.push(translate(labels.details.shippedSettingNote));
            notes.push(plural(labels.counts.documents, node.documentCount));
            break;
        case 'type': {
            if (node.ref.kind === 'shipped') notes.push(translate(labels.details.shippedTypeNote));
            if (node.ref.kind === 'core') notes.push(translate(labels.details.coreTypeNote));
            notes.push(plural(labels.counts.documents, node.documentCount));
            const current = node.pages.find(({ isDefault }) => isDefault);
            if (current) {
                notes.push(translate(labels.details.defaultPage, { name: current.name }));
                notes.push(
                    translate(
                        node.ref.kind === 'shipped'
                            ? labels.details.defaultNewOnly
                            : labels.details.defaultChangesExisting
                    )
                );
            }
            if (node.fallback === 'stored-values')
                notes.push(translate(labels.details.storedValuesNote));
            if (node.fallback === 'rules-only')
                notes.push(translate(labels.details.rulesOnlyFallback));
            break;
        }
        case 'page':
            if (node.ref.kind === 'shipped') notes.push(translate(labels.details.shippedPageNote));
            if (node.isDefault) notes.push(translate(labels.details.isDefault));
            if (node.ref.kind === 'shipped' && node.ref.edited)
                notes.push(translate(labels.details.isEdited));
            break;
    }
    return notes;
}

/** What the selected item is and what can be done with it (contracts/library-ui.md). */
export function DetailsPane({ found, actions, onAction, panel }: DetailsPaneProps) {
    const plural = usePluralMessage();
    if (!found) {
        return (
            <p className="p-4 text-sm text-textSecondary">
                {translate(labels.details.nothingSelected)}
            </p>
        );
    }
    const { node, ancestors } = found;
    const notes = notesFor(node, plural);
    const path = ancestors.map(({ name }) => name).join(' › ');

    return (
        <section aria-labelledby="library-details-title" className="space-y-3 p-4">
            <header className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-textSecondary">
                    {translate(labels.levels[node.level])}
                </p>
                <h3
                    id="library-details-title"
                    className="break-words text-lg font-semibold text-textPrimary"
                >
                    {node.name}
                </h3>
                {path && (
                    <p className="text-xs text-textSecondary">
                        <span className="sr-only">{translate(labels.details.path)}: </span>
                        {path}
                    </p>
                )}
                <p className="text-sm text-textSecondary">
                    {node.description ?? translate(labels.details.noDescription)}
                </p>
            </header>

            {notes.length > 0 && (
                <div className="space-y-1.5">
                    {notes.map((note, index) =>
                        typeof note === 'string' && index === 0 ? (
                            <Note key={index}>{note}</Note>
                        ) : (
                            <p key={index} className="text-xs text-textSecondary">
                                {note}
                            </p>
                        )
                    )}
                </div>
            )}

            {actions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {actions.map((id) => {
                        const { label, icon: Icon, danger } = ACTION_UI[id];
                        return (
                            <button
                                key={id}
                                type="button"
                                data-library-action={id}
                                onClick={() => onAction(id)}
                                className={clsx(
                                    'inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium transition-colors',
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
            )}

            {panel}
        </section>
    );
}
