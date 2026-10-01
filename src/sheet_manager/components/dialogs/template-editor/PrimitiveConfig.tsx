import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';

import type { PrimitiveNode, TemplateNode } from '../../../types/template';
import { builtInSettings, builtInSettingsUpdate } from './builtInTrackerSettings';
import type { NodeUpdates } from './draft';
import { EditorHelp } from './EditorHelp';
import { useEditorModel } from './EditorModel';
import { ToggleRow } from './LayoutControls';
import { PoolTrackerSettings } from './PoolTrackerSettings';
import { ListSourceSelect, TrackerSourceSelect, ValueSourceSelect } from './SourceControls';
import { TermHintControl } from './TermHintControl';
import { TrackerSettings } from './TrackerSettings';

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
    const pool = descriptor?.kind === 'resource' && descriptor.mode === 'pool';
    const asTracker = pool && node.poolTracker !== undefined;
    // A dots node editing the maximum keeps its minimum on the maximum as a tracker, and back.
    const setDisplay = (tracker: boolean) =>
        update(
            tracker
                ? {
                      poolTracker: { display: 'row', legend: false, total: true },
                      part: undefined,
                      ...(node.part === 'max' && node.minFrom
                          ? { maxMinFrom: node.minFrom, minFrom: undefined }
                          : {}),
                  }
                : {
                      poolTracker: undefined,
                      maxMinFrom: undefined,
                      ...(node.maxMinFrom && !node.minFrom
                          ? { minFrom: node.maxMinFrom, part: 'max' as const }
                          : {}),
                  }
        );

    return (
        <div className="space-y-3 rounded border border-border bg-bgSurface p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-textSecondary">
                {t(primitives.boundTo, { binding: node.bindingKey })}
            </p>

            {descriptor?.kind === 'equipment' ? (
                <ListSourceSelect node={node} onReplace={onReplace} />
            ) : descriptor?.kind === 'track' ? (
                <TrackerSourceSelect node={node} onReplace={onReplace} />
            ) : descriptor?.kind === 'rows' || !descriptor ? (
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

            {pool && (
                <div
                    role="group"
                    aria-label={t(editor.primitiveDisplay)}
                    className="flex flex-wrap items-center gap-1 text-xs text-textSecondary"
                >
                    <span>{t(editor.primitiveDisplay)}</span>
                    {([false, true] as const).map((tracker) => (
                        <button
                            key={String(tracker)}
                            type="button"
                            aria-pressed={asTracker === tracker}
                            onClick={() => {
                                if (asTracker !== tracker) setDisplay(tracker);
                            }}
                            className={clsx(
                                'rounded border px-2.5 py-1 text-xs transition-colors',
                                asTracker === tracker
                                    ? 'border-primary bg-primary-muted text-textPrimary'
                                    : 'border-border text-textSecondary hover:border-primary/60'
                            )}
                        >
                            {t(tracker ? editor.displayTracker : editor.displayDots)}
                        </button>
                    ))}
                </div>
            )}

            {descriptor?.kind !== 'track' && !asTracker && (
                <label className="flex items-center gap-2 text-xs text-textSecondary">
                    <input
                        type="checkbox"
                        checked={node.compact}
                        onChange={(event) => update({ compact: event.target.checked })}
                    />
                    {t(primitives.compact)}
                </label>
            )}

            <ToggleRow
                checked={!node.hideLabel}
                label={t(editor.showLabel)}
                onChange={(checked) => update({ hideLabel: checked ? undefined : true })}
            />
            <TermHintControl node={node} onChange={(termHint) => update({ termHint })} />

            {pool && !asTracker && (
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
                <FormulaInput
                    label={t(asTracker ? editor.minFromCurrent : editor.minFrom)}
                    value={node.minFrom}
                    placeholder={t(editor.minFromPlaceholder)}
                    list={coordinateListId}
                    onChange={(minFrom) => update({ minFrom })}
                />
            )}

            {asTracker && (
                <FormulaInput
                    label={t(editor.maxMinFrom)}
                    value={node.maxMinFrom}
                    placeholder={t(editor.minFromPlaceholder)}
                    list={coordinateListId}
                    onChange={(maxMinFrom) => update({ maxMinFrom })}
                />
            )}

            {descriptor?.kind === 'resource' && (
                <label className="grid gap-1 text-xs text-textSecondary">
                    <span className="flex items-center gap-1">
                        {t(editorMaxFrom)}
                        <EditorHelp topic="limitsFromValues" about={t(editorMaxFrom)} />
                    </span>
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

            {asTracker && node.poolTracker && (
                <PoolTrackerSettings
                    value={node.poolTracker}
                    onChange={(poolTracker) => update({ poolTracker })}
                />
            )}

            {descriptor?.kind === 'track' && (
                <TrackerSettings
                    {...builtInSettings(node, descriptor, () => update({ track: undefined }))}
                    onChange={(change) => update(builtInSettingsUpdate(node, descriptor, change))}
                />
            )}
        </div>
    );
}

/** A minimum from a value or formula, with the shared `limitsFromValues` help. */
function FormulaInput({
    label,
    value,
    placeholder,
    list,
    onChange,
}: {
    label: string;
    value: string | undefined;
    placeholder: string;
    list: string;
    onChange: (next: string | undefined) => void;
}) {
    return (
        <label className="grid gap-1 text-xs text-textSecondary">
            <span className="flex items-center gap-1">
                {label}
                <EditorHelp topic="limitsFromValues" about={label} />
            </span>
            <input
                value={value ?? ''}
                onChange={(event) =>
                    onChange(event.target.value.length > 0 ? event.target.value : undefined)
                }
                placeholder={placeholder}
                aria-label={label}
                list={list}
                className={inputClasses}
            />
        </label>
    );
}
