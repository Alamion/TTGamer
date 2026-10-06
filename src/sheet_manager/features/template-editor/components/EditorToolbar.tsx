import { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { Keyboard, Redo2, Undo2 } from 'lucide-react';

import { commandById, type CommandContext } from '../commands/list';
import { useEditorState } from '../session/context';
import { EditorHelp } from './EditorHelp';

const editor = uiMessages.sheet.templates.editor;

export type EditorMode = 'edit' | 'preview';

const toolbarButton =
    'flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-textSecondary hover:bg-bgBase hover:text-textPrimary disabled:opacity-40';

/** Undo or redo from the command list (spec 025, D7). */
function HistoryButton({
    commands,
    disabled,
    id,
}: {
    commands: CommandContext;
    disabled: boolean;
    id: 'undo' | 'redo';
}) {
    const command = commandById(id);
    // Re-render when the history changes, so the button follows `enabled`.
    useEditorState((state) => state.history);
    const enabled = command.enabled?.(commands, commands.session.selection().ids) ?? true;
    const Icon = id === 'undo' ? Undo2 : Redo2;
    return (
        <button
            type="button"
            onClick={() => command.run?.(commands)}
            disabled={disabled || !enabled}
            aria-label={translate(command.label)}
            title={translate(command.label)}
            className={toolbarButton}
        >
            <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
    );
}

/** The dialog's title row: the page name, the edit/preview switch, help, and history. */
export function EditorToolbar({
    commands,
    mode,
    name,
    onModeChange,
}: {
    commands: CommandContext;
    mode: EditorMode;
    name: string;
    onModeChange: (mode: EditorMode) => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <Dialog.Title className="mr-auto min-w-0 truncate text-lg font-semibold text-textPrimary">
                {name.trim().length > 0 ? name : translate(editor.untitledName)}
            </Dialog.Title>
            <div
                role="group"
                aria-label={translate(editor.modeLabel)}
                className="flex overflow-hidden rounded border border-border"
            >
                {(['edit', 'preview'] as const).map((value) => (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={mode === value}
                        onClick={() => onModeChange(value)}
                        className={clsx(
                            'px-3 py-1 text-sm',
                            mode === value
                                ? 'bg-primary-muted text-white'
                                : 'text-textSecondary hover:bg-bgBase'
                        )}
                    >
                        {translate(value === 'edit' ? editor.modeEdit : editor.modePreview)}
                    </button>
                ))}
            </div>
            <EditorHelp topic="overview" about={translate(editor.guide)} />
            <button
                type="button"
                onClick={() => commands.openShortcuts()}
                aria-label={translate(editor.cmdShortcuts)}
                aria-keyshortcuts="?"
                title={translate(editor.cmdShortcuts)}
                className={toolbarButton}
            >
                <Keyboard className="h-4 w-4" aria-hidden="true" />
            </button>
            <HistoryButton commands={commands} disabled={mode !== 'edit'} id="undo" />
            <HistoryButton commands={commands} disabled={mode !== 'edit'} id="redo" />
        </div>
    );
}
