import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Splitter } from '@site/src/shared/components/Splitter';
import { useMeasuredElement } from '@site/src/shared/hooks/usePaneSizes';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { useDocumentStore } from '../../../store/documentStore';
import { documentLabeler } from '../../documents/labeler';
import { MIN_GROUP_HEIGHT, moveDivider, SIDE_BY_SIDE_WIDTH, weightsOf } from './layout';
import {
    type DividerPlace,
    findGroup,
    groupOf,
    groupsInOrder,
    type LayoutNode,
    minSizeOf,
    openKeys,
    reconcileLayout,
    type Rect,
    rectsOf,
} from './layoutTree';
import { Pane } from './Pane';
import { PaneSourceProvider } from './PaneSourceProvider';
import {
    closeTab,
    focusTab,
    setPaneView,
    setSplitWeights,
    toggleMaximized,
    usePaneStore,
} from './paneStore';
import { PaneTabs } from './PaneTabs';
import { docKey, documentIdOf } from './tabKeys';

const labels = uiMessages.sheet.documents.panes;

const placeStyle = (rect: Rect) => ({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
});

/**
 * The height from the element's top to the bottom of the window, at the page's top (spec 036,
 * FR-007): the layout fills the window below the toolbar and each group scrolls its own document.
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
 * drew it: no strip, divider, or wrapper. Otherwise the groups of the layout fill the window below
 * the toolbar, placed by the tree; when they do not fit (a phone, a narrow window) one document
 * shows at a time with a strip of every open document.
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

    const entryIds = useMemo(() => new Set(entries.map(({ id }) => id)), [entries]);
    const layout = useMemo(
        () => reconcileLayout(stored, documentId, entryIds),
        [stored, documentId, entryIds]
    );
    useEffect(() => {
        if (layout !== stored) usePaneStore.setState(layout);
    }, [layout, stored]);

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

    if (documentIds.length < 2 && groups.length < 2) {
        return (
            <PaneSourceProvider documentId={documentId}>
                {renderDocument(documentId)}
            </PaneSourceProvider>
        );
    }

    const nameOf = (id: string) => {
        const entry = entries.find((candidate) => candidate.id === id);
        return entry ? documentLabeler.title(entry) : id;
    };
    const titleOf = (key: string | undefined) => {
        const id = key ? documentIdOf(key) : null;
        return id ? nameOf(id) : '';
    };
    const minimum = minSizeOf(layout.root);
    const sideBySide =
        width !== undefined &&
        width >= SIDE_BY_SIDE_WIDTH &&
        width >= minimum.width &&
        height >= minimum.height;
    const groupIdOf = (id: string) => groupOf(layout.root, docKey(id))?.id;
    const tabs = documentIds.map((id) => ({ id, name: nameOf(id) }));

    const pane = (id: string, framed: boolean, fill: boolean) => {
        const groupId = groupIdOf(id);
        return (
            <Pane
                key={id}
                documentId={id}
                name={nameOf(id)}
                focused={id === documentId}
                framed={framed}
                fill={fill}
                maximized={sideBySide && groupId ? layout.maximized === groupId : undefined}
                onFocus={() => focusTab(docKey(id))}
                onToggleMaximized={() => groupId && toggleMaximized(groupId)}
                onClose={() => closeTab(docKey(id))}
                onView={(view) => setPaneView(id, view)}
                view={layout.views[id]}
                render={renderDocument}
                unreadable={unreadable.has(id)}
            />
        );
    };

    const strip = (
        <PaneTabs
            tabs={tabs}
            focusedId={documentId}
            onFocus={(id) => focusTab(docKey(id))}
            onClose={(id) => closeTab(docKey(id))}
            onMaximize={
                sideBySide
                    ? (id) => {
                          const groupId = groupIdOf(id);
                          if (groupId) toggleMaximized(groupId);
                      }
                    : undefined
            }
        />
    );

    if (!sideBySide) {
        return (
            <div className="space-y-2 px-4 pb-4 pt-3" data-panes="">
                {strip}
                <div ref={areaRef}>{pane(documentId, false, false)}</div>
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
        <div className="space-y-2 px-4 pt-3" data-panes="">
            {strip}
            <div ref={areaRef} className="relative" style={{ height }}>
                {placement.groups.map(({ id, rect }) => {
                    const group = findGroup(layout.root, id)!;
                    const shown = documentIdOf(group.shown);
                    return (
                        <div
                            key={id}
                            ref={keep(`g:${id}`)}
                            data-group={id}
                            className="absolute flex flex-col"
                            style={placeStyle(rect)}
                        >
                            {shown && pane(shown, placement.groups.length > 1, true)}
                        </div>
                    );
                })}
                {placement.dividers.map((divider) => {
                    const parent = childAt(layout.root, divider.path);
                    if (!parent || parent.type === 'group' || divider.direction !== 'row') {
                        return null;
                    }
                    const { sizes, mins, index } = divider;
                    const key = `v:${divider.path.join('.')}:${index}`;
                    return (
                        <div
                            key={key}
                            ref={keep(key)}
                            className="absolute grid"
                            style={placeStyle(divider.rect)}
                        >
                            <Splitter
                                bare
                                label={translate(labels.resize, {
                                    left: titleOf(shownOf(parent.children[index]!)),
                                    right: titleOf(shownOf(parent.children[index + 1]!)),
                                })}
                                min={mins[index]!}
                                max={sizes[index]! + sizes[index + 1]! - mins[index + 1]!}
                                value={sizes[index]!}
                                clamp={(before) => moveDivider(sizes, index, before, mins)[index]!}
                                onPreview={(before) => preview(divider, before)}
                                onChange={(before) => commit(divider, before)}
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
        </div>
    );
}

const pixels = (rect: Rect) => ({
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
});
