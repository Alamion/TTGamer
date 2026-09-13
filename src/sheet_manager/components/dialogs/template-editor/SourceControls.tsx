import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { ListNode, PrimitiveNode, TemplateField, TemplateNode } from '../../../types/template';
import { useEditorModel } from './EditorModel';
import {
    currentListSource,
    currentValueSource,
    CUSTOM_SOURCE,
    fieldFromSource,
    isListSource,
    isValueSource,
    listFromSource,
} from './sourceNodes';

const editor = uiMessages.sheet.templates.editor;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

const t = (descriptor: { message: string }) => translate(descriptor);

/**
 * "Stores value in": a custom template value or a character-sheet value. Choosing a sheet value
 * rebuilds the element in the shape it needs, so authors never pick binding keys by hand.
 */
export function ValueSourceSelect({
    node,
    onReplace,
}: {
    node: TemplateField | PrimitiveNode;
    onReplace: (nodeId: string, next: TemplateNode) => void;
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
        <label className="grid gap-1 text-xs text-textSecondary">
            {t(editor.valueSource)}
            <select
                value={current}
                onChange={(event) => {
                    const source = sources.find(({ key }) => key === event.target.value);
                    onReplace(node.id, fieldFromSource(node, source));
                }}
                aria-label={t(editor.valueSource)}
                className={inputClasses}
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
        </label>
    );
}

/** "Entries": custom entries, a character list, or an equipment section. */
export function ListSourceSelect({
    node,
    onReplace,
}: {
    node: ListNode | PrimitiveNode;
    onReplace: (nodeId: string, next: TemplateNode) => void;
}) {
    const { bindings } = useEditorModel();
    const sources = bindings.filter(isListSource);
    const groups = [
        { label: t(editor.listSourceSystem), kind: 'list' },
        { label: t(editor.listSourceEquipment), kind: 'equipment' },
    ] as const;

    return (
        <label className="grid gap-1 text-xs text-textSecondary">
            {t(editor.listSource)}
            <select
                value={currentListSource(node)}
                onChange={(event) => {
                    const source = sources.find(({ key }) => key === event.target.value);
                    onReplace(node.id, listFromSource(node, source));
                }}
                aria-label={t(editor.listSource)}
                className={inputClasses}
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
        </label>
    );
}
