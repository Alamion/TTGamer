import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';

import type { TemplateNode } from '../../../types/template';
import {
    type ElementActions,
    ElementActionsRow,
    nodeDisplayName,
    nodeKindLabel,
} from './ElementSettings';

const editor = uiMessages.sheet.templates.editor;

/**
 * The settings area with several elements selected (spec 023, contract "Settings area with several
 * elements"): the count, the selected names (each opens that element alone), and the shared
 * actions.
 */
export function MultiSettings({
    actions,
    nodes,
    onOpen,
}: {
    actions: ElementActions;
    nodes: readonly TemplateNode[];
    onOpen: (nodeId: string) => void;
}) {
    const plural = usePluralMessage();
    return (
        <div data-settings-for="multiple" className="grid gap-3">
            <div className="grid gap-1.5">
                <ElementActionsRow actions={actions} />
                <h4 className="text-sm font-semibold text-textPrimary">
                    {plural(editor.selectedCount, nodes.length, { count: nodes.length })}
                </h4>
            </div>
            <ul aria-label={translate(editor.selectedElements)} className="grid gap-0.5">
                {nodes.map((node) => (
                    <li key={node.id}>
                        <button
                            type="button"
                            onClick={() => onOpen(node.id)}
                            aria-label={translate(editor.openSelected, {
                                name: nodeDisplayName(node),
                            })}
                            className="flex w-full items-baseline gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-secondary/15"
                        >
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-textSecondary">
                                {nodeKindLabel(node)}
                            </span>
                            <span className="min-w-0 truncate text-textPrimary">
                                {nodeDisplayName(node)}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
