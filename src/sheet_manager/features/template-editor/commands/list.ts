import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { rememberedCopy } from '../clipboard';
import { canRedo, canUndo } from '../history';
import type { MoveCommand } from '../moveTargets';
import {
    canMoveSelection,
    duplicateSelection,
    moveSelection,
    removeSelection,
} from '../operations/selection';
import { EMPTY_SELECTION } from '../selection';
import type { EditorSession } from '../session/store';
import type { EditorShortcut } from './keys';

const editor = uiMessages.sheet.templates.editor;

interface MessageDescriptor {
    id: string;
    message: string;
}

export type EditorCommandId =
    | EditorShortcut
    | 'cut'
    | 'copy'
    | 'paste'
    | 'add-to-selection'
    | 'toggle-selection'
    | 'range-selection'
    | 'clear-selection'
    | 'shortcuts';

export type CommandGroup = 'edit' | 'selection' | 'arrange' | 'history';

/** A physical key (`KeyboardEvent.code`) with exactly these modifiers; `mod` is Ctrl or ⌘. */
export interface KeyBinding {
    code: string;
    mod?: boolean;
    shift?: boolean;
    alt?: boolean;
    /** Only on Apple platforms (⌫ removes there; their keyboards often lack Delete). */
    apple?: boolean;
}

export interface EditorCommand {
    id: EditorCommandId;
    group: CommandGroup;
    label: MessageDescriptor;
    keys?: readonly KeyBinding[];
    /** A character shortcut that follows the layout ("?" is Shift+/ or Shift+7). */
    character?: string;
    /** Bound to the browser's clipboard event of the same name (research R2). */
    clipboard?: 'copy' | 'cut' | 'paste';
    /** A mouse binding, listed in the shortcut list and the guide. */
    pointer?: 'toggle' | 'range';
    /** Acts while the author types in a text box (Ctrl+D must never bookmark the page). */
    whileTyping?: boolean;
    inMenu?: boolean;
    touchOnly?: boolean;
    /** What the command does (spec 025, D7); pointer and touch commands act through clicks. */
    run?(context: CommandContext): void;
    /** Whether it can act on `ids` now; keys skip it and menus disable it otherwise. */
    enabled?(context: CommandContext, ids: readonly string[]): boolean;
}

/** What commands act on: the session and the editor's clipboard and shortcut list. */
export interface CommandContext {
    session: EditorSession;
    /** Copy, cut, or paste elements; false when there is nothing to do. */
    clipboard(action: 'copy' | 'cut' | 'paste'): boolean;
    openShortcuts(): void;
}

const anySelected = (_: CommandContext, ids: readonly string[]) => ids.length > 0;

function move(command: MoveCommand): Pick<EditorCommand, 'run' | 'enabled'> {
    return {
        run: ({ session }) => session.run(moveSelection(command)),
        enabled: ({ session }, ids) => canMoveSelection(session.draft(), ids, command),
    };
}

/**
 * Every editor action, once: the keyboard matcher, the context menu, the shortcut list, and the
 * guide's table all read this list (spec 023, FR-016).
 */
