import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { clsx } from 'clsx';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isContainerNode } from '../../../types/template';
import { type CommandContext } from '../commands/list';
import { createMenuSource } from '../commands/menu';
import { normalizeSelection } from '../model/selection';
import { findNode, findNodePosition } from '../model/tree';
import { type EditorDraft } from '../model/types';
import { labelIn } from '../operations/selection';
import { commitDrag } from '../operations/structure';
import { ElementSettings } from '../panels/ElementSettings';
import { MultiSettings } from '../panels/sharedSettings';
import { selectNode } from '../session/actions';
import { useEditorSession, useEditorState } from '../session/context';
import { EditorContextMenu, EditorMenuContext, type EditorMenuSource } from './EditorContextMenu';
import { EditorPage } from './EditorPage';
import { OutlineTree } from './OutlineTree';
import { PaneDivider } from './PaneDivider';
import { EditorDragContext, useEditorDrag } from './useEditorDrag';
import { type Pane, PANE_LIMITS, usePaneWidths } from './usePaneWidths';

const editor = uiMessages.sheet.templates.editor;

export type EditorArea = 'page' | 'outline' | 'settings';

/** The column count of a node's parent (1 at the page root or for single-column parents). */
function parentColumnsOf(draft: EditorDraft, nodeId: string): number {
    const position = findNodePosition(draft, nodeId);
    if (!position || position.parentId === null) return 1;
    const parent = findNode(draft, position.parentId);
    return parent && isContainerNode(parent) ? (parent.columns ?? 1) : 1;
}

/** Whether an element of the node's container is pinned to a column (spans stop applying). */
function hasPinnedSiblings(draft: EditorDraft, nodeId: string): boolean {
    return (
        findNodePosition(draft, nodeId)?.siblings.some((node) => node.column !== undefined) ?? false
    );
}

/** The settings area: one element, several, or a prompt. */
function SettingsArea({ draft }: { draft: EditorDraft }) {
    const session = useEditorSession();
    const ids = useEditorState((state) => state.history.present.selection.ids);
    // A group selected with its own element counts once (the group carries it).
    const effective = ids.length > 1 ? normalizeSelection(draft, ids) : ids;
    if (effective.length > 1) {
        return (
            <MultiSettings
                nodes={effective.map((id) => findNode(draft, id)!)}
                onOpen={(nodeId) => selectNode(session, nodeId, 'outline')}
            />
        );
    }
    const node = effective[0] ? findNode(draft, effective[0]) : undefined;
    if (!node) {
        return <p className="text-sm text-textSecondary">{translate(editor.selectPrompt)}</p>;
    }
    return (
        <ElementSettings
            key={node.id}
            node={node}
            parentColumns={parentColumnsOf(draft, node.id)}
            pinnedSiblings={hasPinnedSiblings(draft, node.id)}
        />
    );
}

/**
 * The outline, the page, and the settings side by side with resizable dividers (tabs on narrow
 * screens). Owns the drag of elements, whose preview both the outline and the page show.
 */
