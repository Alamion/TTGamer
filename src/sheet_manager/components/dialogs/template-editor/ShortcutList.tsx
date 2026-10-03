import { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { X } from 'lucide-react';

import {
    COMMAND_GROUP_LABELS,
    COMMAND_GROUPS,
    EDITOR_COMMANDS,
    type EditorCommand,
    formatKeys,
    isApplePlatform,
} from './commands';

const editor = uiMessages.sheet.templates.editor;

/** Commands with a key, a clipboard key, a click, or a character: the rows of the list. */
export function listedCommands(): EditorCommand[] {
    return EDITOR_COMMANDS.filter(
        (command) => command.keys || command.clipboard || command.pointer || command.character
    );
}

/**
 * Every editor shortcut, grouped, in the platform's notation (spec 023, US5). The rows come from
 * the command registry, so the list matches what the editor reacts to.
 */
export function ShortcutList({
    onOpenChange,
    open,
}: {
    onOpenChange: (open: boolean) => void;
    open: boolean;
}) {
    const apple = isApplePlatform();
    const clickWord = translate(editor.keyClick);
    const commands = listedCommands();
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal container={document.getElementById('modal-root') ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 z-[10000] bg-black/40" />
                <Dialog.Content
                    data-shortcut-list=""
                    className="fixed left-1/2 top-1/2 z-[10001] max-h-[85vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-bgSurface p-4 shadow-xl focus:outline-none"
                >
                    <div className="mb-3 flex items-center gap-2">
                        <Dialog.Title className="mr-auto text-base font-semibold text-textPrimary">
                            {translate(editor.cmdShortcuts)}
                        </Dialog.Title>
                        <Dialog.Close
                            aria-label={translate(editor.closeShortcuts)}
                            className="rounded p-1 text-textSecondary hover:text-textPrimary"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </Dialog.Close>
                    </div>
                    <Dialog.Description className="sr-only">
                        {translate(editor.cmdShortcuts)}
                    </Dialog.Description>
                    <div className="grid gap-4">
                        {COMMAND_GROUPS.map((group) => {
                            const rows = commands.filter((command) => command.group === group);
                            if (rows.length === 0) return null;
                            return (
                                <table key={group} className="w-full text-sm">
                                    <caption className="pb-1 text-left text-[11px] font-bold uppercase tracking-wider text-textSecondary">
                                        {translate(COMMAND_GROUP_LABELS[group])}
                                    </caption>
                                    <thead className="sr-only">
                                        <tr>
                                            <th scope="col">{translate(editor.shortcutKeys)}</th>
                                            <th scope="col">{translate(editor.shortcutAction)}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((command) => (
                                            <tr
                                                key={command.id}
                                                data-command={command.id}
                                                className="border-t border-border"
                                            >
                                                <td className="w-2/5 py-1 pr-3">
                                                    {formatKeys(command, { apple, clickWord }).map(
                                                        (keys, index) => (
                                                            <span key={keys}>
                                                                {index > 0 && ' / '}
                                                                <kbd className="rounded border border-border bg-bgBase px-1 font-sans text-xs">
                                                                    {keys}
                                                                </kbd>
                                                            </span>
                                                        )
                                                    )}
                                                </td>
                                                <td className="py-1 text-textPrimary">
                                                    {translate(command.label)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            );
                        })}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
