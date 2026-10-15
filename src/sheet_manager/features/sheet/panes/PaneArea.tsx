import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Splitter } from '@site/src/shared/components/Splitter';
import { useMediaQuery } from '@site/src/shared/hooks/useMediaQuery';
import { useMeasuredElement } from '@site/src/shared/hooks/usePaneSizes';
import { clsx } from 'clsx';
import { type DragEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useDocumentStore } from '../../../store/documentStore';
import { documentLabeler } from '../../documents/labeler';
import { bodyTarget, type DropTarget, edgeAt } from './dropTargets';
import { FloatingTabs } from './FloatingTabs';
import { MIN_GROUP_HEIGHT, moveDivider, SIDE_BY_SIDE_WIDTH, weightsOf } from './layout';
import {
    type DividerPlace,
    findGroup,
    type GroupNode,
    groupsInOrder,
    type LayoutNode,
    minSizeOf,
    openKeys,
    reconcileLayout,
    type Rect,
    rectsOf,
    splitGroup,
    type SplitSide,
} from './layoutTree';
import { Pane } from './Pane';
import { MaximizeButton, PaneGroup } from './PaneGroup';
import { tabId } from './paneIds';
import { PaneSourceProvider } from './PaneSourceProvider';
import {
    closeTab,
    floatTab,
    focusTab,
    moveTab,
    setLayoutArea,
    setPaneView,
    setSplitWeights,
    splitWith,
    usePaneStore,
} from './paneStore';
import { PaneTabs } from './PaneTabs';
import { PaneViewSelect } from './PaneViewSelect';
import { docKey, documentIdOf, tabKindOf, useTabKinds } from './tabKeys';
import { TabMenu } from './TabMenu';
import { MAX_GROUPS } from './types';
import { useTabDrag } from './useTabDrag';

const labels = uiMessages.sheet.documents.panes;

const placeStyle = (rect: Rect) => ({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
});

const pixels = (rect: Rect) => ({
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
});

/**
 * The height from the element's top to the bottom of the window, at the page's top (spec 036,
 * FR-007): the layout fills the window below the toolbar and each group scrolls its own page.
 */
