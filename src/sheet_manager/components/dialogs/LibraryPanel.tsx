import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { DocsHelpLink } from '@site/src/shared/components/DocsHelpLink';
import { Splitter } from '@site/src/shared/components/Splitter';
import { SelectionBar } from '@site/src/shared/components/tree/SelectionBar';
import type { SelectExtend } from '@site/src/shared/components/tree/TreeRowShell';
import {
    type PaneLimits,
    useMeasuredElement,
    usePaneSizes,
} from '@site/src/shared/hooks/usePaneSizes';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import clsx from 'clsx';
import { Search } from 'lucide-react';
import type { CSSProperties, DragEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import {
    applyLibraryWrites,
    catalogOwnerFor,
    createCatalog,
    createSetting,
    createType,
    deletePlan,
    type LibraryState,
    readLibraryState,
    renameItem,
    setDefaultWrites,
} from '../../features/sheet/data/libraryActions';
import {
    bulkMoveTargets,
    bulkSubjects,
    planBulkDelete,
    planBulkMove,
} from '../../features/sheet/data/libraryBulk';
import {
    isMovable,
    type MovePlan,
    moveTargets,
    planMove,
} from '../../features/sheet/data/libraryMoves';
import {
    catalogNodeKey,
    settingNodeKey,
    typeNodeKey,
} from '../../features/sheet/data/libraryPages';
import {
    containerKeys,
    filterTree,
    findNode,
    flattenVisible,
    type LibraryFilter,
    type LibraryNode,
    type PageNode,
    type TypeNode,
} from '../../features/sheet/data/libraryTree';
import { useLibraryTree } from '../../features/sheet/data/useLibraryTree';
import { EDITOR_GUIDE } from '../../features/template-editor/components/EditorHelp';
import { generateDraftId } from '../../features/template-editor/model/ids';
import {
    TemplateEditorDialog,
    type TemplateEditorDialogProps,
} from '../../features/template-editor/TemplateEditorDialog';
import { useTemplateStore } from '../../store/templateStore';
import { systemRegistry } from '../../systems';
import type { CustomTemplate } from '../../types/template';
import { TEMPLATE_LIMITS } from '../../types/templateLimits';
import { ConfirmDialog } from './ConfirmDialog';
import { availableActions, type LibraryActionId } from './library/actions';
import { BulkPanel } from './library/BulkPanel';
import { ContextMenu } from './library/ContextMenu';
import { CreateForm, type CreateFormValues } from './library/CreateForm';
import { DetailsPane } from './library/DetailsPane';
import { useExportMode } from './library/ExportPanel';
import { useImportMode } from './library/ImportPreview';
import { LibraryTree, type RowExtras } from './library/LibraryTree';
import { MovePanel } from './library/MovePanel';

const labels = uiMessages.sheet.library;

/** The tree pane of the dialog; the details take the rest, at least `restMin` wide. */
const TREE_LIMITS: Record<'tree', PaneLimits> = { tree: { min: 220, max: 560, initial: 384 } };
const TREE_ROOM = { restMin: 320, dividers: 6 };
const LIBRARY_MIME = 'application/x-ttgamer-library-node';

export type LibraryMode = 'browse' | 'export' | 'import';

type Panel =
    | {
          kind: 'create-setting' | 'create-type' | 'create-page' | 'create-catalog' | 'edit';
          key: string;
      }
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

const modeButton = (active: boolean) =>
    clsx(
        'rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
        active
            ? 'bg-primary-muted text-white'
            : 'text-textSecondary hover:bg-secondary/10 hover:text-textPrimary'
    );

/**
 * The library (specs 013, 036): rules → settings → document types → pages, with details and
 * actions beside the tree, drawn in whatever holds the tool (a group of the layout or a floating
 * window). It no longer blocks the page; its own confirmations and the template editor still do.
 * Narrower than a dialog's width it shows the tree and the details as two tabs.
 */
export function LibraryPanel() {
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
    const [selectedKey, setSelectedKeyOnly] = useState<string>();
    // Rows selected together (Ctrl/Cmd click, Shift click); empty while one row is selected.
    const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
    const [bulkMove, setBulkMove] = useState<{ target?: string }>();
    /** A finger-started selection: a tap toggles a row until it is stopped. */
    const [selecting, setSelecting] = useState(false);
    const anchorKey = useRef<string | undefined>(undefined);
    const setSelectedKey = useCallback((key: string | undefined) => {
        setSelectedKeyOnly(key);
        setSelection(new Set());
        setBulkMove(undefined);
    }, []);
    const [narrowTab, setNarrowTab] = useState<'tree' | 'details'>('tree');
    const [panel, setPanel] = useState<Panel>();
    const [menu, setMenu] = useState<{ key: string; x: number; y: number }>();
    const [editor, setEditor] = useState<EditorRequest>();
    const [confirmation, setConfirmation] = useState<Confirmation>();
    const [flashKey, setFlashKey] = useState<string>();
    const [dragged, setDragged] = useState<string>();
    const [overKey, setOverKey] = useState<string>();
    const treeRegion = useRef<HTMLDivElement>(null);
    const { ref: bodyRef, node: body, width: bodyWidth } = useMeasuredElement<HTMLDivElement>();
    const panes = usePaneSizes('library-panes', TREE_LIMITS, bodyWidth, TREE_ROOM);
    // Only the CSS variable moves while the divider is dragged; the width is stored on release.
    const previewTree = useCallback(
        (width: number) => body?.style.setProperty('--tree', `${width}px`),
        [body]
    );

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
    const reveal = useCallback(
        (key: string, open: readonly string[]) => {
            setExpanded((current) => new Set([...current, ...open]));
            setSelectedKey(key);
        },
        [setSelectedKey]
    );
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
            treeRegion.current?.querySelector<HTMLElement>(`[data-tree-row="${key}"]`)?.focus();
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
        const templateNames = deletion.boundTemplates.map(({ name }) => name).join(', ');
        const description =
            node.level === 'setting'
                ? [
                      plural(labels.delete.settingDescription, deletion.documentCount, {
                          name: node.name,
                      }),
                      deletion.catalogs.length > 0
                          ? plural(labels.delete.settingCatalogs, deletion.catalogs.length)
                          : '',
                  ]
                      .filter(Boolean)
                      .join(' ')
                : node.level === 'type'
                  ? plural(labels.delete.typeDescription, deletion.documentCount, {
                        name: node.name,
                    })
                  : node.level === 'catalog'
                    ? [
                          plural(labels.delete.catalogDescription, deletion.boundTemplates.length, {
                              name: node.name,
                          }),
                          templateNames,
                      ]
                          .filter(Boolean)
                          .join(' ')
                    : translate(labels.delete.pageDescription, { name: node.name });
        const title =
            node.level === 'setting'
                ? labels.delete.settingTitle
                : node.level === 'type'
                  ? labels.delete.typeTitle
                  : node.level === 'catalog'
                    ? labels.delete.catalogTitle
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
            case 'newCatalog':
                setPanel({ kind: 'create-catalog', key: node.key });
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
        } else if (current.kind === 'create-catalog') {
            const owner = catalogOwnerFor(node);
            if (!owner) return;
            const catalog = createCatalog(owner, values.name, state(), values.description);
            if (!catalog) {
                toast.error(
                    translate(labels.catalogTable.limits.catalogs, {
                        limit: TEMPLATE_LIMITS.catalogsPerOwner,
                    })
                );
                return;
            }
            applyLibraryWrites({ saveCatalogs: [catalog] });
            reveal(catalogNodeKey({ kind: 'user', catalogId: catalog.id }), pathKeys(node.key));
            toast.success(translate(labels.toasts.created, { name: catalog.name }));
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
            'create-catalog': labels.create.catalogTitle,
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

    // --- Selecting several rows ---------------------------------------------------------------

    const bulk = mode === 'browse' && selection.size > 1;
    const subjects = useMemo(
        () => (bulk ? bulkSubjects(tree, selection) : []),
        [bulk, tree, selection]
    );
    const selectRow = (key: string, extend: SelectExtend) => {
        if (mode !== 'browse' || extend === 'none') {
            anchorKey.current = key;
            setSelectedKey(key);
            return;
        }
        const current = selection.size > 0 ? selection : new Set(selectedKey ? [selectedKey] : []);
        let next: Set<string>;
        if (extend === 'toggle') {
            next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            anchorKey.current = key;
        } else {
            const keys = flattenVisible(displayedTree, effectiveExpanded).map(
                (row) => row.node.key
            );
            const from = keys.indexOf(anchorKey.current ?? selectedKey ?? key);
            const to = keys.indexOf(key);
            const [start, end] = from < 0 ? [to, to] : [Math.min(from, to), Math.max(from, to)];
            next = new Set(keys.slice(start, end + 1));
        }
        setBulkMove(undefined);
        if (next.size <= 1) {
            setSelectedKeyOnly([...next][0] ?? key);
            setSelection(new Set());
        } else {
            setSelectedKeyOnly(key);
            setSelection(next);
        }
    };
    const startSelecting = (key: string) => {
        setSelecting(true);
        selectRow(key, 'none');
    };
    const stopSelecting = () => {
        setSelecting(false);
        setSelection(new Set());
        setBulkMove(undefined);
    };
    const shownSelection =
        selection.size > 0 ? selection : new Set(selectedKey ? [selectedKey] : []);
    const bulkDelete = bulk ? planBulkDelete(subjects, state()) : undefined;
    const bulkTargets = bulk ? bulkMoveTargets(subjects, tree) : undefined;
    const bulkMovePlan =
        bulk && bulkMove?.target
            ? planBulkMove(subjects, bulkMove.target, tree, state(), systemRegistry)
            : undefined;

    const requestBulkDelete = () => {
        if (!bulkDelete || bulkDelete.blocked.length > 0) return;
        const count = subjects.length;
        setConfirmation({
            title: translate(labels.bulk.deleteTitle),
            description: [
                plural(labels.bulk.deleteDescription, count, {
                    documents: plural(labels.counts.documents, bulkDelete.documentCount),
                }),
                bulkDelete.catalogCount > 0
                    ? plural(labels.delete.settingCatalogs, bulkDelete.catalogCount)
                    : '',
            ]
                .filter(Boolean)
                .join(' '),
            confirmLabel: translate(labels.actions.delete),
            danger: true,
            run: () => {
                applyLibraryWrites(bulkDelete.writes);
                setSelectedKey(undefined);
                setPanel(undefined);
                toast.success(plural(labels.bulk.deleted, count));
            },
        });
    };

    const applyBulkMove = (plan: MovePlan) => {
        applyLibraryWrites(plan.writes);
        const target = plan.target;
        const moved = subjects.length;
        setExpanded((current) => new Set([...current, target.key]));
        setSelectedKey(subjects[0]?.key);
        setFlashKey(subjects[0]?.key);
        toast.success(plural(labels.bulk.moved, moved, { target: target.name }));
    };

    const bulkDetails = bulk ? (
        <BulkPanel
            subjects={subjects}
            blockedCount={bulkDelete?.blocked.length ?? 0}
            canMove={(bulkTargets?.length ?? 0) > 0}
            onDelete={requestBulkDelete}
            onMove={() => setBulkMove({})}
            panel={
                bulkMove && subjects[0] && bulkTargets ? (
                    <MovePanel
                        subject={subjects[0]}
                        title={plural(labels.bulk.moveTitle, subjects.length)}
                        targets={bulkTargets}
                        chosenKey={bulkMove.target}
                        plan={bulkMovePlan}
                        onChoose={(target) => setBulkMove({ target })}
                        onConfirm={() => bulkMovePlan && applyBulkMove(bulkMovePlan)}
                        onCancel={() => setBulkMove(undefined)}
                    />
                ) : undefined
            }
        />
    ) : undefined;

    const details =
        modePanels?.details ??
        bulkDetails ??
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
        <>
            {/* Escape first closes an open side panel; the host closes the library after that. */}
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div
                onKeyDown={(event) => {
                    if (event.key === 'Escape' && panel) {
                        event.preventDefault();
                        setPanel(undefined);
                    }
                }}
                className="@container/library flex min-h-0 flex-1 flex-col"
            >
                <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
                    <DocsHelpLink docsPath={EDITOR_GUIDE.library} label={translate(labels.help)} />
                    <p className="sr-only">{translate(labels.subtitle)}</p>
                    {
                        <div
                            role="group"
                            aria-label={translate(labels.modes.label)}
                            className="ml-2 flex rounded-sm border border-border p-0.5"
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
                                className="w-full rounded-sm border border-border bg-bgBase py-1 pl-8 pr-2 text-sm text-textPrimary focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                            />
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-textSecondary">
                            {translate(labels.filters.label)}
                            <select
                                value={filter}
                                onChange={(event) => setFilter(event.target.value as LibraryFilter)}
                                className="rounded-sm border border-border bg-bgBase px-2 py-1 text-sm text-textPrimary"
                            >
                                <option value="all">{translate(labels.filters.all)}</option>
                                <option value="yours">{translate(labels.filters.yours)}</option>
                                <option value="edited">{translate(labels.filters.edited)}</option>
                            </select>
                        </label>
                    </div>
                )}

                <div
                    role="tablist"
                    aria-label={translate(labels.tabs.label)}
                    className="flex border-b border-border @2xl/library:hidden"
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

                <div
                    ref={bodyRef}
                    style={{ '--tree': `${panes.sizes.tree}px` } as CSSProperties}
                    className="flex min-h-0 flex-1"
                >
                    <div
                        ref={treeRegion}
                        className={clsx(
                            'min-h-0 flex-1 overflow-y-auto p-2 @2xl/library:block @2xl/library:w-[var(--tree)] @2xl/library:flex-none',
                            narrowTab === 'tree' ? 'block' : 'hidden'
                        )}
                    >
                        {mode === 'browse' && selecting && (
                            <div className="sticky top-0 z-10 -mx-2 -mt-2 mb-2 bg-bgSurface">
                                <SelectionBar
                                    text={plural(labels.bulk.title, shownSelection.size)}
                                    cancelLabel={translate(labels.bulk.stop)}
                                    onCancel={stopSelecting}
                                />
                            </div>
                        )}
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
                                    className="rounded-sm border border-border px-2 py-1 text-xs text-textPrimary hover:bg-secondary/10"
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
                                selectedKeys={
                                    bulk ? selection : selecting ? shownSelection : undefined
                                }
                                selecting={mode === 'browse' && selecting}
                                onLongPress={mode === 'browse' ? startSelecting : undefined}
                                onSelect={selectRow}
                                onRowClick={() => setNarrowTab('details')}
                                onToggle={toggle}
                                onOpenPage={openPage}
                                onDelete={
                                    mode === 'browse'
                                        ? (node) => {
                                              if (bulk && selection.has(node.key)) {
                                                  requestBulkDelete();
                                              } else if (node.ownership === 'user') {
                                                  requestDelete(node);
                                              }
                                          }
                                        : undefined
                                }
                                onMenu={(key, anchor) =>
                                    mode === 'browse' && setMenu({ key, ...anchor })
                                }
                                onSpace={modePanels?.onSpace}
                                rowExtras={modePanels?.rowExtras ?? browseExtras}
                                hasMenu={(node) => mode === 'browse' && actionsFor(node).length > 0}
                                scrollRef={treeRegion}
                            />
                        )}
                    </div>
                    <div className="hidden @2xl/library:flex">
                        <Splitter
                            label={translate(labels.resizeTree)}
                            min={TREE_LIMITS.tree.min}
                            max={TREE_LIMITS.tree.max}
                            value={panes.sizes.tree}
                            clamp={(width) => panes.clamp('tree', width)}
                            onPreview={previewTree}
                            onChange={(width) => panes.setSize('tree', width)}
                            onReset={() => panes.reset('tree')}
                        />
                    </div>
                    <div
                        className={clsx(
                            'min-h-0 min-w-0 flex-1 overflow-y-auto @2xl/library:block',
                            narrowTab === 'details' ? 'block' : 'hidden'
                        )}
                    >
                        <button
                            type="button"
                            onClick={() => setNarrowTab('tree')}
                            className="m-3 mb-0 text-xs text-primary underline @2xl/library:hidden"
                        >
                            {translate(labels.tabs.back)}
                        </button>
                        {details}
                    </div>
                </div>
                {menu && menuNode && (
                    <ContextMenu
                        container={null}
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
            </div>

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
        </>
    );
}
