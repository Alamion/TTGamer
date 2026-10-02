import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { AlertTriangle, EyeOff, GripVertical } from 'lucide-react';
import { memo } from 'react';

import type { OverlayPlacement } from '../../../features/sheet/declarative/editorOverlay';
import type { TemplateNode } from '../../../types/template';
import { isContainerNode } from '../../../types/template';
import { useEditorActions, useEditorSelection } from './editorActions';
import { nodeDisplayName, nodeKindLabel } from './ElementSettings';
import { slotKey, useEditorDragContext } from './useEditorDrag';

const editor = uiMessages.sheet.templates.editor;

/** A row's top border is the insertion line a drag marks (spec 022). */
const outlineSlot =
    'border-t-2 border-transparent [&[data-drop-target]]:border-primary [&[data-origin-slot]]:border-dashed [&[data-origin-slot]]:border-primary/60';

const OutlineItem = memo(function OutlineItem({
    depth,
    index,
    node,
    parentColumns,
    parentId,
}: {
    depth: number;
    index: number;
    node: TemplateNode;
    parentColumns: number;
    parentId: string | null;
}) {
    const actions = useEditorActions();
    const { selectedId, issueNodeIds } = useEditorSelection();
    const selected = selectedId === node.id;
    const column = parentColumns > 1 ? (node.column ?? null) : null;
    const name = nodeDisplayName(node);
    const drag = useEditorDragContext();

    return (
        <li data-outline-slot={slotKey({ parentId, index, column })} className={outlineSlot}>
            <div
                data-outline-row={node.id}
                data-node-type={node.type}
                aria-current={selected ? 'true' : undefined}
                className={clsx(
                    'flex items-center gap-1 rounded pr-1 text-sm',
                    selected
                        ? 'bg-primary/15 font-medium text-textPrimary shadow-[inset_2px_0_0_0_rgb(var(--primary))]'
                        : 'text-textPrimary hover:bg-secondary/15'
                )}
                style={{ paddingLeft: `${depth * 0.75}rem` }}
            >
                <button
                    type="button"
                    data-drag-handle=""
                    onPointerDown={(event) => drag?.start(node.id, event, 'outline')}
                    aria-label={`${translate(editor.gripHandle)}: ${name}`}
                    data-testid={`grip-${node.id}`}
                    className="cursor-grab touch-none select-none rounded p-1 opacity-60 hover:opacity-100 active:cursor-grabbing"
                >
                    <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => actions.select(node.id, 'outline')}
                    className="flex min-w-0 flex-1 items-baseline gap-2 py-1 text-left"
                >
                    <span className="w-14 shrink-0 truncate text-[10px] uppercase tracking-wide opacity-70">
                        {nodeKindLabel(node)}
                    </span>
                    <span className="truncate">{name}</span>
                </button>
                {node.visibleWhen && (
                    <EyeOff
                        className="h-3.5 w-3.5 shrink-0 opacity-70"
                        aria-label={translate(editor.visibleWhen)}
                    />
                )}
                {issueNodeIds.has(node.id) && (
                    <AlertTriangle
                        className={clsx('h-3.5 w-3.5 shrink-0', !selected && 'text-error')}
                        aria-label={translate(editor.elementIssue)}
                    />
                )}
            </div>
            {isContainerNode(node) && (
                <OutlineList
                    depth={depth + 1}
                    nodes={node.children}
                    parentColumns={node.columns ?? 1}
                    parentId={node.id}
                />
            )}
        </li>
    );
});

function OutlineEnd({ placement }: { placement: OverlayPlacement }) {
    return (
        <li
            data-outline-slot={slotKey(placement)}
            data-drop-zone={placement.parentId ?? 'root'}
            className={clsx('min-h-2', outlineSlot)}
        />
    );
}

function OutlineList({
    depth,
    nodes,
    parentColumns,
    parentId,
}: {
    depth: number;
    nodes: readonly TemplateNode[];
    parentColumns: number;
    parentId: string | null;
}) {
    return (
        <ul data-children-of={parentId ?? 'root'} className="grid">
            {nodes.map((node, index) => (
                <OutlineItem
                    key={node.id}
                    depth={depth}
                    index={index}
                    node={node}
                    parentColumns={parentColumns}
                    parentId={parentId}
                />
            ))}
            <OutlineEnd placement={{ parentId, index: nodes.length, column: null }} />
        </ul>
    );
}

/** The compact tree of the whole template: selection, drag, and drop by element. */
export const OutlineTree = memo(function OutlineTree({
    nodes,
}: {
    nodes: readonly TemplateNode[];
}) {
    return (
        <div data-outline="">
            <OutlineList depth={0} nodes={nodes} parentColumns={1} parentId={null} />
        </div>
    );
});