export const EDITOR_COMMANDS: readonly EditorCommand[] = [
    {
        id: 'cut',
        group: 'edit',
        label: editor.cmdCut,
        clipboard: 'cut',
        inMenu: true,
        run: (context) => context.clipboard('cut'),
        enabled: anySelected,
    },
    {
        id: 'copy',
        group: 'edit',
        label: editor.cmdCopy,
        clipboard: 'copy',
        inMenu: true,
        run: (context) => context.clipboard('copy'),
        enabled: anySelected,
    },
    {
        id: 'paste',
        group: 'edit',
        label: editor.cmdPaste,
        clipboard: 'paste',
        inMenu: true,
        run: (context) => context.clipboard('paste'),
        enabled: () => rememberedCopy() !== undefined,
    },
    {
        id: 'duplicate',
        group: 'edit',
        label: editor.duplicate,
        keys: [{ code: 'KeyD', mod: true }],
        whileTyping: true,
        inMenu: true,
        run: ({ session }) => session.run(duplicateSelection),
        enabled: anySelected,
    },
    {
        id: 'delete',
        group: 'edit',
        label: editor.remove,
        keys: [{ code: 'Delete' }, { code: 'Backspace', apple: true }],
        inMenu: true,
        run: ({ session }) => session.run(removeSelection),
        enabled: anySelected,
    },
    {
        id: 'shortcuts',
        group: 'edit',
        label: editor.cmdShortcuts,
        character: '?',
        run: (context) => context.openShortcuts(),
    },
    {
        id: 'toggle-selection',
        group: 'selection',
        label: editor.cmdToggleSelection,
        pointer: 'toggle',
    },
    {
        id: 'range-selection',
        group: 'selection',
        label: editor.cmdRangeSelection,
        pointer: 'range',
    },
    {
        id: 'add-to-selection',
        group: 'selection',
        label: editor.cmdAddToSelection,
        inMenu: true,
        touchOnly: true,
    },
    {
        id: 'clear-selection',
        group: 'selection',
        label: editor.cmdClearSelection,
        keys: [{ code: 'Escape' }],
        run: ({ session }) => session.select(EMPTY_SELECTION),
        enabled: anySelected,
    },
    {
        id: 'move-up',
        group: 'arrange',
        label: editor.moveUp,
        keys: [{ code: 'ArrowUp', alt: true }],
        inMenu: true,
        ...move('move-up'),
    },
    {
        id: 'move-down',
        group: 'arrange',
        label: editor.moveDown,
        keys: [{ code: 'ArrowDown', alt: true }],
        inMenu: true,
        ...move('move-down'),
    },
    {
        id: 'move-out',
        group: 'arrange',
        label: editor.moveOut,
        keys: [{ code: 'ArrowLeft', alt: true }],
        inMenu: true,
        ...move('move-out'),
    },
    {
        id: 'move-in',
        group: 'arrange',
        label: editor.moveIn,
        keys: [{ code: 'ArrowRight', alt: true }],
        inMenu: true,
        ...move('move-in'),
    },
    {
        id: 'column-prev',
        group: 'arrange',
        label: editor.cmdColumnPrev,
        keys: [{ code: 'ArrowLeft', alt: true, shift: true }],
        ...move('column-prev'),
    },
    {
        id: 'column-next',
        group: 'arrange',
        label: editor.cmdColumnNext,
        keys: [{ code: 'ArrowRight', alt: true, shift: true }],
        ...move('column-next'),
    },
    {
        id: 'undo',
        group: 'history',
        label: editor.undo,
        keys: [{ code: 'KeyZ', mod: true }],
        run: ({ session }) => session.undo(),
        enabled: ({ session }) => canUndo(session.store.getState().history),
    },
    {
        id: 'redo',
        group: 'history',
        label: editor.redo,
        keys: [
            { code: 'KeyZ', mod: true, shift: true },
            { code: 'KeyY', mod: true },
        ],
        run: ({ session }) => session.redo(),
        enabled: ({ session }) => canRedo(session.store.getState().history),
    },
];

export const COMMAND_GROUPS: readonly CommandGroup[] = ['edit', 'selection', 'arrange', 'history'];

export const COMMAND_GROUP_LABELS: Record<CommandGroup, MessageDescriptor> = {
    edit: editor.cmdGroupEdit,
    selection: editor.cmdGroupSelection,
    arrange: editor.cmdGroupArrange,
    history: editor.cmdGroupHistory,
};

export function commandById(id: EditorCommandId): EditorCommand {
    return EDITOR_COMMANDS.find((command) => command.id === id)!;
}

/** Apple platforms show ⌘ ⌥ ⇧ and remove with ⌫. */
export function isApplePlatform(): boolean {
    if (typeof navigator === 'undefined') return false;
    const platform =
        (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
            ?.platform ?? navigator.platform;
    return /mac|iphone|ipad|ipod/i.test(platform ?? '');
}

const KEY_NAMES: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Delete: 'Delete',
    Backspace: '⌫',
    Escape: 'Esc',
};

const CLIPBOARD_CODES = { copy: 'KeyC', cut: 'KeyX', paste: 'KeyV' } as const;

function keyName(code: string): string {
    return KEY_NAMES[code] ?? code.replace(/^Key|^Digit/, '');
}

function formatBinding(binding: KeyBinding, apple: boolean): string {
    const key = keyName(binding.code);
    if (apple) {
        return `${binding.alt ? '⌥' : ''}${binding.shift ? '⇧' : ''}${binding.mod ? '⌘' : ''}${
            binding.code === 'Delete' ? '⌦' : key
        }`;
    }
    return [binding.mod && 'Ctrl', binding.alt && 'Alt', binding.shift && 'Shift', key]
        .filter(Boolean)
        .join('+');
}

/**
 * The key combinations of a command in the platform's notation, one string per alternative;
 * pointer bindings need the word for a click (`clickWord`).
 */
export function formatKeys(
    command: EditorCommand,
    { apple, clickWord }: { apple: boolean; clickWord: string }
): string[] {
    if (command.clipboard) {
        return [formatBinding({ code: CLIPBOARD_CODES[command.clipboard], mod: true }, apple)];
    }
    if (command.character) return [command.character];
    if (command.pointer) {
        const modifier =
            command.pointer === 'range' ? (apple ? '⇧' : 'Shift') : apple ? '⌘' : 'Ctrl';
        return [apple ? `${modifier}${clickWord}` : `${modifier}+${clickWord}`];
    }
    return (command.keys ?? [])
        .filter((binding) => binding.apple === undefined || binding.apple === apple)
        .map((binding) => formatBinding(binding, apple));
}

/** The clipboard command of a Ctrl/⌘+C, X, or V press (the WebKit fallback, research R2). */
export function clipboardKey(
    event: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>
): 'copy' | 'cut' | 'paste' | null {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return null;
    for (const [action, code] of Object.entries(CLIPBOARD_CODES)) {
        if (event.code === code) return action as 'copy' | 'cut' | 'paste';
    }
    return null;
}
