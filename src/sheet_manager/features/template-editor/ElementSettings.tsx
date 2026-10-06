import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { Fragment, memo } from 'react';

import type { TemplateNode } from '../../types/template';
import { useEditorModel } from './EditorModel';
import { elementEditor, elementName, elementTypeLabel } from './elements/registry';
import { ColumnPlacementControl, ColumnSpanControl, VisibilityControl } from './LayoutControls';
import { type NodeEdits, useNodeEdits, useSelectionActions } from './session/useNodeEdits';
import { type GroupedSettings, mergeGroups } from './settings/groupedSettings';
import { SettingsGroup } from './settings/SettingsGroup';

const editor = uiMessages.sheet.templates.editor;

const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
    translate(descriptor, values);

export interface ElementActions {
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDuplicate: () => void;
    onRemove: () => void;
}

const actionButton =
    'flex h-7 w-7 items-center justify-center rounded border border-transparent text-textSecondary hover:border-border hover:text-textPrimary disabled:opacity-40';

/** Move up, move down, duplicate, and remove: for one element or a selection (spec 023). */
export function ElementActionsRow({ actions }: { actions: ElementActions }) {
    return (
        <div className="flex items-center gap-1">
            <button
                type="button"
                onClick={actions.onMoveUp}
                disabled={!actions.onMoveUp}
                aria-label={t(editor.moveUp)}
                title={t(editor.moveUp)}
                className={actionButton}
            >
                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
                type="button"
                onClick={actions.onMoveDown}
                disabled={!actions.onMoveDown}
                aria-label={t(editor.moveDown)}
                title={t(editor.moveDown)}
                className={actionButton}
            >
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
                type="button"
                onClick={actions.onDuplicate}
                aria-label={t(editor.duplicate)}
                title={t(editor.duplicate)}
                className={actionButton}
            >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span className="flex-1" />
            <button
                type="button"
                onClick={actions.onRemove}
                aria-label={t(editor.remove)}
                title={t(editor.remove)}
                className={`${actionButton} hover:text-error`}
            >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
        </div>
    );
}

/** Actions first, then the kind and the full name: a narrow area never hides the name. */
function ElementHeader({ actions, node }: { actions: ElementActions; node: TemplateNode }) {
    return (
        <div className="grid gap-1.5">
            <ElementActionsRow actions={actions} />
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5" data-element-name="">
                <span className="shrink-0 rounded bg-bgBase px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-textSecondary">
                    {elementTypeLabel(node)}
                </span>
                <span className="min-w-0 break-words text-sm font-semibold text-textPrimary">
                    {elementName(node)}
                </span>
            </p>
        </div>
    );
}

/** Where the element sits in a multi-column parent (Look) and when it shows (Visibility). */
function placementSettings({
    callbacks,
    node,
    parentColumns,
    pinnedSiblings,
}: {
    callbacks: NodeEdits;
    node: TemplateNode;
    parentColumns: number;
    pinnedSiblings: boolean;
}): GroupedSettings {
    return {
        look:
            parentColumns > 1 ? (
                <>
                    <ColumnPlacementControl
                        parentColumns={parentColumns}
                        value={node.column}
                        onChange={(column) => callbacks.onUpdate(node.id, { column })}
                    />
                    <ColumnSpanControl
                        parentColumns={parentColumns}
                        pinnedSiblings={pinnedSiblings}
                        value={node.span}
                        onChange={(span) => callbacks.onUpdate(node.id, { span })}
                    />
                </>
            ) : null,
        visibility: (
            <VisibilityControl
                value={node.visibleWhen}
                onChange={(visibleWhen) => callbacks.onUpdate(node.id, { visibleWhen })}
            />
        ),
    };
}

/**
 * The settings of one element (spec 012), grouped in a fixed order across kinds (spec 022):
 * Content, Value, Limits and formulas, Look, Visibility and help. Empty groups are left out.
 */
export const ElementSettings = memo(function ElementSettings({
    node,
    parentColumns = 1,
    pinnedSiblings = false,
}: {
    node: TemplateNode;
    parentColumns?: number;
    /** Some element of the same container is pinned to a column (spans do not apply). */
    pinnedSiblings?: boolean;
}) {
    const { bindings } = useEditorModel();
    const callbacks = useNodeEdits();
    const actions = useSelectionActions(node.id);
    const groups = mergeGroups([
        elementEditor(node).settings(node, { edits: callbacks, bindings }),
        placementSettings({ callbacks, node, parentColumns, pinnedSiblings }),
    ]);
    return (
        <div className="grid gap-2" data-settings-for={node.id}>
            <ElementHeader actions={actions} node={node} />
            <div>
                {groups.map(({ id, nodes }) => (
                    <SettingsGroup key={id} id={id} nodeId={node.id}>
                        {nodes.map((setting, index) => (
                            <Fragment key={index}>{setting}</Fragment>
                        ))}
                    </SettingsGroup>
                ))}
            </div>
        </div>
    );
});
