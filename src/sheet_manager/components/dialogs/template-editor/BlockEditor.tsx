import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

import type { CustomTemplate, TemplateBlock, TemplateField } from '../../../types/template';
import { TEMPLATE_LIMITS } from '../../../types/template';
import type { BlockUpdates } from './draft';
import { FieldEditor, type FieldEditorCallbacks } from './FieldEditor';

const editor = uiMessages.sheet.templates.editor;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

interface BlockEditorProps {
    block: TemplateBlock;
    callbacks: {
        onUpdate: (updates: BlockUpdates) => void;
        onMove: (offset: -1 | 1) => void;
        onRemove: () => void;
        onAddField: () => void;
        fieldCallbacks: (fieldId: string) => FieldEditorCallbacks;
    };
    draft: CustomTemplate;
}

export function BlockEditor({ block, callbacks, draft }: BlockEditorProps) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const items: readonly TemplateField[] = block.type === 'fields' ? block.fields : block.columns;
    const atFieldLimit = items.length >= TEMPLATE_LIMITS.fieldsPerBlock;

    return (
        <div className="rounded border border-border bg-bgSurface p-3" data-block-id={block.id}>
            <div className="flex items-center gap-2">
                <input
                    value={block.title ?? ''}
                    onChange={(event) =>
                        callbacks.onUpdate(
                            event.target.value.length > 0
                                ? { title: event.target.value }
                                : { title: undefined }
                        )
                    }
                    placeholder={t(editor.blockTitle)}
                    aria-label={t(editor.blockTitle)}
                    className={`${inputClasses} flex-1`}
                />
                {block.type === 'fields' && (
                    <select
                        value={block.columns}
                        onChange={(event) =>
                            callbacks.onUpdate({ columns: Number(event.target.value) })
                        }
                        aria-label={t(editor.columns)}
                        className={inputClasses}
                    >
                        {[1, 2, 3, 4].map((count) => (
                            <option key={count} value={count}>
                                {t(editor.columns)}: {count}
                            </option>
                        ))}
                    </select>
                )}
                {block.type === 'table' && (
                    <>
                        <input
                            type="number"
                            value={block.minRows}
                            min={0}
                            max={1000}
                            onChange={(event) =>
                                callbacks.onUpdate({ minRows: Number(event.target.value) })
                            }
                            aria-label={t(editor.minRows)}
                            className={`${inputClasses} w-20`}
                        />
                        <input
                            type="number"
                            value={block.maxRows}
                            min={1}
                            max={1000}
                            onChange={(event) =>
                                callbacks.onUpdate({ maxRows: Number(event.target.value) })
                            }
                            aria-label={t(editor.maxRows)}
                            className={`${inputClasses} w-20`}
                        />
                    </>
                )}
                <button
                    type="button"
                    onClick={() => callbacks.onMove(-1)}
                    aria-label={t(editor.moveUp)}
                    className="rounded p-1 text-textSecondary hover:bg-bgBase hover:text-textPrimary"
                >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => callbacks.onMove(1)}
                    aria-label={t(editor.moveDown)}
                    className="rounded p-1 text-textSecondary hover:bg-bgBase hover:text-textPrimary"
                >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={callbacks.onRemove}
                    aria-label={t(editor.remove)}
                    className="rounded p-1 text-textSecondary hover:bg-bgBase hover:text-error"
                >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>

            <div className="mt-3 space-y-2">
                {items.map((field) => (
                    <FieldEditor
                        key={field.id}
                        field={field}
                        draft={draft}
                        selfId={field.id}
                        callbacks={callbacks.fieldCallbacks(field.id)}
                    />
                ))}
            </div>

            <button
                type="button"
                onClick={callbacks.onAddField}
                disabled={atFieldLimit}
                className="mt-3 flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-bgBase disabled:opacity-40"
            >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t(editor.addField)}
            </button>
        </div>
    );
}
