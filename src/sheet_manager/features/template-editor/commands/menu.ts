import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { EditorMenuSource, MenuCommand } from '../EditorContextMenu';
import { EMPTY_SELECTION, selectOnly } from '../selection';
import { selectNode } from '../session/actions';
import {
    commandById,
    type CommandContext,
    type EditorCommandId,
    formatKeys,
    isApplePlatform,
} from './list';

const editor = uiMessages.sheet.templates.editor;

/** The element menu in display order; Delete sits apart at the end. */
const MENU_ORDER: readonly EditorCommandId[] = [
    'cut',
    'copy',
    'paste',
    'duplicate',
    'add-to-selection',
    'move-up',
    'move-down',
    'move-out',
    'move-in',
    'delete',
];

/**
 * The element menu (spec 023, US4) built from the command list (spec 025, D7): each entry is
 * disabled for the same reason its keys do nothing.
 */
export function createMenuSource(context: CommandContext): Omit<EditorMenuSource, 'dragging'> {
    const { session } = context;
    const keysOf = (id: EditorCommandId) => {
        const keys = formatKeys(commandById(id), {
            apple: isApplePlatform(),
            clickWord: translate(editor.keyClick),
        });
        return keys.join(', ') || undefined;
    };
    const entry = (
        id: EditorCommandId,
        ids: readonly string[],
        run: () => void,
        label: string = translate(commandById(id).label)
    ): MenuCommand => {
        const command = commandById(id);
        return {
            id,
            group: id === 'delete' ? 'remove' : command.group,
            label,
            keys: keysOf(id),
            disabled: command.enabled ? !command.enabled(context, ids) : false,
            run,
        };
    };
    return {
        prepare: (targetId, touch) => {
            const { ids } = session.selection();
            if (targetId === null) session.select(EMPTY_SELECTION);
            else if (!ids.includes(targetId) && !(touch && ids.length > 0)) {
                session.select(selectOnly(targetId));
            }
        },
        items: (targetId, touch) => {
            const paste = commandById('paste');
            if (targetId === null) {
                return [
                    entry('paste', [], () => paste.run!(context), translate(editor.cmdPasteAtEnd)),
                ];
            }
            const { ids: chosen } = session.selection();
            const inSelection = chosen.includes(targetId);
            // A touch menu on an element outside the kept selection acts on that element.
            const ids = inSelection ? chosen : [targetId];
            const focused = (id: EditorCommandId) => () => {
                if (!inSelection) session.select(selectOnly(targetId));
                commandById(id).run!(context);
            };
            return MENU_ORDER.flatMap((id): MenuCommand[] => {
                if (id === 'add-to-selection') {
                    if (!touch) return [];
                    const label =
                        inSelection && chosen.length > 1
                            ? editor.cmdRemoveFromSelection
                            : editor.cmdAddToSelection;
                    return [
                        entry(
                            id,
                            ids,
                            () => selectNode(session, targetId, undefined, 'toggle'),
                            translate(label)
                        ),
                    ];
                }
                return [entry(id, ids, focused(id))];
            });
        },
    };
}