export function EditorPanes({
    area,
    commands,
    draft,
    onAreaChange,
}: {
    area: EditorArea;
    commands: CommandContext;
    draft: EditorDraft;
    onAreaChange: (area: EditorArea) => void;
}) {
    const session = useEditorSession();
    const plural = usePluralMessage();
    const gridRef = useRef<HTMLDivElement | null>(null);
    const [gridWidth, setGridWidth] = useState<number | undefined>(undefined);
    useEffect(() => {
        const measure = () => setGridWidth(gridRef.current?.clientWidth || undefined);
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);
    const { widths, setWidth, reset, clamp } = usePaneWidths(gridWidth);
    // Only the CSS variable moves while a divider is dragged; the width is stored on release.
    const previewPane = useCallback(
        (pane: Pane, width: number) =>
            gridRef.current?.style.setProperty(`--${pane}`, `${width}px`),
        []
    );
    const dividerProps = (pane: Pane) => ({
        value: widths[pane],
        min: PANE_LIMITS[pane].min,
        max: PANE_LIMITS[pane].max,
        clamp: (width: number) => clamp(pane, width),
        onPreview: (width: number) => previewPane(pane, width),
        onChange: (width: number) => setWidth(pane, width),
        onReset: () => reset(pane),
    });

    const getDraft = useCallback(() => session.draft(), [session]);
    const draggedWith = useCallback(
        (nodeId: string) => {
            const { ids } = session.selection();
            return ids.includes(nodeId) ? normalizeSelection(session.draft(), ids) : [nodeId];
        },
        [session]
    );
    const nameOf = useCallback(
        (nodeIds: readonly string[]) =>
            nodeIds.length === 1
                ? labelIn(session.draft(), nodeIds[0]!)
                : plural(editor.dragCount, nodeIds.length, { count: nodeIds.length }),
        [plural, session]
    );
    const onCommit = useCallback(
        (nodeIds: readonly string[], next: EditorDraft) => session.run(commitDrag(nodeIds, next)),
        [session]
    );
    const { view: dragView, drag } = useEditorDrag({ getDraft, draggedWith, nameOf, onCommit });
    const shownDraft = dragView?.preview ?? draft;
    const draggingRef = useRef(false);
    useEffect(() => {
        draggingRef.current = dragView !== null;
    }, [dragView]);
    const menu = useMemo<EditorMenuSource>(
        () => ({ ...createMenuSource(commands), dragging: () => draggingRef.current }),
        [commands]
    );

    const areas: ReadonlyArray<{ id: EditorArea; label: string }> = [
        { id: 'page', label: translate(editor.areaPage) },
        { id: 'outline', label: translate(editor.areaOutline) },
        { id: 'settings', label: translate(editor.areaSettings) },
    ];
    const paneClasses = (id: EditorArea) =>
        clsx('min-h-0 overflow-y-auto', area === id ? 'block' : 'hidden', 'md:block');
    const paneStyle = {
        '--outline': `${widths.outline}px`,
        '--settings': `${widths.settings}px`,
    } as CSSProperties;

    return (
        <EditorDragContext.Provider value={drag}>
            <EditorMenuContext.Provider value={menu}>
                <div
                    role="tablist"
                    aria-label={translate(editor.areaTabs)}
                    className="flex border-b border-border md:hidden"
                >
                    {areas.map(({ id, label }) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={area === id}
                            onClick={() => onAreaChange(id)}
                            className={clsx(
                                'flex-1 px-3 py-2 text-sm',
                                area === id
                                    ? 'border-b-2 border-primary font-medium text-textPrimary'
                                    : 'text-textSecondary'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div
                    ref={gridRef}
                    style={paneStyle}
                    className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[var(--outline)_6px_minmax(22.5rem,1fr)_6px_var(--settings)]"
                >
                    <section
                        aria-label={translate(editor.areaOutline)}
                        data-editor-scroll="outline"
                        className={clsx(
                            paneClasses('outline'),
                            // Deep rows truncate their names; a drag must not scroll sideways.
                            'overflow-x-hidden p-2'
                        )}
                    >
                        <h3 className="mb-1 hidden px-1 text-[11px] font-semibold uppercase tracking-wider text-textSecondary md:block">
                            {translate(editor.areaOutline)}
                        </h3>
                        <EditorContextMenu surface="outline">
                            <OutlineTree nodes={shownDraft.children} />
                        </EditorContextMenu>
                    </section>
                    <PaneDivider
                        label={translate(editor.resizeOutline)}
                        {...dividerProps('outline')}
                    />
                    <section
                        aria-label={translate(editor.areaPage)}
                        data-editor-scroll="page"
                        className={clsx(paneClasses('page'), 'bg-bgBase')}
                    >
                        <EditorContextMenu surface="page">
                            <EditorPage draft={shownDraft} />
                        </EditorContextMenu>
                    </section>
                    <PaneDivider
                        label={translate(editor.resizeSettings)}
                        invert
                        {...dividerProps('settings')}
                    />
                    <section
                        aria-label={translate(editor.areaSettings)}
                        className={clsx(paneClasses('settings'), 'space-y-4 p-3')}
                    >
                        <h3 className="hidden text-[11px] font-semibold uppercase tracking-wider text-textSecondary md:block">
                            {translate(editor.areaSettings)}
                        </h3>
                        <SettingsArea draft={draft} />
                    </section>
                </div>
            </EditorMenuContext.Provider>
        </EditorDragContext.Provider>
    );
}
