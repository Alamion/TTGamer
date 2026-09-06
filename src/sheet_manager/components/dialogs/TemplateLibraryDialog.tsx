import { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Copy, Download, LayoutTemplate, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { getSkeletonsForKind } from '../../features/sheet/data/templateSkeletons';
import {
    buildTemplateFilename,
    serializeTemplateFile,
} from '../../features/sheet/shell/templateFile';
import { useTemplateStore } from '../../store/templateStore';
import { systemRegistry } from '../../systems';
import type { CustomTemplate } from '../../types/template';
import { ConfirmDialog } from './ConfirmDialog';
import { generateDraftId } from './template-editor/draft';
import { TemplateEditorDialog } from './TemplateEditorDialog';
import { TemplateImportDialog } from './TemplateImportDialog';

const library = uiMessages.sheet.templates.library;

const DOCUMENT_KINDS = ['character', 'creature', 'vehicle', 'group'] as const;

const iconButton =
    'rounded p-1.5 text-textSecondary transition-colors hover:bg-bgBase hover:text-textPrimary disabled:opacity-40';
const actionButton =
    'rounded border border-border bg-bgSurface px-2 py-1 text-xs font-medium text-textPrimary hover:bg-bgBase';

interface EditorBase {
    kind: 'empty' | 'skeleton' | 'duplicate' | 'edit';
    template?: CustomTemplate;
}

interface LibraryEntry {
    template: CustomTemplate;
    isDefault: boolean;
    modified: boolean;
}

/** True when the id is a registered view id of any system (default template identity, FR-11). */
export function isDefaultTemplateId(id: string): boolean {
    return systemRegistry
        .getSystems()
        .some((system) =>
            system.documents.some((definition) => definition.views.some((view) => view.id === id))
        );
}

export function TemplateLibraryDialog({
    onOpenChange,
    open,
}: {
    onOpenChange: (open: boolean) => void;
    open: boolean;
}) {
    const { duplicateTemplate, removeTemplate, templates, defaultOverrides, clearDefaultOverride } =
        useTemplateStore();
    const t = (descriptor: { message: string }) => translate(descriptor);
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');

    const [editorBase, setEditorBase] = useState<EditorBase | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<CustomTemplate | null>(null);
    const [resetTarget, setResetTarget] = useState<LibraryEntry | null>(null);
    const [importOpen, setImportOpen] = useState(false);
    const [newKind, setNewKind] = useState<string>('character');

    // Unified listing (FR-11/12): custom templates + modified defaults (unmodified defaults
    // derive on demand and are surfaced through the page selector; the library shows them too).
    const grouped = useMemo(() => {
        const map = new Map<string, LibraryEntry[]>();
        const push = (template: CustomTemplate, isDefault: boolean, modified: boolean) => {
            const list = map.get(template.documentKind) ?? [];
            list.push({ template, isDefault, modified });
            map.set(template.documentKind, list);
        };
        for (const template of templates) {
            push(template, isDefaultTemplateId(template.id), false);
        }
        for (const [viewId, override] of Object.entries(defaultOverrides)) {
            if (templates.some(({ id }) => id === viewId)) continue;
            push(override, true, true);
        }
        return map;
    }, [templates, defaultOverrides]);

    const closeEditor = () => setEditorBase(null);

    const exportTemplate = (template: CustomTemplate) => {
        const transfer = uiMessages.sheet.templates.transfer;
        const url = URL.createObjectURL(
            new Blob([serializeTemplateFile(template)], { type: 'application/json' })
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = buildTemplateFilename(template.id);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success(translate(transfer.exportSuccess, { title: template.name }));
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-[9999] flex max-h-[85vh] w-[min(44rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-bgSurface shadow-xl focus:outline-none">
                    <div className="flex items-center justify-between border-b border-border p-4">
                        <Dialog.Title className="text-lg font-semibold text-textPrimary">
                            {t(library.title)}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                aria-label={t(library.title)}
                                className="text-textSecondary hover:text-textPrimary"
                            >
                                ✕
                            </button>
                        </Dialog.Close>
                    </div>
                    <Dialog.Description className="sr-only">{t(library.empty)}</Dialog.Description>

                    <div className="flex-1 overflow-y-auto p-4">
                        {grouped.size === 0 && (
                            <p className="py-6 text-center text-sm text-textSecondary">
                                {t(library.empty)}
                            </p>
                        )}

                        <div className="space-y-4">
                            {[...grouped.entries()].map(([kind, entries]) => (
                                <section key={kind} aria-label={kind}>
                                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-textSecondary">
                                        {t(library.kind)}: {kind}
                                    </h3>
                                    <ul className="space-y-2">
                                        {entries.map(({ template, isDefault, modified }) => (
                                            <li
                                                key={template.id}
                                                className="flex items-center gap-3 rounded-lg border border-border bg-bgBase p-3"
                                            >
                                                <LayoutTemplate
                                                    className="h-4 w-4 shrink-0 text-textSecondary"
                                                    aria-hidden="true"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-textPrimary">
                                                        {template.name}
                                                        {isDefault && (
                                                            <span className="ml-2 rounded bg-bgSurface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-textSecondary">
                                                                {t(library.defaultBadge)}
                                                            </span>
                                                        )}
                                                        {modified && (
                                                            <span className="ml-1 rounded bg-bgSurface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                                                {t(library.modifiedBadge)}
                                                            </span>
                                                        )}
                                                    </p>
                                                    {template.description && (
                                                        <p className="truncate text-xs text-textSecondary">
                                                            {template.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setEditorBase({
                                                                kind: 'edit',
                                                                template,
                                                            })
                                                        }
                                                        aria-label={`${t(library.edit)}: ${template.name}`}
                                                        className={iconButton}
                                                    >
                                                        <Pencil
                                                            className="h-4 w-4"
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            duplicateTemplate(
                                                                template.id,
                                                                generateDraftId('tpl')
                                                            )
                                                        }
                                                        aria-label={`${t(library.duplicate)}: ${template.name}`}
                                                        className={iconButton}
                                                    >
                                                        <Copy
                                                            className="h-4 w-4"
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => exportTemplate(template)}
                                                        aria-label={`${t(library.export)}: ${template.name}`}
                                                        className={iconButton}
                                                    >
                                                        <Download
                                                            className="h-4 w-4"
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                    {isDefault && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setResetTarget({
                                                                    template,
                                                                    isDefault,
                                                                    modified,
                                                                })
                                                            }
                                                            disabled={!modified}
                                                            aria-label={`${t(library.reset)}: ${template.name}`}
                                                            className={iconButton}
                                                        >
                                                            <RotateCcw
                                                                className="h-4 w-4"
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                    )}
                                                    {!isDefault && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDeleteTarget(template)
                                                            }
                                                            aria-label={`${t(library.delete)}: ${template.name}`}
                                                            className={iconButton}
                                                        >
                                                            <Trash2
                                                                className="h-4 w-4"
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>

                        <div className="mt-4">
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-textSecondary">
                                {t(library.new)}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={newKind}
                                    onChange={(event) => setNewKind(event.target.value)}
                                    aria-label={t(library.kind)}
                                    className="rounded border border-border bg-bgSurface px-2 py-1 text-xs text-textPrimary"
                                >
                                    {DOCUMENT_KINDS.map((kind) => (
                                        <option key={kind} value={kind}>
                                            {kind}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setEditorBase({ kind: 'empty' })}
                                    className={actionButton}
                                >
                                    <Plus className="mr-1 inline h-3 w-3" aria-hidden="true" />
                                    {newKind}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImportOpen(true)}
                                    className={actionButton}
                                >
                                    {t(uiMessages.sheet.templates.transfer.import)}
                                </button>
                                {getSkeletonsForKind(newKind as never).map((skeleton) => (
                                    <button
                                        key={skeleton.id}
                                        type="button"
                                        onClick={() =>
                                            setEditorBase({ kind: 'skeleton', template: skeleton })
                                        }
                                        className={actionButton}
                                    >
                                        <LayoutTemplate
                                            className="mr-1 inline h-3 w-3"
                                            aria-hidden="true"
                                        />
                                        {skeleton.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>

            {editorBase?.kind === 'empty' && (
                <TemplateEditorDialog base={{ kind: 'empty' }} onClose={closeEditor} />
            )}
            {editorBase?.kind === 'skeleton' && editorBase.template && (
                <TemplateEditorDialog
                    base={{
                        kind: 'skeleton',
                        documentKind: editorBase.template.documentKind,
                        template: editorBase.template,
                    }}
                    onClose={closeEditor}
                />
            )}
            {editorBase?.kind === 'edit' && editorBase.template && (
                <TemplateEditorDialog
                    base={{ kind: 'edit', template: editorBase.template }}
                    onClose={closeEditor}
                />
            )}
            {editorBase?.kind === 'duplicate' && editorBase.template && (
                <TemplateEditorDialog
                    base={{ kind: 'duplicate', template: editorBase.template }}
                    onClose={closeEditor}
                />
            )}

            <TemplateImportDialog open={importOpen} onClose={() => setImportOpen(false)} />

            {/* FR-10: reset restores the pristine original after explicit confirmation. */}
            <ConfirmDialog
                open={resetTarget !== null}
                onOpenChange={(isOpen) => {
                    if (!isOpen) setResetTarget(null);
                }}
                onConfirm={() => {
                    if (resetTarget) {
                        clearDefaultOverride(resetTarget.template.id);
                        toast.success(translate(library.resetConfirmTitle));
                    }
                    setResetTarget(null);
                }}
                title={t(library.resetConfirmTitle)}
                description={
                    resetTarget
                        ? translate(library.resetConfirmDescription, {
                              name: resetTarget.template.name,
                          })
                        : ''
                }
                confirmLabel={t(library.reset)}
                cancelLabel={t(library.title)}
            />

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(isOpen) => {
                    if (!isOpen) setDeleteTarget(null);
                }}
                onConfirm={() => {
                    if (deleteTarget) removeTemplate(deleteTarget.id);
                    setDeleteTarget(null);
                }}
                title={t(library.delete)}
                description={deleteTarget ? deleteTarget.name : ''}
                confirmLabel={t(library.delete)}
                cancelLabel={t(library.title)}
                variant="danger"
            />
        </Dialog.Root>
    );
}

export function TemplateManagerButton({ onClick }: { onClick: () => void }) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            title={t(library.buttonTitle)}
            aria-label={t(library.buttonTitle)}
        >
            <LayoutTemplate className="h-3.5 w-3.5" aria-hidden="true" />
            {t(library.button)}
        </button>
    );
}
