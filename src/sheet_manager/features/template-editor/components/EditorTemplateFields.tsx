import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import {
    listTemplateTargetGroups,
    parseTemplateTargetValue,
    templateTargetValue,
} from '../../sheet/data/documentLabels';
import { describeDraft, setDraftTarget } from '../model/page';
import { type EditorDraft } from '../model/types';
import { useEditorSession } from '../session/context';
import { inputClasses } from '../settings/inputClasses';
import { EditorHelp } from './EditorHelp';

const editor = uiMessages.sheet.templates.editor;

/** The page's own name, place (type or setting), and description. */
export function EditorTemplateFields({
    draft,
    targetFixed,
}: {
    draft: EditorDraft;
    /** Defaults and pages whose place the caller owns cannot move. */
    targetFixed: boolean;
}) {
    const session = useEditorSession();
    const targetGroups = listTemplateTargetGroups();
    const targetValue = templateTargetValue(draft);
    const targetKnown = targetGroups.some(({ options }) =>
        options.some(({ value }) => value === targetValue)
    );
    return (
        <div className="border-b border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
                <input
                    value={draft.name}
                    onChange={(event) => {
                        const name = event.target.value;
                        session.change((current) => ({ ...current, name }), {
                            coalesceKey: 'template:name',
                        });
                    }}
                    placeholder={translate(editor.namePlaceholder)}
                    aria-label={translate(editor.name)}
                    className={`${inputClasses} min-w-0 flex-1 font-medium`}
                />
                <select
                    value={targetValue}
                    onChange={(event) => {
                        const target = parseTemplateTargetValue(event.target.value);
                        if (target) session.change((current) => setDraftTarget(current, target));
                    }}
                    disabled={targetFixed}
                    title={targetFixed ? translate(editor.targetLocked) : undefined}
                    aria-label={translate(editor.target)}
                    className={`${inputClasses} max-w-full`}
                >
                    {!targetKnown && <option value={targetValue}>{draft.documentKind}</option>}
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
                <EditorHelp topic="movingPage" about={translate(editor.target)} />
            </div>
            <input
                value={draft.description ?? ''}
                onChange={(event) => {
                    const description = event.target.value;
                    session.change((current) => describeDraft(current, description), {
                        coalesceKey: 'template:description',
                    });
                }}
                placeholder={translate(editor.descriptionPlaceholder)}
                aria-label={translate(editor.descriptionLabel)}
                className={`${inputClasses} mt-2 w-full`}
            />
        </div>
    );
}
