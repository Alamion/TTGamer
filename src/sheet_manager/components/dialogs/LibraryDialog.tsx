import { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import clsx from 'clsx';
import { Search, X } from 'lucide-react';
import type { DragEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import {
    applyLibraryWrites,
    createSetting,
    createType,
    deletePlan,
    type LibraryState,
    readLibraryState,
    renameItem,
    setDefaultWrites,
} from '../../features/sheet/data/libraryActions';
import {
    isMovable,
    type MovePlan,
    moveTargets,
    planMove,
} from '../../features/sheet/data/libraryMoves';
import { settingNodeKey, typeNodeKey } from '../../features/sheet/data/libraryPages';
import {
    buildLibraryTree,
    containerKeys,
    countDocuments,
    filterTree,
    findNode,
    type LibraryFilter,
    type LibraryNode,
    type PageNode,
    type TypeNode,
} from '../../features/sheet/data/libraryTree';
import { useDocumentStore } from '../../store/documentStore';
import { useDocumentTypeStore } from '../../store/documentTypeStore';
import { useTemplateStore } from '../../store/templateStore';
import { systemRegistry } from '../../systems';
import type { CustomTemplate } from '../../types/template';
import { DocsHelpLink } from '../controls/DocsHelpLink';
import { ConfirmDialog } from './ConfirmDialog';
import { availableActions, type LibraryActionId } from './library/actions';
import { ContextMenu } from './library/ContextMenu';
import { CreateForm, type CreateFormValues } from './library/CreateForm';
import { DetailsPane } from './library/DetailsPane';
import { useExportMode } from './library/ExportPanel';
import { useImportMode } from './library/ImportPreview';
import { LibraryTree, type RowExtras } from './library/LibraryTree';
import { MovePanel } from './library/MovePanel';
import { generateDraftId } from './template-editor/draft';
import { EDITOR_GUIDE } from './template-editor/EditorHelp';
import { TemplateEditorDialog, type TemplateEditorDialogProps } from './TemplateEditorDialog';

const labels = uiMessages.sheet.library;
const LIBRARY_MIME = 'application/x-ttgamer-library-node';

export type LibraryMode = 'browse' | 'export' | 'import';

type Panel =
    | { kind: 'create-setting' | 'create-type' | 'create-page' | 'edit'; key: string }
    | { kind: 'move'; key: string; target?: string };

interface EditorRequest {
    base: TemplateEditorDialogProps['base'];
    /** The branch the saved page appears in. */
    reveal: readonly string[];
    lockTarget?: boolean;
    onSaved?: (template: CustomTemplate) => void;
}

interface Confirmation {
    title: string;
    description: string;
    confirmLabel: string;
    danger?: boolean;
    run: () => void;
}

export interface LibraryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function useLibraryTree() {
    const types = useDocumentTypeStore((state) => state.types);
    const settings = useDocumentTypeStore((state) => state.settings);
    const defaultPages = useDocumentTypeStore((state) => state.defaultPages);
    const templates = useTemplateStore((state) => state.templates);
    const defaultOverrides = useTemplateStore((state) => state.defaultOverrides);
    const documents = useDocumentStore((state) => state.documents);
    const counts = useMemo(() => countDocuments(documents), [documents]);
    return useMemo(
        () =>
            buildLibraryTree({
                registry: systemRegistry,
                types,
                settings,
                templates,
                defaultOverrides,
                defaultPages,
                counts,
            }),
        [types, settings, templates, defaultOverrides, defaultPages, counts]
    );
}

const modeButton = (active: boolean) =>
    clsx(
        'rounded px-2.5 py-1 text-xs font-medium transition-colors',
        active
            ? 'bg-primary-muted text-white'
            : 'text-textSecondary hover:bg-secondary/10 hover:text-textPrimary'
    );

/**
 * The library (spec 013): rules → settings → document types → pages, with details and actions
 * beside the tree. Replaces the page-template list (FR-001).
 */
export function LibraryDialog({ open, onOpenChange }: LibraryDialogProps) {
    const plural = usePluralMessage();
    const tree = useLibraryTree();
    const exportMode = useExportMode(tree);
    const [mode, setMode] = useState<LibraryMode>('browse');
    const importMode = useImportMode(() => setMode('browse'));
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<LibraryFilter>('all');
    const [expanded, setExpanded] = useState<Set<string>>(
        () => new Set(tree.map(({ key }) => key))
    );
    const [selectedKey, setSelectedKey] = useState<string>();
    const [narrowTab, setNarrowTab] = useState<'tree' | 'details'>('tree');
    const [panel, setPanel] = useState<Panel>();
    const [menu, setMenu] = useState<{ key: string; x: number; y: number }>();
    const [editor, setEditor] = useState<EditorRequest>();
    const [confirmation, setConfirmation] = useState<Confirmation>();
    const [flashKey, setFlashKey] = useState<string>();
    const [dragged, setDragged] = useState<string>();
    const [overKey, setOverKey] = useState<string>();
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');
    const treeRegion = useRef<HTMLDivElement>(null);
    const [content, setContent] = useState<HTMLDivElement | null>(null);

    const filtering = query.trim() !== '' || filter !== 'all';
    const shown = useMemo(
        () => (filtering ? filterTree(tree, { query, filter }) : tree),
        [tree, filtering, query, filter]
    );
    const effectiveExpanded = useMemo(
        () => (filtering ? new Set(containerKeys(shown)) : expanded),
        [filtering, shown, expanded]
    );
    const found = selectedKey ? findNode(tree, selectedKey) : undefined;

    useEffect(() => {
        if (!flashKey) return undefined;
        const timer = window.setTimeout(() => setFlashKey(undefined), 1200);
        return () => window.clearTimeout(timer);
    }, [flashKey]);

    const state = (): LibraryState => readLibraryState();

    /**
     * Selects a node that may exist only from the next render on (just created or saved), opening
     * the branches that lead to it; the caller names them because the tree does not know it yet.
     */
    const reveal = useCallback((key: string, open: readonly string[]) => {
        setExpanded((current) => new Set([...current, ...open]));
        setSelectedKey(key);
    }, []);
    const pathKeys = (key: string) => [
        ...(findNode(tree, key)?.ancestors.map((ancestor) => ancestor.key) ?? []),
        key,
    ];

    const toggle = useCallback((key: string, openBranch?: boolean) => {
        setExpanded((current) => {
            const next = new Set(current);
            const shouldOpen = openBranch ?? !next.has(key);
            if (shouldOpen) next.add(key);
            else next.delete(key);
            return next;
        });
    }, []);

    const focusRow = (key: string) => {
        window.setTimeout(() => {
            treeRegion.current?.querySelector<HTMLElement>(`[data-library-row="${key}"]`)?.focus();
        }, 0);
    };

    // --- Page flows -------------------------------------------------------------------------

    const typeOf = (page: PageNode) =>
        findNode(tree, page.key)?.ancestors.at(-1) as TypeNode | undefined;

    /** A type's first page becomes its default; a core character's first page, its setting's. */
    const adoptFirstPage = (typeKey: string) => (template: CustomTemplate) => {
        const type = findNode(tree, typeKey)?.node;
        if (type?.level !== 'type' || type.defaultPageKey) return;
        const page = {
            level: 'page',
            ref: { kind: 'user', templateId: template.id },
        } as PageNode;
        applyLibraryWrites(setDefaultWrites(type, page, state(), systemRegistry));
    };

    const openPage = (node: LibraryNode) => {
        if (node.level !== 'page') return;
        setEditor({
            base: { kind: 'edit', template: node.template },
            reveal: findNode(tree, node.key)?.ancestors.map(({ key }) => key) ?? [],
        });
    };

    const startPage = (type: TypeNode, values: CreateFormValues) => {
        const source =
            values.start && values.start !== 'blank'
                ? type.pages.find(({ key }) => key === values.start)?.template
                : undefined;
        const onSaved = adoptFirstPage(type.key);
        if (source) {
            setEditor({
                base: {
                    kind: 'skeleton',
                    documentKind: type.documentKind,
                    template: {
                        ...source,
                        name: values.name,
                        ...(values.description ? { description: values.description } : {}),
                        ...(type.settingId ? { settingId: type.settingId } : {}),
                    },
                },
                lockTarget: true,
                onSaved,
                reveal: pathKeys(type.key),
            });
            return;
        }
        setEditor({
            base: {
                kind: 'empty',
                documentKind: type.documentKind,
                ...(type.systemId ? { systemId: type.systemId } : {}),
                ...(type.settingId ? { settingId: type.settingId } : {}),
                name: values.name,
            },
            lockTarget: true,
            onSaved,
            reveal: pathKeys(type.key),
        });
    };

    // --- Actions ----------------------------------------------------------------------------

    const actionsFor = (node: LibraryNode) =>
        availableActions(node, {
            canMove: isMovable(node) && moveTargets(node.key, tree).length > 0,
            canExport: true,
        });

    const requestDelete = (node: LibraryNode) => {
        const deletion = deletePlan(node, state());
        if (!deletion) return;
        const description =
            node.level === 'setting'
                ? plural(labels.delete.settingDescription, deletion.documentCount, {
                      name: node.name,
                  })
                : node.level === 'type'
                  ? plural(labels.delete.typeDescription, deletion.documentCount, {
                        name: node.name,
                    })
                  : translate(labels.delete.pageDescription, { name: node.name });
        const title =
            node.level === 'setting'
                ? labels.delete.settingTitle
                : node.level === 'type'
                  ? labels.delete.typeTitle
                  : labels.delete.pageTitle;
        setConfirmation({
            title: translate(title),
            description,
            confirmLabel: translate(labels.actions.delete),
            danger: true,
            run: () => {
                applyLibraryWrites(deletion.writes);
                const parent = findNode(tree, node.key)?.ancestors.at(-1);
                setSelectedKey(parent?.key);
                setPanel(undefined);
                toast.success(translate(labels.toasts.deleted, { name: node.name }));
                if (parent) focusRow(parent.key);
            },
        });
    };

    const runAction = (id: LibraryActionId, node: LibraryNode) => {
        switch (id) {
            case 'newSetting':
                setPanel({ kind: 'create-setting', key: node.key });
                break;
            case 'newType':
                setPanel({ kind: 'create-type', key: node.key });
                break;
            case 'newPage':
                setPanel({ kind: 'create-page', key: node.key });
                break;
            case 'edit':
                setPanel({ kind: 'edit', key: node.key });
                break;
            case 'move':
                setPanel({ kind: 'move', key: node.key });
                break;
            case 'open':
                openPage(node);
                break;
            case 'duplicate':
                if (node.level === 'page') {
                    const copy = useTemplateStore
                        .getState()
                        .duplicateTemplate(node.template.id, generateDraftId('tpl'), node.template);
                    if (copy) {
                        toast.success(translate(labels.toasts.duplicated, { name: node.name }));
                        reveal(
                            `p:user:${copy.id}`,
                            findNode(tree, node.key)?.ancestors.map(({ key }) => key) ?? []
                        );
                    }
                }
                break;
            case 'makeDefault': {
                if (node.level !== 'page') break;
                const type = typeOf(node);
                if (!type) break;
                applyLibraryWrites(setDefaultWrites(type, node, state(), systemRegistry));
                toast.success(translate(labels.toasts.defaultSet, { name: node.name }));
                break;
            }
            case 'reset':
                if (node.level === 'page' && node.ref.kind === 'shipped') {
                    const { systemId, viewId } = node.ref;
                    setConfirmation({
                        title: translate(labels.reset.title),
                        description: translate(labels.reset.body, { name: node.name }),
                        confirmLabel: translate(labels.actions.reset),
                        run: () => {
                            useTemplateStore.getState().clearDefaultOverride(systemId, viewId);
                            toast.success(translate(labels.toasts.reset, { name: node.name }));
                        },
                    });
                }
                break;
            case 'export':
                exportMode.start(node.key);
                setMode('export');
                setPanel(undefined);
                break;
            case 'delete':
                requestDelete(node);
                break;
        }
    };

    // --- Forms --------------------------------------------------------------------------------

    const submitForm = (current: Panel, values: CreateFormValues) => {
        const node = findNode(tree, current.key)?.node;
        if (!node) return;
        if (current.kind === 'create-setting' && node.level === 'ruleset') {
            const setting = createSetting(node.systemId, values.name, values.description);
            applyLibraryWrites({ saveSettings: [setting] });
            const key = settingNodeKey({ kind: 'user', settingId: setting.id });
            reveal(key, [node.key, key]);
            toast.success(translate(labels.toasts.created, { name: setting.name }));
        } else if (current.kind === 'create-type' && node.level === 'setting') {
            const type = createType(node.ref, values.name, values.description);
            if (!type) return;
            applyLibraryWrites({ saveTypes: [type] });
            reveal(typeNodeKey({ kind: 'user', typeId: type.id }), pathKeys(node.key));
            toast.success(translate(labels.toasts.created, { name: type.name }));
        } else if (current.kind === 'create-page' && node.level === 'type') {
            startPage(node, values);
        } else if (current.kind === 'edit') {
            applyLibraryWrites(renameItem(node, values.name, values.description, state()));
            toast.success(translate(labels.toasts.saved, { name: values.name }));
        }
        setPanel(undefined);
    };

    // --- Moving -------------------------------------------------------------------------------

    const movePlan: MovePlan | undefined =
        panel?.kind === 'move' && panel.target
            ? planMove(panel.key, panel.target, tree, state(), systemRegistry)
            : undefined;

    const applyMove = (plan: MovePlan) => {
        applyLibraryWrites(plan.writes);
        setPanel(undefined);
        const target = plan.target;
        setExpanded((current) => new Set([...current, target.key]));
        setSelectedKey(plan.subject.key);
        setFlashKey(plan.subject.key);
        toast.success(
            translate(labels.toasts.moved, { name: plan.subject.name, target: target.name })
        );
    };

    const dragExtras = (node: LibraryNode): RowExtras['drag'] => ({
        draggable: isMovable(node),
        over: overKey === node.key,
        onDragStart: (event: DragEvent<HTMLDivElement>) => {
            event.dataTransfer.setData(LIBRARY_MIME, node.key);
            event.dataTransfer.effectAllowed = 'move';
            setDragged(node.key);
        },
        onDragOver: (event: DragEvent<HTMLDivElement>) => {
            const subject = dragged ?? event.dataTransfer.getData(LIBRARY_MIME);
            if (!subject || !moveTargets(subject, tree).some((t) => t.node.key === node.key)) {
                return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            if (overKey !== node.key) setOverKey(node.key);
        },
        onDragLeave: () => setOverKey((key) => (key === node.key ? undefined : key)),
        onDrop: (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            const subject = dragged ?? event.dataTransfer.getData(LIBRARY_MIME);
            setDragged(undefined);
            setOverKey(undefined);
            if (!subject) return;
            const plan = planMove(subject, node.key, tree, state(), systemRegistry);
            if (!plan) return;
            if (plan.crossesSystem) {
                setSelectedKey(subject);
                setPanel({ kind: 'move', key: subject, target: node.key });
                setNarrowTab('details');
                return;
            }
            applyMove(plan);
        },
    });

    // --- Rendering ------------------------------------------------------------------------------

    const modePanels =
        mode === 'export'
            ? {
                  rowExtras: exportMode.rowExtras,
                  onSpace: exportMode.onSpace,
                  details: exportMode.details,
              }
            : mode === 'import'
              ? { details: importMode.details }
              : undefined;

    const browseExtras = (node: LibraryNode): RowExtras => ({
        drag: dragExtras(node),
        flash: flashKey === node.key,
    });

    const panelFor = (node: LibraryNode): ReactNode => {
        if (!panel || panel.key !== node.key) return undefined;
        if (panel.kind === 'move') {
            return (
                <MovePanel
                    subject={node}
                    targets={moveTargets(node.key, tree)}
                    chosenKey={panel.target}
                    plan={movePlan}
                    onChoose={(target) => setPanel({ kind: 'move', key: node.key, target })}
                    onConfirm={() => movePlan && applyMove(movePlan)}
                    onCancel={() => setPanel(undefined)}
                />
            );
        }
        const titles = {
            'create-setting': labels.create.settingTitle,
            'create-type': labels.create.typeTitle,
            'create-page': labels.create.pageTitle,
            edit: labels.actions.edit,
        } as const;
        const startOptions =
            panel.kind === 'create-page' && node.level === 'type'
                ? [
                      { value: 'blank', label: translate(labels.create.blank) },
                      ...node.pages.map((page) => ({
                          value: page.key,
                          label: translate(labels.create.copyOf, { name: page.name }),
                      })),
                  ]
                : undefined;
        return (
            <CreateForm
                key={`${panel.kind}:${node.key}`}
                title={translate(titles[panel.kind], { parent: node.name })}
                submitLabel={translate(
                    panel.kind === 'edit' ? labels.actions.save : labels.create.submit
                )}
                initial={
                    panel.kind === 'edit'
                        ? { name: node.name, description: node.description }
                        : undefined
                }
                startOptions={startOptions}
                note={
                    panel.kind === 'create-setting' || panel.kind === 'create-type'
                        ? translate(labels.create.noPageNote)
                        : undefined
                }
                onSubmit={(values) => submitForm(panel, values)}
                onCancel={() => setPanel(undefined)}
            />
        );
    };

    const displayedTree = shown;
    const menuNode = menu ? findNode(tree, menu.key)?.node : undefined;

    const details =
        modePanels?.details ??
        (found ? (
            <DetailsPane
                found={found}
                actions={actionsFor(found.node)}
                onAction={(id) => runAction(id, found.node)}
                panel={panelFor(found.node)}
            />
        ) : (
            <DetailsPane found={undefined} actions={[]} onAction={() => undefined} />
        ));

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/50" />
                <Dialog.Content
                    ref={setContent}
                    onEscapeKeyDown={(event) => {
                        if (panel) {
                            event.preventDefault();
                            setPanel(undefined);
                        }
                    }}
                    className="fixed left-1/2 top-1/2 z-[9999] flex h-[min(46rem,calc(100%-2rem))] w-[min(64rem,calc(100%-1rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-bgSurface shadow-xl focus:outline-none"
                >
                    <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
                        <Dialog.Title className="text-lg font-semibold text-textPrimary">
                            {translate(labels.title)}
                        </Dialog.Title>
                        <DocsHelpLink
                            docsPath={EDITOR_GUIDE.library}
                            label={translate(labels.help)}
                        />
                        <Dialog.Description className="sr-only">
                            {translate(labels.subtitle)}
                        </Dialog.Description>
                        {
                            <div
                                role="group"
                                aria-label={translate(labels.modes.label)}
                                className="ml-2 flex rounded border border-border p-0.5"
                            >
                                {(['browse', 'export', 'import'] as const).map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        aria-pressed={mode === value}
                                        onClick={() => {
                                            if (value === 'export') exportMode.start();
                                            setMode(value);
                                            setPanel(undefined);
                                        }}
                                        className={modeButton(mode === value)}
                                    >
                                        {translate(labels.modes[value])}
                                    </button>
                                ))}
                            </div>
                        }
                        <div className="ml-auto flex items-center gap-2">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    aria-label={translate(labels.close)}
                                    className="rounded p-1 text-textSecondary hover:bg-bgBase hover:text-textPrimary"
                                >
                                    <X className="h-5 w-5" aria-hidden="true" />
                                </button>
                            </Dialog.Close>
                        </div>
                    </div>

                    {mode !== 'import' && (
                        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                            <label className="relative flex min-w-0 flex-1 items-center">
                                <span className="sr-only">{translate(labels.search.label)}</span>
                                <Search
                                    className="pointer-events-none absolute left-2 h-4 w-4 text-textSecondary"
                                    aria-hidden="true"
                                />
                                <input
                                    type="search"
                                    value={query}
                                    placeholder={translate(labels.search.placeholder)}
                                    onChange={(event) => setQuery(event.target.value)}
                                    className="w-full rounded border border-border bg-bgBase py-1 pl-8 pr-2 text-sm text-textPrimary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-textSecondary">
                                {translate(labels.filters.label)}
                                <select
                                    value={filter}
                                    onChange={(event) =>
                                        setFilter(event.target.value as LibraryFilter)
                                    }
                                    className="rounded border border-border bg-bgBase px-2 py-1 text-sm text-textPrimary"
                                >
                                    <option value="all">{translate(labels.filters.all)}</option>
                                    <option value="yours">{translate(labels.filters.yours)}</option>
                                    <option value="edited">
                                        {translate(labels.filters.edited)}
                                    </option>
                                </select>
                            </label>
                        </div>
                    )}

                    <div
                        role="tablist"
                        aria-label={translate(labels.tabs.label)}
                        className="flex border-b border-border md:hidden"
                    >
                        {(['tree', 'details'] as const).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                role="tab"
                                aria-selected={narrowTab === tab}
                                onClick={() => setNarrowTab(tab)}
                                className={clsx(
                                    'flex-1 border-b-2 px-3 py-2 text-sm',
                                    narrowTab === tab
                                        ? 'border-primary text-textPrimary'
                                        : 'border-transparent text-textSecondary'
                                )}
                            >
                                {translate(labels.tabs[tab])}
                            </button>
                        ))}
                    </div>

                    <div className="flex min-h-0 flex-1">
                        <div
                            ref={treeRegion}
                            className={clsx(
                                'min-h-0 flex-1 overflow-y-auto p-2 md:block md:max-w-[26rem] md:border-r md:border-border',
                                narrowTab === 'tree' ? 'block' : 'hidden'
                            )}
                        >
                            {mode === 'import' ? (
                                importMode.tree
                            ) : displayedTree.length === 0 ? (
                                <div className="space-y-2 p-4 text-sm text-textSecondary">
                                    <p>
                                        {query.trim()
                                            ? translate(labels.search.empty, { query })
                                            : translate(labels.search.emptyFilter)}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setQuery('');
                                            setFilter('all');
                                        }}
                                        className="rounded border border-border px-2 py-1 text-xs text-textPrimary hover:bg-secondary/10"
                                    >
                                        {translate(labels.search.clear)}
                                    </button>
                                </div>
                            ) : (
                                <LibraryTree
                                    label={translate(labels.treeLabel)}
                                    tree={displayedTree}
                                    expanded={effectiveExpanded}
                                    selectedKey={selectedKey}
                                    onSelect={setSelectedKey}
                                    onRowClick={() => setNarrowTab('details')}
                                    onToggle={toggle}
                                    onOpenPage={openPage}
                                    onDelete={
                                        mode === 'browse'
                                            ? (node) => {
                                                  if (node.ownership === 'user')
                                                      requestDelete(node);
                                              }
                                            : undefined
                                    }
                                    onMenu={(key, anchor) =>
                                        mode === 'browse' && setMenu({ key, ...anchor })
                                    }
                                    onSpace={modePanels?.onSpace}
                                    rowExtras={modePanels?.rowExtras ?? browseExtras}
                                />
                            )}
                        </div>
                        <div
                            className={clsx(
                                'min-h-0 flex-1 overflow-y-auto md:block',
                                narrowTab === 'details' ? 'block' : 'hidden'
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => setNarrowTab('tree')}
                                className="m-3 mb-0 text-xs text-primary underline md:hidden"
                            >
                                {translate(labels.tabs.back)}
                            </button>
                            {details}
                        </div>
                    </div>
                    {menu && menuNode && (
                        <ContextMenu
                            container={content}
                            label={translate(labels.row.actions, { name: menuNode.name })}
                            anchor={menu}
                            actions={actionsFor(menuNode)}
                            onAction={(id) => {
                                setNarrowTab('details');
                                runAction(id, menuNode);
                            }}
                            onClose={() => {
                                setMenu(undefined);
                                focusRow(menuNode.key);
                            }}
                        />
                    )}
                </Dialog.Content>
            </Dialog.Portal>

            {editor && (
                <TemplateEditorDialog
                    base={editor.base}
                    lockTarget={editor.lockTarget}
                    onSaved={(template) => {
                        editor.onSaved?.(template);
                        reveal(`p:user:${template.id}`, editor.reveal);
                    }}
                    onClose={() => setEditor(undefined)}
                />
            )}

            <ConfirmDialog
                open={confirmation !== undefined}
                onOpenChange={(isOpen) => {
                    if (!isOpen) setConfirmation(undefined);
                }}
                onConfirm={() => {
                    confirmation?.run();
                    setConfirmation(undefined);
                }}
                title={confirmation?.title ?? ''}
                description={confirmation?.description ?? ''}
                confirmLabel={confirmation?.confirmLabel}
                cancelLabel={translate(labels.actions.cancel)}
                variant={confirmation?.danger ? 'danger' : 'default'}
            />
        </Dialog.Root>
    );
}