function useFillHeight(node: HTMLElement | null): number {
    const [height, setHeight] = useState(MIN_GROUP_HEIGHT * 2);
    useEffect(() => {
        if (!node) return;
        const measure = () => {
            const top = node.getBoundingClientRect().top + window.scrollY;
            setHeight(Math.max(MIN_GROUP_HEIGHT * 2, Math.round(window.innerHeight - top)));
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [node]);
    return height;
}

/** The first group's shown tab inside a node: what a divider next to it is named after. */
const shownOf = (node: LayoutNode) => groupsInOrder(node)[0]?.shown;

function childAt(root: LayoutNode | null, path: readonly number[]): LayoutNode | null {
    let node = root;
    for (const index of path) {
        if (!node || node.type === 'group') return null;
        node = node.children[index] ?? null;
    }
    return node;
}

/**
 * Where the open documents are drawn (spec 036). One document is drawn exactly as the page always
 * drew it: no strip, divider, or wrapper. One group with several tabs gets its strip and keeps the
 * page scroll. Several groups fill the window below the toolbar, placed by the layout tree. When
 * they do not fit (a phone, a narrow window) one document shows at a time with a strip of every
 * open document.
 */
export function PaneArea({
    documentId,
    renderDocument,
}: {
    documentId: string;
    renderDocument: (documentId: string, viewId?: string) => ReactNode;
}) {
    const stored = usePaneStore();
    const entries = useDocumentStore((state) => state.entries);
    const pinDocuments = useDocumentStore((state) => state.pinDocuments);
    const loadIntoCache = useDocumentStore((state) => state.loadIntoCache);
    const [unreadable, setUnreadable] = useState<ReadonlySet<string>>(new Set());
    const { ref: areaRef, node: area, width } = useMeasuredElement<HTMLDivElement>();
    const height = useFillHeight(area);
    const placed = useRef(new Map<string, HTMLElement>());
    const coarse = useMediaQuery('(pointer: coarse)');
    const [menu, setMenu] = useState<{ key: string; anchor: { x: number; y: number } } | null>(
        null
    );
    const [announcement, setAnnouncement] = useState('');
    const dockHint = usePaneStore((state) => state.dockHint);
    useTabKinds();

    const entryIds = useMemo(() => new Set(entries.map(({ id }) => id)), [entries]);
    const layout = useMemo(
        () => reconcileLayout(stored, documentId, entryIds),
        [stored, documentId, entryIds]
    );
    useEffect(() => {
        if (layout !== stored) usePaneStore.setState(layout);
    }, [layout, stored]);
    useEffect(() => {
        if (width !== undefined) setLayoutArea({ width, height });
    }, [width, height]);

    const nameOf = (id: string) => {
        const entry = entries.find((candidate) => candidate.id === id);
        return entry ? documentLabeler.title(entry) : id;
    };
    const titleOf = (key: string | undefined) => {
        if (!key) return '';
        const id = documentIdOf(key);
        return id ? nameOf(id) : (tabKindOf(key)?.title() ?? key);
    };
    const groupNumberOf = (key: string) =>
        groupsInOrder(usePaneStore.getState().root).findIndex((group) => group.tabs.includes(key)) +
        1;
    const float = (key: string, at?: { x: number; y: number }) => {
        if (floatTab(key, at)) setAnnouncement(translate(labels.floated, { name: titleOf(key) }));
        else toast(translate(labels.floatLimit));
    };
    const drag = useTabDrag(float, (key: string, target: DropTarget) => {
        const name = titleOf(key);
        if (target.kind === 'edge') {
            if (splitWith(key, target.groupId, target.side)) {
                setAnnouncement(translate(labels.split, { name }));
            }
            return;
        }
        moveTab(key, target.groupId, target.kind === 'strip' ? target.gap : undefined);
        setAnnouncement(translate(labels.moved, { name, number: String(groupNumberOf(key)) }));
    });

    const groups = groupsInOrder(layout.root);
    const documentIds = openKeys(layout)
        .map(documentIdOf)
        .filter((id): id is string => id !== null);
    const shownIds = [
        ...new Set([
            documentId,
            ...groups.map((group) => documentIdOf(group.shown)),
            ...layout.floating.map(({ key }) => documentIdOf(key)),
        ]),
    ].filter((id): id is string => id !== null);

    const openKey = documentIds.join('\u0000');
    useEffect(() => {
        pinDocuments(openKey ? openKey.split('\u0000') : []);
    }, [openKey, pinDocuments]);
    const shownKey = shownIds.join('\u0000');
    useEffect(() => {
        const ids = shownKey ? shownKey.split('\u0000') : [];
        let cancelled = false;
        void loadIntoCache(ids).then(() => {
            if (cancelled) return;
            const loaded = new Set(useDocumentStore.getState().documents.map(({ id }) => id));
            const missing = ids.filter((id) => !loaded.has(id));
            setUnreadable((previous) =>
                missing.length === previous.size && missing.every((id) => previous.has(id))
                    ? previous
                    : new Set(missing)
            );
        });
        return () => {
            cancelled = true;
        };
    }, [shownKey, loadIntoCache]);

    const floatingLayer = (
        <FloatingTabs renderDocument={renderDocument} titleOf={(key: string) => titleOf(key)} />
    );
    const only = groups.length === 1 && groups[0]!.tabs.length === 1 ? groups[0]!.tabs[0] : null;
    if (only === docKey(documentId)) {
        return (
            <>
                <PaneSourceProvider documentId={documentId}>
                    {renderDocument(documentId)}
                </PaneSourceProvider>
                {floatingLayer}
            </>
        );
    }

    const minimum = minSizeOf(layout.root);
    const sideBySide =
        width !== undefined &&
        width >= SIDE_BY_SIDE_WIDTH &&
        width >= minimum.width &&
        height >= minimum.height;
    const currentKey = docKey(documentId);
    const several = groups.length > 1;

    const body = (key: string, fill: boolean) => {
        const id = documentIdOf(key);
        if (id === null) {
            return (
                <section
                    key={key}
                    aria-labelledby={tabId(key)}
                    data-tool={key}
                    className={clsx('flex min-w-0 flex-col', fill ? 'min-h-0 flex-1' : 'h-[70dvh]')}
                >
                    {tabKindOf(key)?.render({ onClose: () => closeTab(key) })}
                </section>
            );
        }
        return (
            <Pane
                key={key}
                documentId={id}
                fill={fill}
                render={renderDocument}
                unreadable={unreadable.has(id)}
                view={layout.views[id]}
            />
        );
    };
    const viewSelect = (key: string) => {
        const id = documentIdOf(key);
        return id && !unreadable.has(id) ? (
            <PaneViewSelect
                documentId={id}
                view={layout.views[id]}
                onChange={(view) => setPaneView(id, view)}
            />
        ) : null;
    };
    const announcer = (
        <p className="sr-only" aria-live="polite" data-pane-announcer="">
            {announcement}
        </p>
    );

    if (!sideBySide) {
        return (
            <div className="space-y-2 px-4 pb-4 pt-3" data-panes="">
                <PaneTabs
                    label={translate(labels.tabsLabel)}
                    tabs={documentIds.map((id) => ({ key: docKey(id), name: nameOf(id) }))}
                    selected={currentKey}
                    onSelect={focusTab}
                    onClose={closeTab}
                    end={viewSelect(currentKey)}
                />
                <div ref={areaRef}>{body(currentKey, false)}</div>
                {floatingLayer}
            </div>
        );
    }

    /** A split there keeps under seven groups, and every group at its minimum in this area. */
    const canSplit = (groupId: string, side: SplitSide, key: string) => {
        if (groups.length >= MAX_GROUPS) return false;
        const probe = splitGroup(layout.root, groupId, side, key, 'probe');
        if (probe === layout.root) return false;
        const needed = minSizeOf(probe);
        return needed.width <= width! && needed.height <= height;
    };
    const targetIn = (node: GroupNode) => (event: DragEvent<HTMLElement>) => {
        const key = drag.dragged.current;
        if (!key) return null;
        const box = event.currentTarget.getBoundingClientRect();
        const target = bodyTarget(node.id, edgeAt(box, event.clientX, event.clientY), (side) =>
            canSplit(node.id, side, key)
        );
        return target.kind === 'middle' && node.tabs.includes(key) ? null : target;
    };
    const group = (node: GroupNode, number: number, fill: boolean) => (
        <PaneGroup
            node={node}
            number={number}
            fill={fill}
            framed={several}
            focused={node.tabs.includes(layout.recent[0] ?? currentKey)}
            maximizable={several}
            titleOf={titleOf}
            onClose={closeTab}
            onMenu={(key, anchor) => setMenu({ key, anchor })}
            drag={coarse ? null : drag}
            target={[dockHint, drag.target].find((hint) => hint?.groupId === node.id) ?? null}
            bodyTarget={targetIn(node)}
            body={body(node.shown, fill)}
            end={
                <>
                    {viewSelect(node.shown)}
                    {several && (
                        <MaximizeButton
                            groupId={node.id}
                            maximized={layout.maximized === node.id}
                            name={titleOf(node.shown)}
                        />
                    )}
                </>
            }
        />
    );
    const tabMenu = menu && (
        <TabMenu
            tabKey={menu.key}
            anchor={menu.anchor}
            layout={layout}
            canSplit={canSplit}
            titleOf={titleOf}
            onClose={() => setMenu(null)}
            onDone={setAnnouncement}
            onFloat={float}
        />
    );

    if (groups.length === 0) {
        return (
            <div ref={areaRef} data-panes="">
                {floatingLayer}
                {announcer}
            </div>
        );
    }
    if (!several) {
        return (
            <div ref={areaRef} className="px-4 pb-4 pt-3" data-panes="">
                {group(groups[0]!, 1, false)}
                {tabMenu}
                {announcer}
                {floatingLayer}
            </div>
        );
    }

    const maximized = layout.maximized ? findGroup(layout.root, layout.maximized) : undefined;
    const size = { width: width!, height };
    const placement = maximized
        ? { groups: [{ id: maximized.id, rect: { left: 0, top: 0, ...size } }], dividers: [] }
        : rectsOf(layout.root, size);

    const preview = (divider: DividerPlace, before: number) => {
        const sizes = moveDivider(divider.sizes, divider.index, before, divider.mins);
        const next = rectsOf(layout.root, size, { path: divider.path, weights: weightsOf(sizes) });
        for (const { id, rect } of next.groups) {
            Object.assign(placed.current.get(`g:${id}`)?.style ?? {}, pixels(rect));
        }
        for (const other of next.dividers) {
            const element = placed.current.get(`v:${other.path.join('.')}:${other.index}`);
            Object.assign(element?.style ?? {}, pixels(other.rect));
        }
    };
    const commit = (divider: DividerPlace, before: number) =>
        setSplitWeights(
            divider.path,
            weightsOf(moveDivider(divider.sizes, divider.index, before, divider.mins))
        );
    const keep = (key: string) => (element: HTMLElement | null) => {
        if (element) placed.current.set(key, element);
        else placed.current.delete(key);
    };

    return (
        <div className="px-4 pt-3" data-panes="">
            <div ref={areaRef} className="relative" style={{ height }}>
                {placement.groups.map(({ id, rect }) => (
                    <div
                        key={id}
                        ref={keep(`g:${id}`)}
                        data-group={id}
                        className="absolute"
                        style={placeStyle(rect)}
                    >
                        {group(
                            findGroup(layout.root, id)!,
                            groups.findIndex((candidate) => candidate.id === id) + 1,
                            true
                        )}
                    </div>
                ))}
                {placement.dividers.map((divider) => {
                    const parent = childAt(layout.root, divider.path);
                    if (!parent || parent.type === 'group') return null;
                    const { sizes, mins, index } = divider;
                    const key = `v:${divider.path.join('.')}:${index}`;
                    const before = titleOf(shownOf(parent.children[index]!));
                    const after = titleOf(shownOf(parent.children[index + 1]!));
                    const rows = divider.direction === 'column';
                    return (
                        <div
                            key={key}
                            ref={keep(key)}
                            className="absolute grid"
                            style={placeStyle(divider.rect)}
                        >
                            <Splitter
                                bare
                                orientation={rows ? 'horizontal' : 'vertical'}
                                label={
                                    rows
                                        ? translate(labels.resizeRows, {
                                              top: before,
                                              bottom: after,
                                          })
                                        : translate(labels.resize, { left: before, right: after })
                                }
                                min={mins[index]!}
                                max={sizes[index]! + sizes[index + 1]! - mins[index + 1]!}
                                value={sizes[index]!}
                                clamp={(next) => moveDivider(sizes, index, next, mins)[index]!}
                                onPreview={(next) => preview(divider, next)}
                                onChange={(next) => commit(divider, next)}
                                onReset={() =>
                                    setSplitWeights(
                                        divider.path,
                                        sizes.map(() => 1)
                                    )
                                }
                            />
                        </div>
                    );
                })}
            </div>
            {tabMenu}
            {announcer}
            {floatingLayer}
        </div>
    );
}
