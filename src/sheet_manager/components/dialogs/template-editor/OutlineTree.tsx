import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { AlertTriangle, EyeOff, GripVertical } from 'lucide-react';
import { memo, useState } from 'react';

import type { OverlayPlacement } from '../../../features/sheet/declarative/editorOverlay';
import type { TemplateNode } from '../../../types/template';
import { isContainerNode } from '../../../types/template';
import {
    carriesNode,
    draggedNodeId,
    NODE_MIME,
    useEditorActions,
    useEditorSelection,
} from './editorActions';
import { nodeDisplayName, nodeKindLabel } from './ElementSettings';

const editor = uiMessages.sheet.templates.editor;

/** Drop-target behaviour shared by rows ("before this element") and list ends. */
function useDropTarget(placement: OverlayPlacement) {
    const actions = useEditorActions();
    const [over, setOver] = useState(false);
    return {
        over,
        handlers: {
            onDragOver: (event: React.DragEvent) => {
                if (!carriesNode(event)) return;
                event.preventDefault();
                event.stopPropagation();
                event.dataTransfer.dropEffect = 'move';
                setOver(true);
            },
            onDragLeave: () => setOver(false),
            onDrop: (event: React.DragEvent) => {
                const nodeId = draggedNodeId(event);
                if (!nodeId) return;
                event.preventDefault();
                event.stopPropagation();
                setOver(false);
                actions.moveTo(nodeId, placement);
            },
        },
    };
}

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
    const { over, handlers } = useDropTarget({ parentId, index, column });
    const name = nodeDisplayName(node);

    return (
        <li
            {...handlers}
            className={clsx('border-t-2', over ? 'border-editor' : 'border-transparent')}
        >
            <div
                data-outline-row={node.id}
                data-node-type={node.type}
                aria-current={selected ? 'true' : undefined}
                className={clsx(
                    'flex items-center gap-1 rounded pr-1 text-sm',
                    selected ? 'bg-editor text-white' : 'text-textPrimary hover:bg-editor/10'
                )}
                style={{ paddingLeft: `${depth * 0.75}rem` }}
            >
                <button
                    type="button"
                    draggable
                    onDragStart={(event) => {
                        event.dataTransfer.setData(NODE_MIME, node.id);
                        event.dataTransfer.effectAllowed = 'move';
                    }}
                    aria-label={`${translate(editor.gripHandle)}: ${name}`}
                    data-testid={`grip-${node.id}`}
                    className="cursor-grab rounded p-1 opacity-60 hover:opacity-100 active:cursor-grabbing"
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
    const { over, handlers } = useDropTarget(placement);
    return (
        <li
            {...handlers}
            data-drop-zone={placement.parentId ?? 'root'}
            className={clsx('min-h-2 border-t-2', over ? 'border-editor' : 'border-transparent')}
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
    return <OutlineList depth={0} nodes={nodes} parentColumns={1} parentId={null} />;
});
