import { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { Copy, Download, LayoutTemplate, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import {
    listShippedSettings,
    listTemplateTargetGroups,
    parseTemplateTargetValue,
    targetLabel,
} from '../../features/sheet/data/documentLabels';
import { getSkeletonsForKind } from '../../features/sheet/data/templateSkeletons';
import {
    buildTemplateFilename,
    serializeTemplateFile,
} from '../../features/sheet/shell/templateFile';
import {
    buildTypeFilename,
    buildTypePayload,
    serializeTypeFile,
} from '../../features/sheet/shell/typeFile';
import { useDocumentStore } from '../../store/documentStore';
import { useDocumentTypeStore } from '../../store/documentTypeStore';
import { useTemplateStore } from '../../store/templateStore';
import { isUserKind, newUserTypeId, type UserTypeOwner } from '../../systems/userTypes';
import { isDefaultTemplateId } from '../../systems/view';
import { SystemIdSchema } from '../../types/document';
import type { CustomTemplate } from '../../types/template';
import { ConfirmDialog } from './ConfirmDialog';
import { generateDraftId } from './template-editor/draft';
import { TemplateEditorDialog } from './TemplateEditorDialog';
import { TemplateImportDialog } from './TemplateImportDialog';
import { UserSettingsPanel } from './UserSettingsPanel';

const library = uiMessages.sheet.templates.library;

const iconButton =
    'rounded p-1.5 text-textSecondary transition-colors hover:bg-bgBase hover:text-textPrimary disabled:opacity-40';
const actionButton =
    'rounded border border-border bg-bgSurface px-2 py-1 text-xs font-medium text-textPrimary hover:bg-bgBase';

interface EditorBase {
    kind: 'empty' | 'skeleton' | 'duplicate' | 'edit' | 'new-type';
    template?: CustomTemplate;
    /** Called after a save (a user setting records its page). */
    onSaved?: (template: CustomTemplate) => void;
    /** 'new-type': the type being created with its first page. */
    newType?: { id: string; name: string; systemId: string; owner: UserTypeOwner };
}

interface LibraryEntry {
    template: CustomTemplate;
    isDefault: boolean;
    modified: boolean;
}

export function TemplateLibraryDialog({
    onOpenChange,
    open,
}: {
    onOpenChange: (open: boolean) => void;
    open: boolean;
}) {
    const {
        duplicateTemplate,
        removeTemplate,
        templates,
        defaultOverrides,
        clearDefaultOverride,
        quarantine,
    } = useTemplateStore();
    const userTypes = useDocumentTypeStore((state) => state.types);
    const saveType = useDocumentTypeStore((state) => state.saveType);
    const removeType = useDocumentTypeStore((state) => state.removeType);
    const documents = useDocumentStore((state) => state.documents);
    const plural = usePluralMessage();
    const t = (descriptor: { message: string }) => translate(descriptor);
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');

    const [editorBase, setEditorBase] = useState<EditorBase | null>(null);
    const [typeDeleteTarget, setTypeDeleteTarget] = useState<{
        id: string;
        name: string;
        count: number;
    } | null>(null);
    const userSettings = useDocumentTypeStore((state) => state.settings);
    // Shipped settings, then the user's own settings (a type may belong to either).
    const settingOptions = [
        ...listShippedSettings(),
        ...Object.values(userSettings).map((setting) => ({
            value: `setting:${setting.id}`,
            systemId: setting.systemId,
            moduleId: undefined,
            label: setting.name,
            settingId: setting.id,
        })),
    ];
    const [newTypeSetting, setNewTypeSetting] = useState(settingOptions[0]?.value ?? '');
    const [newTypeName, setNewTypeName] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<CustomTemplate | null>(null);
    const [resetTarget, setResetTarget] = useState<LibraryEntry | null>(null);
    const [importOpen, setImportOpen] = useState(false);
    // Read on every render: the registry lists installed user types next to shipped kinds, and
    // this dialog re-renders when either store changes.
    const targetGroups = listTemplateTargetGroups();
    const [newTarget, setNewTarget] = useState<string>(
        targetGroups[0]?.options[0]?.value ?? 'star-wars-wod/character'
    );
    const newTargetRef = parseTemplateTargetValue(newTarget) ?? {
        systemId: 'star-wars-wod',
        documentKind: 'character',
    };
    const newSystemId = newTargetRef.systemId;
    const newKind = newTargetRef.documentKind;
    const newTargetGroup = targetGroups.find(({ options }) =>
        options.some(({ value }) => value === newTarget)
    );
    const newTargetLabel = newTargetGroup
        ? `${newTargetGroup.label} · ${
              newTargetGroup.options.find(({ value }) => value === newTarget)?.label ?? newKind
          }`
        : targetLabel(newSystemId, newKind);

    // Unified listing (FR-11/12): custom templates + modified defaults (unmodified defaults
    // derive on demand and are surfaced through the page selector; the library shows them too).
    const grouped = useMemo(() => {
        const map = new Map<string, LibraryEntry[]>();
        const push = (template: CustomTemplate, isDefault: boolean, modified: boolean) => {
            const key = `${template.systemId}/${template.documentKind}`;
            const list = map.get(key) ?? [];
            list.push({ template, isDefault, modified });
            map.set(key, list);
        };
        for (const template of templates) {
            push(template, isDefaultTemplateId(template.id, template.systemId), false);
        }
        for (const override of Object.values(defaultOverrides)) {
            const shadowed = templates.some(
                ({ id, systemId }) => id === override.id && systemId === override.systemId
            );
            if (shadowed) continue;
            push(override, true, true);
        }
        return map;
    }, [templates, defaultOverrides]);

    const closeEditor = () => setEditorBase(null);

    const startNewType = () => {
        const setting = settingOptions.find(({ value }) => value === newTypeSetting);
        const name = newTypeName.trim();
        if (!setting || !name) return;
        const settingId =
            'settingId' in setting && typeof setting.settingId === 'string'
                ? setting.settingId
                : undefined;
        setEditorBase({
            kind: 'new-type',
            newType: {
                id: newUserTypeId(),
                name,
                systemId: setting.systemId,
                owner: settingId
                    ? { settingId }
                    : {
                          systemId: SystemIdSchema.parse(setting.systemId),
                          ...(setting.moduleId ? { moduleId: setting.moduleId } : {}),
                      },
            },
        });
    };

    const createTypeWith = (template: CustomTemplate) => {
        const pending = editorBase?.newType;
        if (!pending || template.documentKind !== pending.id) return;
        const now = new Date().toISOString();
        saveType({
            id: pending.id,
            name: pending.name,
            owner: pending.owner,
            defaultTemplateId: template.id,
            createdAt: now,
            updatedAt: now,
        });
        setNewTypeName('');
    };

    const requestTypeDelete = (typeId: string) => {
        const type = userTypes[typeId];
        if (!type) return;
        const count = documents.filter(({ definitionId }) => definitionId === typeId).length;
        setTypeDeleteTarget({ id: typeId, name: type.name, count });
    };

    const deleteType = (typeId: string) => {
        // Pages go with the type; documents stay and show their stored values (spec FR-020).
        for (const template of templates) {
            if (template.documentKind === typeId) removeTemplate(template.id);
        }
        removeType(typeId);
    };

    const download = (contents: string, filename: string) => {
        const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const exportType = (typeId: string) => {
        const payload = buildTypePayload(typeId);
        if (!payload) return;
        download(serializeTypeFile(payload), buildTypeFilename(payload.type.name));
        toast.success(
            translate(uiMessages.sheet.templates.transfer.exportSuccess, {
                title: payload.type.name,
            })
        );
    };

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
                            {[...grouped.entries()].map(([key, entries]) => {
                                const [systemId = '', kind = ''] = key.split('/');
                                const heading = targetLabel(systemId, kind);
                                return (
                                    <section key={key} aria-label={heading}>
                                        <div className="mb-2 flex items-center gap-2">
                                            <h3 className="flex-1 text-xs font-semibold uppercase tracking-wide text-textSecondary">
                                                {heading}
                                                {isUserKind(kind) && (
                                                    <span className="ml-2 rounded bg-bgSurface px-1.5 py-0.5 text-[10px] text-editor">
                                                        {t(library.typeBadge)}
                                                    </span>
                                                )}
                                            </h3>
                                            {isUserKind(kind) && userTypes[kind] && (
                                                <button
                                                    type="button"
                                                    onClick={() => exportType(kind)}
                                                    className={actionButton}
                                                >
                                                    <Download
                                                        className="mr-1 inline h-3 w-3"
                                                        aria-hidden="true"
                                                    />
                                                    {t(library.exportType)}
                                                </button>
                                            )}
                                            {isUserKind(kind) && userTypes[kind] && (
                                                <button
                                                    type="button"
                                                    onClick={() => requestTypeDelete(kind)}
                                                    className={actionButton}
                                                >
                                                    <Trash2
                                                        className="mr-1 inline h-3 w-3"
                                                        aria-hidden="true"
                                                    />
                                                    {t(library.deleteType)}
                                                </button>
                                            )}
                                        </div>
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
                                                                    generateDraftId('tpl'),
                                                                    template
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
                                );
                            })}
                        </div>

                        {quarantine.length > 0 && (
                            <div className="mt-4" data-testid="quarantine-section">
                                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-textSecondary">
                                    {t(library.incompatibleBadge)}
                                </h3>
                                <ul className="space-y-2">
                                    {quarantine.map((entry, index) => (
                                        <li
                                            key={`quarantined-${index}`}
                                            className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-bgBase p-3 opacity-75"
                                        >
                                            <LayoutTemplate
                                                className="h-4 w-4 shrink-0 text-textSecondary"
                                                aria-hidden="true"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-textSecondary">
                                                    {(entry as { name?: unknown }).name &&
                                                    typeof (entry as { name: unknown }).name ===
                                                        'string'
                                                        ? (entry as { name: string }).name
                                                        : `#${index + 1}`}
                                                    <span className="ml-2 rounded bg-bgSurface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-error">
                                                        {t(library.incompatibleBadge)}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-textSecondary">
                                                    {t(library.incompatibleHint)}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="mt-4">
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-textSecondary">
                                {t(library.new)}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={newTarget}
                                    onChange={(event) => setNewTarget(event.target.value)}
                                    aria-label={t(library.kind)}
                                    className="rounded border border-border bg-bgSurface px-2 py-1 text-xs text-textPrimary"
                                >
                                    {targetGroups.map((group) => (
                                        <optgroup key={group.key} label={group.label}>
                                            {group.options.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setEditorBase({ kind: 'empty' })}
                                    className={actionButton}
                                >
                                    <Plus className="mr-1 inline h-3 w-3" aria-hidden="true" />
                                    {translate(library.newPageFor, {
                                        target: newTargetLabel,
                                    })}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImportOpen(true)}
                                    className={actionButton}
                                >
                                    {t(uiMessages.sheet.templates.transfer.import)}
                                </button>
                                {getSkeletonsForKind(newKind as never, newSystemId).map(
                                    (skeleton) => (
                                        <button
                                            key={skeleton.id}
                                            type="button"
                                            onClick={() =>
                                                setEditorBase({
                                                    kind: 'skeleton',
                                                    template: skeleton,
                                                })
                                            }
                                            className={actionButton}
                                        >
                                            <LayoutTemplate
                                                className="mr-1 inline h-3 w-3"
                                                aria-hidden="true"
                                            />
                                            {skeleton.name}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        <UserSettingsPanel
                            onEditPage={({ base, onSaved }) => setEditorBase({ ...base, onSaved })}
                        />

                        <div className="mt-4" data-testid="new-type-section">
                            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-textSecondary">
                                {t(library.newType)}
                            </h3>
                            <p className="mb-2 text-xs text-textSecondary">
                                {t(library.newTypeHint)}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={newTypeSetting}
                                    onChange={(event) => setNewTypeSetting(event.target.value)}
                                    aria-label={t(library.typeSetting)}
                                    className="rounded border border-border bg-bgSurface px-2 py-1 text-xs text-textPrimary"
                                >
                                    {settingOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    value={newTypeName}
                                    onChange={(event) => setNewTypeName(event.target.value)}
                                    aria-label={t(library.typeName)}
                                    placeholder={t(library.typeName)}
                                    maxLength={80}
                                    className="min-w-0 flex-1 rounded border border-border bg-bgSurface px-2 py-1 text-xs text-textPrimary"
                                />
                                <button
                                    type="button"
                                    onClick={startNewType}
                                    disabled={newTypeName.trim().length === 0}
                                    className={`${actionButton} disabled:opacity-40`}
                                >
                                    <Plus className="mr-1 inline h-3 w-3" aria-hidden="true" />
                                    {t(library.createType)}
                                </button>
                            </div>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>

            {editorBase?.kind === 'new-type' && editorBase.newType && (
                <TemplateEditorDialog
                    base={{
                        kind: 'empty',
                        documentKind: editorBase.newType.id,
                        systemId: editorBase.newType.systemId,
                        name: editorBase.newType.name,
                    }}
                    onSaved={createTypeWith}
                    lockTarget
                    onClose={closeEditor}
                />
            )}
            {editorBase?.kind === 'empty' && (
                <TemplateEditorDialog
                    base={{
                        kind: 'empty',
                        documentKind: newKind,
                        systemId: newSystemId,
                        settingId: newTargetRef.settingId,
                    }}
                    onClose={closeEditor}
                />
            )}
            {editorBase?.kind === 'skeleton' && editorBase.template && (
                <TemplateEditorDialog
                    base={{
                        kind: 'skeleton',
                        documentKind: editorBase.template.documentKind,
                        template: editorBase.template,
                    }}
                    onSaved={editorBase.onSaved}
                    // A setting's page (the only caller with onSaved) stays that setting's.
                    lockTarget={editorBase.onSaved !== undefined}
                    onClose={closeEditor}
                />
            )}
            {editorBase?.kind === 'edit' && editorBase.template && (
                <TemplateEditorDialog
                    base={{ kind: 'edit', template: editorBase.template }}
                    onSaved={editorBase.onSaved}
                    lockTarget={editorBase.onSaved !== undefined}
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
                        clearDefaultOverride(
                            resetTarget.template.systemId,
                            resetTarget.template.id
                        );
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
                open={typeDeleteTarget !== null}
                onOpenChange={(isOpen) => {
                    if (!isOpen) setTypeDeleteTarget(null);
                }}
                onConfirm={() => {
                    if (typeDeleteTarget) deleteType(typeDeleteTarget.id);
                    setTypeDeleteTarget(null);
                }}
                title={t(library.deleteType)}
                description={
                    typeDeleteTarget
                        ? plural(library.deleteTypeDescription, typeDeleteTarget.count, {
                              name: typeDeleteTarget.name,
                          })
                        : ''
                }
                confirmLabel={t(library.deleteType)}
                cancelLabel={t(library.title)}
                variant="danger"
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
