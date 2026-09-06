import { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useCallback, useMemo, useState } from 'react';

import { useTemplateStore } from '../../store/templateStore';
import { type CustomTemplate, CustomTemplateSchema } from '../../types/template';
import { ConfirmDialog } from './ConfirmDialog';
import {
    addBlock,
    addField,
    addOption,
    addPrimitive,
    addSection,
    attachCatalog,
    changeFieldType,
    collectDraftIssues,
    createDraftFromTemplate,
    createEmptyDraft,
    describeDraft,
    detachCatalog,
    type EditorDraft,
    generateDraftId,
    moveBlock,
    moveField,
    moveSection,
    removeBlock,
    removeField,
    removeOption,
    removeSection,
    renameDraft,
    renameSection,
    setDraftKind,
    updateBlock,
    updateField,
    updateFill,
    updateOption,
} from './template-editor/draft';
import type { FieldEditorCallbacks } from './template-editor/FieldEditor';
import { SectionEditor } from './template-editor/SectionEditor';
import { isDefaultTemplateId } from './TemplateLibraryDialog';

const editor = uiMessages.sheet.templates.editor;
const library = uiMessages.sheet.templates.library;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

const DOCUMENT_KINDS = ['character', 'creature', 'vehicle', 'group'] as const;

export interface TemplateEditorDialogProps {
    base:
        | { kind: 'empty' }
        | { kind: 'skeleton'; documentKind: string; template: CustomTemplate }
        | { kind: 'duplicate' | 'edit'; template: CustomTemplate };
    onClose: () => void;
}

