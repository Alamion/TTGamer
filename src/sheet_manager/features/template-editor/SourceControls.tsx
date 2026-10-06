import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { TrackBinding } from '../../systems/templateBindings';
import type {
    ListNode,
    PrimitiveNode,
    TemplateField,
    TemplateNode,
    TrackerField,
} from '../../types/template';
import { useEditorModel } from './EditorModel';
import { inputClasses } from './settings/inputClasses';
import { SettingField } from './settings/SettingField';
import {
    currentListSource,
    currentTrackerSource,
    currentValueSource,
    CUSTOM_SOURCE,
    fieldFromSource,
    isListSource,
    isValueSource,
    listFromSource,
    trackerFromSource,
} from './sourceNodes';

const editor = uiMessages.sheet.templates.editor;

const t = (descriptor: { message: string }) => translate(descriptor);

/**
 * "Stores value in": a custom template value or a character-sheet value. Choosing a sheet value
 * rebuilds the element in the shape it needs, so authors never pick binding keys by hand.
 */
export function ValueSourceSelect({
    node,
    onReplace,
    setting = 'source',
}: {
    node: TemplateField | PrimitiveNode;
    onReplace: (nodeId: string, next: TemplateNode) => void;
    setting?: string;
}) {
    const { bindings } = useEditorModel();
    const sources = bindings.filter(isValueSource);
    const current = currentValueSource(node, bindings);
    const groups = [
        { label: t(editor.sourceTraits), kind: 'trait' },
        { label: t(editor.sourceResources), kind: 'resource' },
        { label: t(editor.sourceDetails), kind: 'field' },
    ] as const;

    return (
        <SettingField label={t(editor.valueSource)} help="valueSource" setting={setting}>
            {(control) => (
                <select
                    {...control}
                    value={current}
                    onChange={(event) => {
                        const source = sources.find(({ key }) => key === event.target.value);
                        onReplace(node.id, fieldFromSource(node, source));
                    }}
                    className={`${inputClasses} w-full`}
                >
                    <option value={CUSTOM_SOURCE}>{t(editor.sourceCustom)}</option>
                    {groups.map((group) => {
                        const options = sources.filter(({ kind }) => kind === group.kind);
                        return options.length > 0 ? (
                            <optgroup key={group.kind} label={group.label}>
                                {options.map((source) => (
                                    <option key={source.key} value={source.key}>
                                        {source.label}
                                    </option>
                                ))}
                            </optgroup>
                        ) : null;
                    })}
                </select>
            )}
        </SettingField>
    );
}

/** "Entries": custom entries, a character list, or an equipment section. */
export function ListSourceSelect({
    node,
    onReplace,
    setting = 'source',
}: {
    node: ListNode | PrimitiveNode;
    onReplace: (nodeId: string, next: TemplateNode) => void;
    setting?: string;
}) {
    const { bindings } = useEditorModel();
    const sources = bindings.filter(isListSource);
    const groups = [
        { label: t(editor.listSourceSystem), kind: 'list' },
        { label: t(editor.listSourceEquipment), kind: 'equipment' },
    ] as const;

    return (
        <SettingField label={t(editor.listSource)} setting={setting}>
            {(control) => (
                <select
                    {...control}
                    value={currentListSource(node)}
                    onChange={(event) => {
                        const source = sources.find(({ key }) => key === event.target.value);
                        onReplace(node.id, listFromSource(node, source));
                    }}
                    className={`${inputClasses} w-full`}
                >
                    <option value={CUSTOM_SOURCE}>{t(editor.listSourceCustom)}</option>
                    {groups.map((group) => {
                        const options = sources.filter(({ kind }) => kind === group.kind);
                        return options.length > 0 ? (
                            <optgroup key={group.kind} label={group.label}>
                                {options.map((source) => (
                                    <option key={source.key} value={source.key}>
                                        {source.label}
                                    </option>
                                ))}
                            </optgroup>
                        ) : null;
                    })}
                </select>
            )}
        </SettingField>
    );
}

/** A tracker's Source (spec 018): its own values, or one of the page's built-in tracks. */
export function TrackerSourceSelect({
    node,
    onReplace,
    setting = 'source',
}: {
    node: TrackerField | PrimitiveNode;
    onReplace: (nodeId: string, next: TemplateNode) => void;
    setting?: string;
}) {
    const { bindings } = useEditorModel();
    const tracks = bindings.filter((binding): binding is TrackBinding => binding.kind === 'track');
    const label = t(uiMessages.sheet.templates.tracker.source);
    return (
        <SettingField label={label} setting={setting}>
            {(control) => (
                <select
                    {...control}
                    value={currentTrackerSource(node)}
                    onChange={(event) => {
                        const source = tracks.find(({ key }) => key === event.target.value);
                        onReplace(node.id, trackerFromSource(node, source));
                    }}
                    className={`${inputClasses} w-full`}
                >
                    <option value={CUSTOM_SOURCE}>
                        {t(uiMessages.sheet.templates.tracker.sourceOwn)}
                    </option>
                    {tracks.map((track) => (
                        <option key={track.key} value={track.key}>
                            {track.label}
                        </option>
                    ))}
                </select>
            )}
        </SettingField>
    );
}
