import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { useState } from 'react';

import { edgeAt } from '../sheet/panes/dropTargets';
import {
    type GroupNode,
    groupOf,
    groupsInOrder,
    type LayoutNode,
    makeGroup,
    placeTab,
    splitGroup,
    type SplitSide,
} from '../sheet/panes/layoutTree';
import { MAX_GROUPS } from '../sheet/panes/types';

const sketch = uiMessages.sheet.guideSketch;
const panes = uiMessages.sheet.documents.panes;

/** Sample tabs of the sketch: names of example documents and one tool. */
const TAB_NAMES: Record<string, string> = {
    'd:jax': 'Jax Vorn',
    'd:lena': 'Lena Varga',
    'd:wampa': 'Wampa',
    't:dice': '🎲',
};

const START: LayoutNode = {
    type: 'split',
    direction: 'row',
    children: [makeGroup(['d:jax', 'd:lena'], 'a'), makeGroup(['d:wampa', 't:dice'], 'b')],
    weights: [1, 1],
};

const DRAG_TYPE = 'application/x-ttgamer-sketch-tab';
/** Where a dragged tab would land in a group: its half on an edge, or the whole group. */
const HIGHLIGHT: Record<SplitSide | 'center', string> = {
    center: 'inset-0',
    left: 'inset-y-0 left-0 w-1/2',
    right: 'inset-y-0 right-0 w-1/2',
    top: 'inset-x-0 top-0 h-1/2',
    bottom: 'inset-x-0 bottom-0 h-1/2',
};

const nameOf = (key: string) =>
    key === 't:dice' ? translate(uiMessages.dice.panel.title) : TAB_NAMES[key]!;

/**
 * A small layout of the guide (not the reader's own): tabs in groups, moved by dragging onto a
 * strip or a square of the dock compass, or with the tab menu's buttons. The moves are the sheet's
 * own tree operations, drawn simply.
 */
