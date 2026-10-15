import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Splitter } from '@site/src/shared/components/Splitter';
import { useMeasuredElement } from '@site/src/shared/hooks/usePaneSizes';
import { clsx } from 'clsx';
import { Maximize2, Minimize2 } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { useDocumentStore } from '../../../store/documentStore';
import { documentLabeler } from '../../documents/labeler';
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
import { PaneViewSelect } from './PaneViewSelect';
import { docKey, documentIdOf, tabKindOf } from './tabKeys';

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
        if (!key) return '';
        const id = documentIdOf(key);
        return id ? nameOf(id) : (tabKindOf(key)?.title() ?? key);
    };
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
        if (id === null) return tabKindOf(key)?.render() ?? null;
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

    if (!sideBySide) {
        const shownKey = docKey(documentId);
        return (
            <div className="space-y-2 px-4 pb-4 pt-3" data-panes="">
                <PaneTabs
                    label={translate(labels.tabsLabel)}
                    tabs={documentIds.map((id) => ({ key: docKey(id), name: nameOf(id) }))}
                    selected={shownKey}
                    onSelect={focusTab}
                    onClose={closeTab}
                    end={viewSelect(shownKey)}
                />
                <div ref={areaRef}>{body(shownKey, false)}</div>
            </div>
        );
    }

    const group = (node: GroupNode, number: number, fill: boolean) => {
        const focused = node.tabs.includes(layout.recent[0] ?? currentKey);
        const maximized = layout.maximized === node.id;
        const name = titleOf(node.shown);
        return (
            <div
                className={clsx(
                    'flex min-h-0 min-w-0 flex-col',
                    fill && 'h-full',
                    several &&
                        clsx(
                            'rounded-lg border-2',
                            focused ? 'border-primary' : 'border-borderMoreContrast'
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
                <PaneTabs
                    label={translate(labels.groupLabel, { number })}
                    tabs={node.tabs.map((key) => ({ key, name: titleOf(key) }))}
                    selected={node.shown}
                    onSelect={focusTab}
                    onClose={closeTab}
                    onMaximize={several ? () => toggleMaximized(node.id) : undefined}
                    end={
                        <>
                            {viewSelect(node.shown)}
                            {several && (
                                <button
                                    type="button"
                                    aria-label={
                                        maximized
                                            ? translate(labels.restore)
                                            : translate(labels.maximize, { name })
                                    }
                                    aria-pressed={maximized}
                                    onClick={() => toggleMaximized(node.id)}
                                    className="rounded-sm p-1 text-textSecondary hover:text-textPrimary pointer-coarse:min-h-8 pointer-coarse:min-w-8"
                                >
                                    {maximized ? (
                                        <Minimize2 className="h-4 w-4" aria-hidden="true" />
                                    ) : (
                                        <Maximize2 className="h-4 w-4" aria-hidden="true" />
                                    )}
                                </button>
                            )}
                        </>
                    }
                />
                {body(node.shown, fill)}
            </div>
        );
    };

    if (!several) {
        return (
            <div ref={areaRef} className="px-4 pb-4 pt-3" data-panes="">
                {group(groups[0]!, 1, false)}
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
