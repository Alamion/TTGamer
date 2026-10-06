import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';

import type { DocumentBindingDescriptor } from '../../systems/templateBindings';
import type { PrimitiveNode, TemplateNode } from '../../types/template';
import { builtInSettings, builtInSettingsUpdate } from './builtInTrackerSettings';
import type { NodeUpdates } from './draft';
import { ToggleRow } from './LayoutControls';
import { PoolTrackerSettings } from './PoolTrackerSettings';
import { FormulaField } from './settings/FormulaField';
import type { GroupedSettings } from './settings/groupedSettings';
import { inputClasses } from './settings/inputClasses';
import { settingLabel } from './settings/registry';
import { SettingField } from './settings/SettingField';
import { ListSourceSelect, TrackerSourceSelect, ValueSourceSelect } from './SourceControls';
import { hasTermHint, TermHintControl } from './TermHintControl';
import { TrackerSettings } from './TrackerSettings';

const primitives = uiMessages.sheet.templates.primitives;
const editor = uiMessages.sheet.templates.editor;

const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
    translate(descriptor, values);

/**
 * The settings of a document-bound primitive per group (spec 022): its label (Content), the
 * binding and the edited part (Value), formula-bound limits (FR-12), the look, and the term hint.
 */
export function primitiveSettings({
    bindings,
    node,
    onReplace,
    onUpdate,
}: {
    bindings: readonly DocumentBindingDescriptor[];
    node: PrimitiveNode;
    onUpdate: (nodeId: string, updates: NodeUpdates) => void;
    onReplace: (nodeId: string, next: TemplateNode) => void;
}): GroupedSettings {
    const descriptor = bindings.find((binding) => binding.key === node.bindingKey);
    const sameKindBindings = descriptor
        ? bindings.filter((binding) => binding.kind === descriptor.kind)
        : bindings;
    const update = (updates: NodeUpdates) => onUpdate(node.id, updates);
    const resource = descriptor?.kind === 'resource';
    const pool = resource && descriptor.mode === 'pool';
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
    const bindingLabel = descriptor ? editor.trackerSource : primitives.binding;

    const content = (
        <SettingField
            label={settingLabel('label')}
            hint={t(primitives.labelOverridePlaceholder)}
            setting="label"
        >
            {(control) => (
                <input
                    {...control}
                    value={node.label ?? ''}
                    onChange={(event) =>
                        update({
                            label: event.target.value.length > 0 ? event.target.value : undefined,
                        })
                    }
                    placeholder={descriptor?.label}
                    className={`${inputClasses} w-full`}
                />
            )}
        </SettingField>
    );

    const value = (
        <>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-textSecondary">
                {t(primitives.boundTo, { binding: node.bindingKey })}
            </p>
            {descriptor?.kind === 'equipment' ? (
                <ListSourceSelect node={node} onReplace={onReplace} />
            ) : descriptor?.kind === 'track' ? (
                <TrackerSourceSelect node={node} onReplace={onReplace} />
            ) : descriptor?.kind === 'rows' || !descriptor ? (
                <SettingField label={t(bindingLabel)} setting="source">
                    {(control) => (
                        <select
                            {...control}
                            value={node.bindingKey}
                            onChange={(event) => update({ bindingKey: event.target.value })}
                            className={`${inputClasses} w-full`}
                        >
                            {!descriptor && (
                                <option value={node.bindingKey}>{node.bindingKey}</option>
                            )}
                            {sameKindBindings.map((binding) => (
                                <option key={binding.key} value={binding.key}>
                                    {binding.label}
                                </option>
                            ))}
                        </select>
                    )}
                </SettingField>
            ) : (
                <ValueSourceSelect node={node} onReplace={onReplace} />
            )}
            {pool && !asTracker && (
                <SettingField label={settingLabel('part')} setting="part">
                    {(control) => (
                        <select
                            {...control}
                            value={node.part ?? 'current'}
                            onChange={(event) =>
                                update({ part: event.target.value === 'max' ? 'max' : undefined })
                            }
                            className={`${inputClasses} w-full`}
                        >
                            <option value="current">{t(editor.partCurrent)}</option>
                            <option value="max">{t(editor.partMax)}</option>
                        </select>
                    )}
                </SettingField>
            )}
        </>
    );

    const limits = resource ? (
        <>
            <FormulaField
                label={t(asTracker ? editor.currentAtLeast : editor.minFromShort)}
                setting="minFrom"
                placeholder={t(editor.minFromPlaceholder)}
                value={node.minFrom}
                onChange={(minFrom) => update({ minFrom })}
            />
            {asTracker && (
                <FormulaField
                    label={settingLabel('maxMinFrom')}
                    setting="maxMinFrom"
                    placeholder={t(editor.minFromPlaceholder)}
                    value={node.maxMinFrom}
                    onChange={(maxMinFrom) => update({ maxMinFrom })}
                />
            )}
            <FormulaField
                label={settingLabel('maxFrom')}
                setting="maxFrom"
                placeholder={t(editor.maxFromPlaceholder)}
                value={node.maxFrom}
                onChange={(maxFrom) => update({ maxFrom })}
            />
        </>
    ) : null;

    const look = (
        <>
            {pool && (
                <div
                    role="group"
                    aria-label={t(editor.primitiveDisplay)}
                    className="flex flex-wrap items-center gap-1 text-xs text-textSecondary"
                >
                    <span className="font-semibold text-textPrimary">
                        {t(editor.primitiveDisplay)}
                    </span>
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
                <ToggleRow
                    checked={node.compact}
                    label={settingLabel('compact')}
                    setting="compact"
                    onChange={(compact) => update({ compact })}
                />
            )}
            <ToggleRow
                checked={!node.hideLabel}
                label={settingLabel('hideLabel')}
                setting="hideLabel"
                onChange={(checked) => update({ hideLabel: checked ? undefined : true })}
            />
            {asTracker && node.poolTracker && (
                <div data-setting-list="" data-setting="tracker" tabIndex={-1}>
                    <PoolTrackerSettings
                        value={node.poolTracker}
                        onChange={(poolTracker) => update({ poolTracker })}
                    />
                </div>
            )}
            {descriptor?.kind === 'track' && (
                <div data-setting-list="" data-setting="tracker" tabIndex={-1}>
                    <TrackerSettings
                        {...builtInSettings(node, descriptor, () => update({ track: undefined }))}
                        onChange={(change) =>
                            update(builtInSettingsUpdate(node, descriptor, change))
                        }
                    />
                </div>
            )}
        </>
    );

    const visibility = hasTermHint(node) ? (
        <TermHintControl node={node} onChange={(termHint) => update({ termHint })} />
    ) : null;

    return { content, value, limits, look, visibility };
}