export function TemplateEditorDialog({ base, onClose }: TemplateEditorDialogProps) {
    const { saveTemplate, setDefaultOverride } = useTemplateStore();
    const t = useCallback((descriptor: { message: string }) => translate(descriptor), []);
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');

    // Feature 004: editing a default template targets its override, never the custom library.
    const editingDefault = base.kind === 'edit' && isDefaultTemplateId(base.template.id);

    const [draft, setDraft] = useState<EditorDraft>(() => {
        if (base.kind === 'empty') return createEmptyDraft('character');
        if (base.kind === 'edit') return createDraftFromTemplate(base.template);
        if (base.kind === 'skeleton') {
            return createDraftFromTemplate(base.template, { id: generateDraftId('tpl') });
        }
        return createDraftFromTemplate(base.template, { id: generateDraftId('tpl') });
    });
    const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
    const [saveIssues, setSaveIssues] = useState<readonly string[]>([]);
    const [initialJson] = useState(() => JSON.stringify(draft));
    const isDirty = JSON.stringify(draft) !== initialJson;

    const issueMessages = useMemo(
        () =>
            collectDraftIssues(draft, {
                emptyName: t(editor.emptyName),
                emptyLabel: t(editor.emptyLabel),
                duplicateId: t(editor.duplicateId),
                invalidKey: t(editor.invalidKey),
                limitReached: t(editor.limitReached),
                invalidBounds: t(editor.invalidBounds),
            }).map((issue) => issue.message),
        [draft, t]
    );

    const handleSave = () => {
        try {
            const parsed = CustomTemplateSchema.parse(draft);
            if (editingDefault) {
                // Draft-until-save (FR-9): the override lands only on explicit save; assigned
                // documents then render the saved version (live propagation, clarification Q2).
                setDefaultOverride(parsed.id, parsed);
            } else {
                saveTemplate(parsed);
            }
            onClose();
        } catch (error) {
            const fallback =
                error instanceof Error && error.message.length > 0 ? [error.message] : [];
            setSaveIssues(fallback);
        }
    };

    const requestClose = () => {
        if (isDirty) setDiscardConfirmOpen(true);
        else onClose();
    };

    const fieldCallbacks = (blockId: string, fieldId: string): FieldEditorCallbacks => ({
        onUpdate: (updates) =>
            setDraft((current) => updateField(current, blockId, fieldId, updates)),
        onChangeType: (type) =>
            setDraft((current) => changeFieldType(current, blockId, fieldId, type)),
        onMove: (offset) => setDraft((current) => moveField(current, blockId, fieldId, offset)),
        onRemove: () => setDraft((current) => removeField(current, blockId, fieldId)),
        onAddOption: () => setDraft((current) => addOption(current, blockId, fieldId)),
        onUpdateOption: (optionId, label) =>
            setDraft((current) => updateOption(current, blockId, fieldId, optionId, label)),
        onRemoveOption: (optionId) =>
            setDraft((current) => removeOption(current, blockId, fieldId, optionId)),
        onAttachCatalog: (catalogId) =>
            setDraft((current) => attachCatalog(current, blockId, fieldId, catalogId)),
        onDetachCatalog: () => setDraft((current) => detachCatalog(current, blockId, fieldId)),
        onUpdateFill: (detailKey, rule) =>
            setDraft((current) => updateFill(current, blockId, fieldId, detailKey, rule)),
    });

    const visibleIssues = [...issueMessages, ...saveIssues];

    return (
        <Dialog.Root
            open
            onOpenChange={(open) => {
                if (!open) requestClose();
            }}
        >
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-[9999] flex h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[110rem] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-bgSurface shadow-xl focus:outline-none">
                    <Dialog.Title className="border-b border-border p-4 text-lg font-semibold text-textPrimary">
                        {draft.name.trim().length > 0 ? draft.name : t(editor.untitledName)}
                    </Dialog.Title>
                    <Dialog.Description className="sr-only">{t(library.title)}</Dialog.Description>

                    <div className="border-b border-border p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                value={draft.name}
                                onChange={(event) =>
                                    setDraft((current) => renameDraft(current, event.target.value))
                                }
                                placeholder={t(editor.namePlaceholder)}
                                aria-label={t(editor.name)}
                                className={`${inputClasses} min-w-0 flex-1 font-medium`}
                            />
                            <select
                                value={draft.documentKind}
                                onChange={(event) =>
                                    setDraft((current) => setDraftKind(current, event.target.value))
                                }
                                aria-label={t(library.kind)}
                                className={inputClasses}
                            >
                                {DOCUMENT_KINDS.map((kind) => (
                                    <option key={kind} value={kind}>
                                        {kind}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <input
                            value={draft.description ?? ''}
                            onChange={(event) =>
                                setDraft((current) => describeDraft(current, event.target.value))
                            }
                            placeholder={t(editor.descriptionPlaceholder)}
                            aria-label={t(editor.descriptionLabel)}
                            className={`${inputClasses} mt-2 w-full`}
                        />
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
                        {draft.sections.map((section) => (
                            <SectionEditor
                                key={section.id}
                                draft={draft}
                                section={section}
                                callbacks={{
                                    onRename: (title) =>
                                        setDraft((current) =>
                                            renameSection(current, section.id, title)
                                        ),
                                    onMove: (offset) =>
                                        setDraft((current) =>
                                            moveSection(current, section.id, offset)
                                        ),
                                    onRemove: () =>
                                        setDraft((current) => removeSection(current, section.id)),
                                    onAddBlock: (type) =>
                                        setDraft((current) => addBlock(current, section.id, type)),
                                    onAddPrimitive: (bindingKey) =>
                                        setDraft((current) =>
                                            addPrimitive(current, section.id, bindingKey)
                                        ),
                                    blockCallbacks: (blockId) => ({
                                        onUpdate: (updates) =>
                                            setDraft((current) =>
                                                updateBlock(current, section.id, blockId, updates)
                                            ),
                                        onMove: (offset) =>
                                            setDraft((current) =>
                                                moveBlock(current, section.id, blockId, offset)
                                            ),
                                        onRemove: () =>
                                            setDraft((current) =>
                                                removeBlock(current, section.id, blockId)
                                            ),
                                        onAddField: () =>
                                            setDraft((current) => addField(current, blockId)),
                                        fieldCallbacks: (fieldId) =>
                                            fieldCallbacks(blockId, fieldId),
                                    }),
                                }}
                            />
                        ))}
                        <button
                            type="button"
                            onClick={() => setDraft((current) => addSection(current))}
                            className="w-full rounded-lg border border-dashed border-border py-2 text-sm text-primary hover:bg-bgBase"
                        >
                            + {t(editor.addSection)}
                        </button>
                    </div>

                    <div className="border-t border-border p-4">
                        <div role="alert" aria-live="polite">
                            {visibleIssues.length > 0 && (
                                <ul className="mb-3 space-y-1 text-xs text-error">
                                    {visibleIssues.map((message, index) => (
                                        <li key={index}>{message}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={requestClose}
                                className="rounded border border-border bg-bgSurface px-4 py-2 text-sm font-medium text-textSecondary hover:bg-bgBase"
                            >
                                {t(editor.cancel)}
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={issueMessages.length > 0}
                                className="rounded border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40"
                            >
                                {t(editor.save)}
                            </button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>

            <ConfirmDialog
                open={discardConfirmOpen}
                onOpenChange={setDiscardConfirmOpen}
                onConfirm={() => {
                    setDiscardConfirmOpen(false);
                    onClose();
                }}
                title={t(editor.removeConfirmTitle)}
                description={t(editor.removeConfirmDescription)}
                confirmLabel={t(editor.discard)}
                cancelLabel={t(editor.cancel)}
                variant="danger"
            />
        </Dialog.Root>
    );
}
