import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { FloatingWindow } from '@site/src/shared/components/FloatingWindow';
import { useMediaQuery } from '@site/src/shared/hooks/useMediaQuery';
import { PanelTop } from 'lucide-react';
import type { ReactNode } from 'react';

import { bodyTarget, type DropTarget, edgeAt, gapAt } from './dropTargets';
import { Pane } from './Pane';
import {
    canSplitAt,
    closeTab,
    dockFloating,
    hideShownTool,
    raise,
    setFloatingRect,
    usePaneStore,
} from './paneStore';
import { documentIdOf, tabKindOf, useTabKinds } from './tabKeys';

const labels = uiMessages.sheet.documents.panes;

/**
 * Where a floating window's title bar, let go at a point, would dock: a group's strip (at a gap)
 * or its page (an edge, or the middle). Floating windows under the point are looked through.
 */
function dockTargetAt(point: { x: number; y: number }, key: string): DropTarget | null {
    const layers = document.elementsFromPoint?.(point.x, point.y) ?? [];
    for (const layer of layers) {
        if (layer.closest('[data-floating-window]')) continue;
        const strip = layer.closest<HTMLElement>('[data-group-strip]');
        if (strip) {
            const tabs = [...strip.querySelectorAll<HTMLElement>('[data-tab]')].map((tab) =>
                tab.getBoundingClientRect()
            );
            return { kind: 'strip', groupId: strip.dataset.groupStrip!, gap: gapAt(tabs, point.x) };
        }
        const body = layer.closest<HTMLElement>('[data-group-body]');
        if (body) {
            const groupId = body.dataset.groupBody!;
            const side = edgeAt(body.getBoundingClientRect(), point.x, point.y);
            return bodyTarget(groupId, side, (edge) => canSplitAt(groupId, edge, key));
        }
    }
    return null;
}

/**
 * The tabs that float above the page (spec 036, US3), stacked in the order the layout keeps (the
 * front one last). A title bar dropped on a group docks the window there. On a phone no window
 * floats: the tool the reader opened fills the screen instead, and closing it keeps its place.
 */
export function FloatingTabs({
    renderDocument,
    titleOf,
}: {
    renderDocument: (documentId: string, viewId?: string) => ReactNode;
    titleOf: (key: string) => string;
}) {
    useTabKinds();
    const phone = useMediaQuery('(max-width: 767px)');
    const floating = usePaneStore((state) => state.floating);
    const views = usePaneStore((state) => state.views);
    const shownTool = usePaneStore((state) => state.shownTool);

    if (phone) {
        const kind = shownTool ? tabKindOf(shownTool) : undefined;
        if (!shownTool || !kind) return null;
        return (
            <FloatingWindow
                open
                id={shownTool}
                title={kind.title()}
                closeLabel={kind.closeLabel()}
                onClose={hideShownTool}
            >
                {kind.render({ onClose: hideShownTool })}
            </FloatingWindow>
        );
    }

    return floating.map(({ key, rect }, index) => {
        const id = documentIdOf(key);
        const kind = tabKindOf(key);
        if (!id && !kind) return null;
        const title = titleOf(key);
        const close = () => closeTab(key);
        return (
            <FloatingWindow
                key={key}
                open
                id={key}
                title={title}
                closeLabel={kind ? kind.closeLabel() : translate(labels.close, { name: title })}
                onClose={close}
                layout={rect}
                onLayoutChange={(next) => setFloatingRect(key, next)}
                zIndex={900 + index}
                onFocus={() => raise(key)}
                moveLabel={translate(labels.moveWindow, { name: title })}
                onDragMove={(point) =>
                    usePaneStore.setState({ dockHint: dockTargetAt(point, key) })
                }
                onDragEnd={(point) => {
                    const target = dockTargetAt(point, key);
                    usePaneStore.setState({ dockHint: null });
                    if (!target) return false;
                    dockFloating(key, target);
                    return true;
                }}
                actions={
                    <button
                        type="button"
                        aria-label={translate(labels.dock, { name: title })}
                        title={translate(labels.dock, { name: title })}
                        onClick={() => dockFloating(key)}
                        className="rounded-sm p-1 text-textSecondary hover:bg-bgSurface hover:text-textPrimary [@media(pointer:coarse)]:p-2.5"
                    >
                        <PanelTop className="h-4 w-4" aria-hidden="true" />
                    </button>
                }
            >
                {id ? (
                    <Pane
                        documentId={id}
                        fill
                        render={renderDocument}
                        unreadable={false}
                        view={views[id]}
                    />
                ) : (
                    kind!.render({ onClose: close })
                )}
            </FloatingWindow>
        );
    });
}
