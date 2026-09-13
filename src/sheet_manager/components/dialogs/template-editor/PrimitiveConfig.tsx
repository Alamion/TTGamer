import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { PrimitiveNode, TemplateNode } from '../../../types/template';
import type { NodeUpdates } from './draft';
import { useEditorModel } from './EditorModel';
import { ToggleRow } from './LayoutControls';
import { ListSourceSelect, ValueSourceSelect } from './SourceControls';

const primitives = uiMessages.sheet.templates.primitives;
const editor = uiMessages.sheet.templates.editor;
const editorMaxFrom = editor.maxFrom;
const editorMaxFromPlaceholder = editor.maxFromPlaceholder;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

/**
 * Config panel for a document-bound primitive: binding (same-kind re-bind only), label
 * override, compact flag, track level/name overrides, and the formula-bound maximum
 * (`maxFrom`, FR-12) for pool resources. Presets live on list nodes, not primitives.
 */
export function PrimitiveConfig({
    node,
    onUpdate,
    onReplace,
}: {
    node: PrimitiveNode;
    onUpdate: (nodeId: string, updates: NodeUpdates) => void;
    onReplace: (nodeId: string, next: TemplateNode) => void;
}) {
    const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
        translate(descriptor, values);
    const { bindings, coordinateListId } = useEditorModel();
    const descriptor = bindings.find((binding) => binding.key === node.bindingKey);
    const sameKindBindings = descriptor
        ? bindings.filter((binding) => binding.kind === descriptor.kind)
        : bindings;
    const update = (updates: NodeUpdates) => onUpdate(node.id, updates);

    return (
        <div className="space-y-3 rounded border border-border bg-bgSurface p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-textSecondary">
                {t(primitives.boundTo, { binding: node.bindingKey })}
            </p>

            {descriptor?.kind === 'equipment' ? (
                <ListSourceSelect node={node} onReplace={onReplace} />
            ) : descriptor?.kind === 'track' || !descriptor ? (
                <label className="grid gap-1 text-xs text-textSecondary">
                    {t(descriptor ? editor.trackerSource : primitives.binding)}
                    <select
                        value={node.bindingKey}
                        onChange={(event) => update({ bindingKey: event.target.value })}
                        aria-label={t(descriptor ? editor.trackerSource : primitives.binding)}
                        className={inputClasses}
                    >
                        {!descriptor && <option value={node.bindingKey}>{node.bindingKey}</option>}
                        {sameKindBindings.map((binding) => (
                            <option key={binding.key} value={binding.key}>
                                {binding.label}
                            </option>
                        ))}
                    </select>
                </label>
            ) : (
                <ValueSourceSelect node={node} onReplace={onReplace} />
            )}

            <label className="grid gap-1 text-xs text-textSecondary">
                {t(primitives.labelOverride)}
                <input
                    value={node.label ?? ''}
                    onChange={(event) =>
                        update({
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
                    checked={node.compact}
                    onChange={(event) => update({ compact: event.target.checked })}
                />
                {t(primitives.compact)}
            </label>

            <ToggleRow
                checked={!node.hideLabel}
                label={t(editor.showLabel)}
                onChange={(checked) => update({ hideLabel: checked ? undefined : true })}
            />

            {descriptor?.kind === 'resource' && descriptor.mode === 'pool' && (
                <label className="grid gap-1 text-xs text-textSecondary">
                    {t(editor.primitivePart)}
                    <select
                        value={node.part ?? 'current'}
                        onChange={(event) =>
                            update({ part: event.target.value === 'max' ? 'max' : undefined })
                        }
                        aria-label={t(editor.primitivePart)}
                        className={inputClasses}
                    >
                        <option value="current">{t(editor.partCurrent)}</option>
                        <option value="max">{t(editor.partMax)}</option>
                    </select>
                </label>
            )}

            {descriptor?.kind === 'resource' && (
                <label className="grid gap-1 text-xs text-textSecondary">
                    {t(editor.minFrom)}
                    <input
                        value={node.minFrom ?? ''}
                        onChange={(event) =>
                            update({
                                minFrom:
                                    event.target.value.length > 0 ? event.target.value : undefined,
                            })
                        }
                        placeholder={t(editor.minFromPlaceholder)}
                        aria-label={t(editor.minFrom)}
                        list={coordinateListId}
                        className={inputClasses}
                    />
                </label>
            )}

            {descriptor?.kind === 'resource' && (
                <label className="grid gap-1 text-xs text-textSecondary">
                    {t(editorMaxFrom)}
                    <input
                        value={node.maxFrom ?? ''}
                        onChange={(event) =>
                            update({
                                maxFrom:
                                    event.target.value.length > 0 ? event.target.value : undefined,
                            })
                        }
                        placeholder={t(editorMaxFromPlaceholder)}
                        aria-label={t(editorMaxFrom)}
                        list={coordinateListId}
                        className={inputClasses}
                    />
                </label>
            )}

            {descriptor?.kind === 'track' && (
                <div className="grid gap-2">
                    <label className="grid gap-1 text-xs text-textSecondary">
                        {t(primitives.trackLevels)}
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={node.track?.levels ?? 0}
                            onChange={(event) => {
                                const count = Math.max(0, Number(event.target.value) || 0);
                                if (count === 0) {
                                    update({ track: undefined });
                                    return;
                                }
                                const names = node.track?.names ?? [];
                                const nextNames = Array.from(
                                    { length: count },
                                    (_, index) => names[index] ?? `Level ${index + 1}`
                                );
                                update({ track: { levels: count, names: nextNames } });
                            }}
                            className={`${inputClasses} w-20`}
                        />
                    </label>
                    {node.track?.names.map((name, index) => (
                        <label
                            key={`${node.id}-track-${index}`}
                            className="grid gap-1 text-xs text-textSecondary"
                        >
                            {t(primitives.trackLevelName, { index: index + 1 })}
                            <input
                                value={name}
                                onChange={(event) => {
                                    const names = [...node.track!.names];
                                    names[index] = event.target.value;
                                    update({ track: { levels: node.track!.levels, names } });
                                }}
                                className={inputClasses}
                            />
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
