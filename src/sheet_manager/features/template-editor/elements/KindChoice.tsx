import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { TemplateNode } from '../../../types/template';
import { elementKind, type GroupKind, type ListKind } from '../elementKinds';
import { KIND_NAMES } from './registry';

const editor = uiMessages.sheet.templates.editor;

const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
    translate(descriptor, values);

/** The kind of a group or list (spec 022, US6), a radio group in Content. */
export function KindChoice({
    blocked,
    node,
    onSwitch,
}: {
    blocked?: string;
    node: TemplateNode;
    onSwitch: (kind: GroupKind | ListKind) => void;
}) {
    const current = elementKind(node);
    if (!current) return null;
    const options =
        current.element === 'group'
            ? ([
                  ['section', editor.kindSectionHint],
                  ['card', editor.kindCardHint],
              ] as const)
            : ([
                  ['entries', editor.kindEntriesHint],
                  ['table', editor.kindTableHint],
              ] as const);
    return (
        <fieldset className="grid gap-1" data-setting="kind" tabIndex={-1}>
            <legend className="mb-1 text-xs font-semibold text-textPrimary">
                {t(editor.kind)}
            </legend>
            {options.map(([kind, hint]) => {
                const disabled = kind === 'table' && blocked !== undefined;
                return (
                    <label
                        key={kind}
                        className={`flex items-start gap-2 rounded border border-border px-2 py-1.5 text-xs has-[:checked]:border-primary ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
                    >
                        <input
                            type="radio"
                            name={`kind-${node.id}`}
                            checked={current.kind === kind}
                            disabled={disabled}
                            onChange={() => onSwitch(kind)}
                            className="mt-0.5"
                        />
                        <span className="grid">
                            <span className="font-semibold text-textPrimary">
                                {t(KIND_NAMES[kind])}
                            </span>
                            <span className="text-textSecondary">
                                {disabled ? blocked : t(hint)}
                            </span>
                        </span>
                    </label>
                );
            })}
        </fieldset>
    );
}
