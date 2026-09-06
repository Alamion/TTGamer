import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

import { listBuiltInBlocks } from '../../../features/sheet/registry/builtInBlockRegistry';
import { useExpandedState } from '../../../hooks';
import { listDocumentBindings } from '../../../systems/star-wars-wod/documentBindings';
import type { CustomTemplate, TemplateBlock, TemplateField } from '../../../types/template';
import { TEMPLATE_LIMITS } from '../../../types/template';
import type { BlockUpdates } from './draft';
import { FieldEditor, type FieldEditorCallbacks } from './FieldEditor';

/** Label descriptor for one ready-made block, resolved from the system+kind registry. */
function builtInBlockLabel(
    draft: CustomTemplate,
    blockId: string
): { id: string; message: string } {
    return (
        listBuiltInBlocks(draft.systemId, draft.documentKind).find(({ id }) => id === blockId)
            ?.label ?? { id: blockId, message: blockId }
    );
}

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
    const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
        translate(descriptor, values);
    const items: readonly TemplateField[] =
        block.type === 'fields' ? block.fields : block.type === 'table' ? block.columns : [];
    const atFieldLimit = items.length >= TEMPLATE_LIMITS.fieldsPerBlock;
    // Editor UX (review 2026-09-05): collapsible field groups / tables with persistent state.
    const [isExpanded, toggleExpanded] = useExpandedState(
        `template-editor-${draft.id}-${block.id}`
    );

    return (
        <div className="rounded border border-border bg-bgSurface p-3" data-block-id={block.id}>
            <div className="flex items-center gap-2">
                {block.type === 'built-in' ? (
                    // A ready-made page part is opaque: show its own name, no field editing.
                    <span
                        className="flex-1 truncate text-sm font-medium text-textPrimary"
                        data-builtin-block={block.blockId}
                    >
                        {translate(builtInBlockLabel(draft, block.blockId))}
                    </span>
                ) : block.type === 'primitive' ? (
                    <span
                        className="flex-1 truncate text-sm font-medium text-textPrimary"
                        data-primitive-binding={block.bindingKey}
                    >
                        {block.label ?? block.bindingKey}
                    </span>
                ) : (
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
                )}
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
                {(block.type === 'fields' || block.type === 'table') && (
                    <button
                        type="button"
                        onClick={toggleExpanded}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? t(editor.collapse) : t(editor.expand)}
                        className="rounded p-1 text-textSecondary hover:bg-bgBase hover:text-textPrimary"
                    >
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        )}
                    </button>
                )}
                {isExpanded && (
                    <button
                        type="button"
                        onClick={() => callbacks.onMove(-1)}
                        aria-label={t(editor.moveUp)}
                        className="rounded p-1 text-textSecondary hover:bg-bgBase hover:text-textPrimary"
                    >
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
                {isExpanded && (
                    <button
                        type="button"
                        onClick={() => callbacks.onMove(1)}
                        aria-label={t(editor.moveDown)}
                        className="rounded p-1 text-textSecondary hover:bg-bgBase hover:text-textPrimary"
                    >
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={callbacks.onRemove}
                    aria-label={t(editor.remove)}
                    className="rounded p-1 text-textSecondary hover:bg-bgBase hover:text-error"
                >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>

            {(block.type === 'fields' || block.type === 'table') && isExpanded && (
                <>
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
                </>
            )}

            {block.type === 'primitive' && (
                <PrimitiveConfig block={block} draft={draft} callbacks={callbacks} />
            )}
        </div>
    );
}

const primitives = uiMessages.sheet.templates.primitives;

/** Config panel for a document-bound primitive: binding, label, compact, track/presets. */
function PrimitiveConfig({
    block,
    draft,
    callbacks,
}: {
    block: Extract<TemplateBlock, { type: 'primitive' }>;
    draft: CustomTemplate;
    callbacks: { onUpdate: (updates: BlockUpdates) => void };
}) {
    const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
        translate(descriptor, values);
    const bindings = listDocumentBindings(draft.systemId, draft.documentKind);
    const descriptor = bindings.find((binding) => binding.key === block.bindingKey);
    // Re-binding stays within the primitive's own kind (list ↔ list, track ↔ track) — system-
    // backed content is composed through regular fields, not through primitive re-binding.
    const sameKindBindings = descriptor
        ? bindings.filter((binding) => binding.kind === descriptor.kind)
        : bindings;

    return (
        <div className="mt-3 space-y-3 rounded border border-border bg-bgBase p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-textSecondary">
                {t(primitives.boundTo, { binding: block.bindingKey })}
            </p>

            <label className="grid gap-1 text-xs text-textSecondary">
                {t(primitives.binding)}
                <select
                    value={block.bindingKey}
                    onChange={(event) => callbacks.onUpdate({ bindingKey: event.target.value })}
                    className={inputClasses}
                >
                    {sameKindBindings.map((binding) => (
                        <option key={binding.key} value={binding.key}>
                            {binding.label}
                        </option>
                    ))}
                </select>
            </label>

            <label className="grid gap-1 text-xs text-textSecondary">
                {t(primitives.labelOverride)}
                <input
                    value={block.label ?? ''}
                    onChange={(event) =>
                        callbacks.onUpdate({
                            label: event.target.value.length > 0 ? event.target.value : undefined,
                        })
                    }
                    placeholder={t(primitives.labelOverridePlaceholder)}
                    className={inputClasses}
                />
            </label>

            <label className="flex items-center gap-2 text-xs text-textSecondary">
                <input
                    type="checkbox"
                    checked={block.compact}
                    onChange={(event) => callbacks.onUpdate({ compact: event.target.checked })}
                />
                {t(primitives.compact)}
            </label>

            {descriptor?.kind === 'track' && (
                <div className="grid gap-2">
                    <label className="grid gap-1 text-xs text-textSecondary">
                        {t(primitives.trackLevels)}
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={block.track?.levels ?? 0}
                            onChange={(event) => {
                                const count = Math.max(0, Number(event.target.value) || 0);
                                if (count === 0) {
                                    callbacks.onUpdate({ track: undefined });
                                    return;
                                }
                                const names = block.track?.names ?? [];
                                const nextNames = Array.from(
                                    { length: count },
                                    (_, index) => names[index] ?? `Level ${index + 1}`
                                );
                                callbacks.onUpdate({ track: { levels: count, names: nextNames } });
                            }}
                            className={`${inputClasses} w-20`}
                        />
                    </label>
                    {block.track?.names.map((name, index) => (
                        <label
                            key={`${block.id}-track-${index}`}
                            className="grid gap-1 text-xs text-textSecondary"
                        >
                            {t(primitives.trackLevelName, { index: index + 1 })}
                            <input
                                value={name}
                                onChange={(event) => {
                                    const names = [...block.track!.names];
                                    names[index] = event.target.value;
                                    callbacks.onUpdate({
                                        track: { levels: block.track!.levels, names },
                                    });
                                }}
                                className={inputClasses}
                            />
                        </label>
                    ))}
                </div>
            )}

            {descriptor?.kind === 'list' && (
                <div className="grid gap-2">
                    <p className="text-xs font-semibold text-textSecondary">
                        {t(primitives.presets)}
                    </p>
                    {(block.presets ?? []).map((preset, index) => (
                        <div
                            key={`${block.id}-preset-${preset.key}`}
                            className="flex items-center gap-2"
                        >
                            <input
                                value={preset.label}
                                onChange={(event) => {
                                    const presets = [...(block.presets ?? [])];
                                    presets[index] = { ...preset, label: event.target.value };
                                    callbacks.onUpdate({ presets });
                                }}
                                aria-label={t(primitives.presetLabel)}
                                placeholder={t(primitives.presetLabel)}
                                className={`${inputClasses} flex-1`}
                            />
                            <input
                                type="number"
                                min={0}
                                max={20}
                                value={preset.value ?? 0}
                                onChange={(event) => {
                                    const presets = [...(block.presets ?? [])];
                                    presets[index] = {
                                        ...preset,
                                        value: Number(event.target.value) || 0,
                                    };
                                    callbacks.onUpdate({ presets });
                                }}
                                aria-label={t(primitives.presetValue)}
                                className={`${inputClasses} w-16`}
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    callbacks.onUpdate({
                                        presets: (block.presets ?? []).filter(
                                            (_, candidate) => candidate !== index
                                        ),
                                    })
                                }
                                aria-label={t(primitives.removePreset)}
                                className="rounded p-1 text-textSecondary hover:bg-bgBase hover:text-error"
                            >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() =>
                            callbacks.onUpdate({
                                presets: [
                                    ...(block.presets ?? []),
                                    {
                                        key: `preset-${(block.presets?.length ?? 0) + 1}-${Date.now().toString(36)}`,
                                        label: '',
                                        value: 0,
                                    },
                                ],
                            })
                        }
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-bgBase"
                    >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {t(primitives.addPreset)}
                    </button>
                </div>
            )}
        </div>
    );
}
