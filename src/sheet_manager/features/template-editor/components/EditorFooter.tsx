import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { DraftIssue } from '../issues/draftIssues';
import { useEditorState } from '../session/context';

const editor = uiMessages.sheet.templates.editor;

/** The issue list (each opens its setting), the screen-reader announcer, Cancel, and Save. */
export function EditorFooter({
    draftIssues,
    onCancel,
    onGoToIssue,
    onSave,
    saveDisabled,
}: {
    draftIssues: readonly DraftIssue[];
    onCancel: () => void;
    onGoToIssue: (issue: DraftIssue) => void;
    onSave: () => void;
    saveDisabled: boolean;
}) {
    const saveIssues = useEditorState((state) => state.saveIssues);
    const announcement = useEditorState((state) => state.announcement);
    const issues = [...draftIssues, ...saveIssues];
    return (
        <div className="border-t border-border p-3">
            <div role="alert" aria-live="polite">
                {issues.length > 0 && (
                    <ul className="mb-3 max-h-24 space-y-1 overflow-y-auto text-xs text-error">
                        {issues.map((issue, index) => (
                            <li key={index}>
                                {issue.nodeId ? (
                                    <button
                                        type="button"
                                        onClick={() => onGoToIssue(issue)}
                                        className="text-left underline decoration-dotted"
                                    >
                                        {issue.message}
                                    </button>
                                ) : (
                                    issue.message
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <p className="sr-only" aria-live="polite" data-editor-announcer="">
                {announcement}
            </p>
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-sm border border-border bg-bgSurface px-4 py-2 text-sm font-medium text-textSecondary hover:bg-bgBase"
                >
                    {translate(editor.cancel)}
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={saveDisabled}
                    className="rounded-sm border border-transparent bg-primary-muted px-4 py-2 text-sm font-medium text-white hover:bg-primary disabled:opacity-40"
                >
                    {translate(editor.save)}
                </button>
            </div>
        </div>
    );
}