export function LayoutSketch() {
    const [root, setRoot] = useState<LayoutNode | null>(START);
    const [selected, setSelected] = useState('d:lena');
    const [dragging, setDragging] = useState<string | null>(null);
    const [over, setOver] = useState<{ id: string; side: SplitSide | 'center' } | null>(null);
    const groups = groupsInOrder(root);
    const full = groups.length >= MAX_GROUPS;

    const apply = (next: LayoutNode | null, key: string) => {
        setRoot(next);
        setSelected(key);
        setDragging(null);
        setOver(null);
    };
    const drop = (key: string, group: GroupNode, side: SplitSide | 'center') =>
        apply(
            side === 'center'
                ? placeTab(root, key, group.id)
                : splitGroup(root, group.id, side, key),
            key
        );
    const keyIn = (event: React.DragEvent) => event.dataTransfer.getData(DRAG_TYPE) || dragging;

    const current = groupOf(root, selected);
    const next = current ? groups[(groups.indexOf(current) + 1) % groups.length] : undefined;

    const renderNode = (node: LayoutNode): React.ReactNode => {
        if (node.type === 'split') {
            return (
                <div
                    className={clsx(
                        'flex min-h-0 min-w-0 flex-1 gap-1',
                        node.direction === 'column' && 'flex-col'
                    )}
                >
                    {node.children.map((child, index) => (
                        <div
                            key={child.type === 'group' ? child.id : index}
                            className="flex min-h-0 min-w-0"
                            style={{ flex: `${node.weights[index] ?? 1} 1 0` }}
                        >
                            {renderNode(child)}
                        </div>
                    ))}
                </div>
            );
        }
        const number = groups.indexOf(node) + 1;
        return (
            <div
                className={clsx(
                    'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border bg-bgBase',
                    over?.id === node.id ? 'border-primary' : 'border-border'
                )}
                onDragOver={(event) => {
                    if (!dragging) return;
                    event.preventDefault();
                    const edge = full
                        ? null
                        : edgeAt(
                              event.currentTarget.getBoundingClientRect(),
                              event.clientX,
                              event.clientY
                          );
                    const side = edge ?? 'center';
                    if (over?.id !== node.id || over.side !== side) setOver({ id: node.id, side });
                }}
                onDrop={(event) => {
                    const key = keyIn(event);
                    if (key && over?.id === node.id) drop(key, node, over.side);
                }}
                onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) setOver(null);
                }}
            >
                <div
                    role="tablist"
                    aria-label={translate(panes.groupLabel, { number })}
                    className="flex min-h-7 flex-wrap gap-0.5 border-b border-border bg-bgSurface p-0.5"
                >
                    {node.tabs.map((key) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            draggable
                            aria-selected={node.shown === key}
                            onDragStart={(event) => {
                                event.dataTransfer.setData(DRAG_TYPE, key);
                                event.dataTransfer.effectAllowed = 'move';
                                setDragging(key);
                            }}
                            onDragEnd={() => {
                                setDragging(null);
                                setOver(null);
                            }}
                            onClick={() =>
                                apply(placeTab(root, key, node.id, node.tabs.indexOf(key)), key)
                            }
                            className={clsx(
                                'max-w-full cursor-grab truncate rounded-sm px-1.5 py-0.5 text-xs',
                                node.shown === key
                                    ? 'bg-bgBase font-semibold text-textPrimary'
                                    : 'text-textSecondary hover:text-textPrimary',
                                selected === key && 'ring-1 ring-primary'
                            )}
                        >
                            {nameOf(key)}
                        </button>
                    ))}
                </div>
                <div aria-hidden="true" className="flex flex-1 flex-col gap-1 p-2">
                    <div className="truncate text-xs font-semibold text-textSecondary">
                        {nameOf(node.shown)}
                    </div>
                    <div className="h-1.5 w-3/4 rounded-full bg-border" />
                    <div className="h-1.5 w-1/2 rounded-full bg-border" />
                    <div className="h-1.5 w-2/3 rounded-full bg-border" />
                </div>
                {dragging && over?.id === node.id && (
                    <div
                        aria-hidden="true"
                        className={clsx(
                            'pointer-events-none absolute rounded-sm bg-primary/25',
                            HIGHLIGHT[over.side]
                        )}
                    />
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-2 p-3">
            <p className="m-0 text-xs text-textSecondary">{translate(sketch.hint)}</p>
            <div
                role="group"
                aria-label={translate(sketch.label)}
                className="flex h-56 rounded-md bg-bgSurface"
            >
                {root && renderNode(root)}
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
                {current && (
                    <>
                        <span className="self-center font-semibold text-textPrimary">
                            {nameOf(selected)}:
                        </span>
                        <SketchButton
                            disabled={full || current.tabs.length < 2}
                            onClick={() =>
                                apply(splitGroup(root, current.id, 'right', selected), selected)
                            }
                        >
                            {translate(panes.splitRight)}
                        </SketchButton>
                        <SketchButton
                            disabled={full || current.tabs.length < 2}
                            onClick={() =>
                                apply(splitGroup(root, current.id, 'bottom', selected), selected)
                            }
                        >
                            {translate(panes.splitDown)}
                        </SketchButton>
                        <SketchButton
                            disabled={!next || next === current}
                            onClick={() =>
                                next && apply(placeTab(root, selected, next.id), selected)
                            }
                        >
                            {translate(panes.moveToNextGroup)}
                        </SketchButton>
                    </>
                )}
                <SketchButton onClick={() => apply(START, 'd:lena')}>
                    {translate(sketch.reset)}
                </SketchButton>
            </div>
        </div>
    );
}

function SketchButton({
    disabled,
    onClick,
    children,
}: {
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="rounded-sm border border-border bg-bgBase px-2 py-1 text-textPrimary hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
            {children}
        </button>
    );
}
