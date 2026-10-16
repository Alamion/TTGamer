import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { Maximize2, Minimize2, MoreHorizontal } from 'lucide-react';
import type { DragEvent, ReactNode } from 'react';

import type { DropTarget } from './dropTargets';
import type { GroupNode } from './layoutTree';
import { focusTab, toggleMaximized } from './paneStore';
import { PaneTabs } from './PaneTabs';
import type { useTabDrag } from './useTabDrag';

const labels = uiMessages.sheet.documents.panes;
const iconButton =
    'rounded-sm p-1 text-textSecondary hover:text-textPrimary pointer-coarse:min-h-8 pointer-coarse:min-w-8';

const OVERLAY: Record<string, string> = {
    middle: 'inset-0',
    left: 'inset-y-0 left-0 w-1/2',
    right: 'inset-y-0 right-0 w-1/2',
    top: 'inset-x-0 top-0 h-1/2',
    bottom: 'inset-x-0 bottom-0 h-1/2',
};

/**
 * One group of the layout (spec 036): a frame holding its strip of tabs, the shown tab's controls,
 * and the shown tab's page, which is where tabs are dropped to move them in or split the group.
 */
export function PaneGroup({
    body,
    bodyTarget,
    drag,
    end,
    fill,
    focused,
    framed,
    maximizable,
    node,
    number,
    target,
    onClose,
    onMenu,
    titleOf,
}: {
    body: ReactNode;
    /** Where a tab dragged over the page would land, or nothing. */
    bodyTarget: (event: DragEvent<HTMLElement>) => DropTarget | null;
    drag: ReturnType<typeof useTabDrag> | null;
    end: ReactNode;
    fill: boolean;
    focused: boolean;
    framed: boolean;
    maximizable: boolean;
    node: GroupNode;
    number: number;
    /** Where a dragged tab or window would land in this group, shown over it. */
    target: DropTarget | null;
    onClose: (key: string) => void;
    onMenu: (key: string, anchor: { x: number; y: number }) => void;
    titleOf: (key: string) => string;
}) {
    return (
        <div
            className={clsx(
                'relative flex min-h-0 min-w-0 flex-col',
                fill && 'h-full',
                framed &&
                    clsx(
                        // Clipped to its rounded corners: the first tab sits in the top left one.
                        'overflow-hidden rounded-lg border',
                        focused ? 'border-primary-muted' : 'border-borderMoreContrast'
                    )
            )}
            data-group-frame=""
            onPointerDownCapture={() => {
                if (!focused) focusTab(node.shown);
            }}
            onFocusCapture={() => {
                if (!focused) focusTab(node.shown);
            }}
        >
            <div data-group-strip={node.id}>
                <PaneTabs
                    inset={framed}
                    label={translate(labels.groupLabel, { number })}
                    tabs={node.tabs.map((key) => ({ key, name: titleOf(key) }))}
                    selected={node.shown}
                    onSelect={focusTab}
                    onClose={onClose}
                    onMaximize={maximizable ? () => toggleMaximized(node.id) : undefined}
                    onMenu={onMenu}
                    drag={
                        drag
                            ? {
                                  onStart: drag.start,
                                  onEnd: drag.end,
                                  onOver: (gap, event) =>
                                      drag.over({ kind: 'strip', groupId: node.id, gap }, event),
                                  onDrop: (gap, event) =>
                                      drag.drop({ kind: 'strip', groupId: node.id, gap }, event),
                                  gap: target?.kind === 'strip' ? target.gap : null,
                              }
                            : undefined
                    }
                    end={
                        <>
                            {end}
                            <button
                                type="button"
                                aria-label={translate(labels.actions, {
                                    name: titleOf(node.shown),
                                })}
                                aria-haspopup="menu"
                                onClick={(event) => {
                                    const box = event.currentTarget.getBoundingClientRect();
                                    onMenu(node.shown, { x: box.left, y: box.bottom });
                                }}
                                className={iconButton}
                            >
                                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </>
                    }
                />
            </div>
            <div
                data-group-body={node.id}
                className={clsx('relative', fill && 'flex min-h-0 flex-1 flex-col')}
                onDragOver={drag ? (event) => drag.over(bodyTarget(event), event) : undefined}
                onDrop={drag ? (event) => drag.drop(bodyTarget(event), event) : undefined}
                onDragLeave={
                    drag
                        ? (event) => {
                              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                                  drag.clear();
                              }
                          }
                        : undefined
                }
            >
                {body}
                <DropOverlay target={target} />
            </div>
        </div>
    );
}

/** Where a dragged tab would land on a group's page: its middle, or the half at an edge. */
export function DropOverlay({ target }: { target: DropTarget | null }) {
    if (!target || target.kind === 'strip') return null;
    const place = target.kind === 'edge' ? target.side : 'middle';
    return (
        <div
            aria-hidden="true"
            data-drop-overlay={place}
            className={clsx(
                'pointer-events-none absolute z-10 rounded-md border-2 border-primary bg-primary/15',
                OVERLAY[place]
            )}
        />
    );
}

/** The button that gives a group the whole area, or gives it back. */
export function MaximizeButton({
    groupId,
    maximized,
    name,
}: {
    groupId: string;
    maximized: boolean;
    name: string;
}) {
    return (
        <button
            type="button"
            aria-label={
                maximized ? translate(labels.restore) : translate(labels.maximize, { name })
            }
            aria-pressed={maximized}
            onClick={() => toggleMaximized(groupId)}
            className={iconButton}
        >
            {maximized ? (
                <Minimize2 className="h-4 w-4" aria-hidden="true" />
            ) : (
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
        </button>
    );
}
