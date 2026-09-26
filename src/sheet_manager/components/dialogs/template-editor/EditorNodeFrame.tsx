import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { AlertTriangle, GripVertical, Plus } from 'lucide-react';
import { memo, type ReactNode, useState } from 'react';

import type { OverlayPlacement } from '../../../features/sheet/declarative/editorOverlay';
import type { TemplateNode } from '../../../types/template';
import { AddElementMenu } from './AddElementMenu';
import {
    carriesNode,
    draggedNodeId,
    NODE_MIME,
    useEditorActions,
    useEditorSelection,
} from './editorActions';
import { useEditorModel } from './EditorModel';
import { nodeDisplayName, nodeKindLabel } from './ElementSettings';

const editor = uiMessages.sheet.templates.editor;

function slotKey({ parentId, index, column }: OverlayPlacement): string {
    return `${parentId ?? 'root'}:${index}:${column ?? '-'}`;
}

/**
 * An insertion point: a thin bar between elements (or a dashed zone for an empty column) that
 * opens the add menu and accepts dropped elements.
 */
export const InsertSlot = memo(function InsertSlot({
    column,
    emptyColumn = false,
    index,
    parentId,
}: OverlayPlacement & { emptyColumn?: boolean }) {
    const placement: OverlayPlacement = { parentId, index, column };
    const actions = useEditorActions();
    const { atNodeLimit } = useEditorModel();
    const [over, setOver] = useState(false);
    const label = emptyColumn
        ? translate(editor.emptyColumn, { column: placement.column ?? 1 })
        : translate(editor.insertHere);

    return (
        <AddElementMenu
            disabled={atNodeLimit}
            onInsert={(node) => actions.insertAt(placement, node)}
        >
            <button
                type="button"
                aria-label={label}
                data-insert-slot={slotKey(placement)}
                data-drop-zone={
                    emptyColumn ? `${placement.parentId ?? 'root'}:${placement.column}` : undefined
                }
                onClick={(event) => event.stopPropagation()}
                onDragOver={(event) => {
                    if (!carriesNode(event)) return;
                    event.preventDefault();
                    event.stopPropagation();
                    event.dataTransfer.dropEffect = 'move';
                    setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={(event) => {
                    const nodeId = draggedNodeId(event);
                    if (!nodeId) return;
                    event.preventDefault();
                    event.stopPropagation();
                    setOver(false);
                    actions.moveTo(nodeId, placement);
                }}
                className={clsx(
                    'group/slot flex w-full items-center justify-center rounded transition-colors focus:outline-none focus-visible:bg-primary/20',
                    emptyColumn
                        ? 'min-h-14 border border-dashed border-borderMoreContrast p-2 text-center text-xs text-textSecondary hover:border-primary hover:text-primary'
                        : 'h-2 hover:bg-primary/20',
                    over && 'bg-primary/40 text-textPrimary'
                )}
            >
                {emptyColumn ? (
                    label
                ) : (
                    <Plus
                        className="h-3.5 w-3.5 rounded-full bg-primary-muted text-white opacity-0 group-hover/slot:opacity-100 group-focus-visible/slot:opacity-100"
                        aria-hidden="true"
                    />
                )}
            </button>
        </AddElementMenu>
    );
});

/**
 * The editor's frame around one rendered element: selection and hover outlines, the chip with
 * the drag grip, the insertion slot before the element, and the condition-hidden marking.
 */
interface EditorNodeFrameProps extends OverlayPlacement {
    conditionHidden: boolean;
    content: ReactNode;
    node: TemplateNode;
    version: unknown;
}

/**
 * Template edits rebuild only the path to the changed node, so an unchanged node in the same
 * place showing the same data renders the same content: skip it. `content` is ignored on
 * purpose — it is a new element on every render of the parent.
 */
function sameFrame(previous: EditorNodeFrameProps, next: EditorNodeFrameProps): boolean {
    return (
        previous.node === next.node &&
        previous.version === next.version &&
        previous.conditionHidden === next.conditionHidden &&
        previous.parentId === next.parentId &&
        previous.index === next.index &&
        previous.column === next.column
    );
}

export const EditorNodeFrame = memo(function EditorNodeFrame({
    column,
    conditionHidden,
    content,
    index,
    node,
    parentId,
}: EditorNodeFrameProps) {
    const { selectedId, issueNodeIds } = useEditorSelection();
    const selected = selectedId === node.id;
    const hasIssue = issueNodeIds.has(node.id);
    const name = nodeDisplayName(node);

    return (
        <div className="grid gap-1">
            <InsertSlot parentId={parentId} index={index} column={column} />
            <div
                data-editor-frame=""
                data-node-id={node.id}
                data-selected={selected ? '' : undefined}
                data-condition-hidden={conditionHidden ? '' : undefined}
                className={clsx(
                    'relative rounded-md outline-offset-2',
                    selected
                        ? 'outline outline-2 outline-primary-muted'
                        : '[&[data-hover]]:outline [&[data-hover]]:outline-1 [&[data-hover]]:outline-secondary',
                    hasIssue && !selected && 'outline outline-1 outline-error',
                    conditionHidden &&
                        'bg-[repeating-linear-gradient(135deg,transparent_0_8px,rgb(var(--text-secondary)/0.08)_8px_16px)]',
                    '[&[data-hover]>[data-editor-chip]]:flex [&[data-selected]>[data-editor-chip]]:flex'
                )}
            >
                <span
                    data-editor-chip=""
                    className="absolute -top-3 left-2 z-10 hidden max-w-[80%] items-center gap-1 rounded bg-primary-muted py-0.5 pl-0.5 pr-2 text-[11px] leading-none text-white shadow"
                >
                    <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                            event.stopPropagation();
                            event.dataTransfer.setData(NODE_MIME, node.id);
                            event.dataTransfer.effectAllowed = 'move';
                        }}
                        aria-label={`${translate(editor.gripHandle)}: ${name}`}
                        data-testid={`page-grip-${node.id}`}
                        className="cursor-grab rounded bg-white/20 p-0.5 active:cursor-grabbing"
                    >
                        <GripVertical className="h-3 w-3" aria-hidden="true" />
                    </button>
                    {hasIssue && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                    <span className="truncate">
                        {nodeKindLabel(node)} · {name}
                    </span>
                </span>
                {content}
                {conditionHidden && node.visibleWhen && (
                    <p className="mt-1 px-2 text-xs text-textSecondary">
                        {translate(editor.hiddenByCondition, {
                            coordinate: node.visibleWhen.coordinate,
                            value: `${node.visibleWhen.not ? '≠ ' : ''}${String(
                                node.visibleWhen.equals
                            )}`,
                        })}
                    </p>
                )}
            </div>
        </div>
    );
}, sameFrame);
