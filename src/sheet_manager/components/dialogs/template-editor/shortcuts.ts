import { useEffect, useRef } from 'react';

import { EDITOR_COMMANDS, isApplePlatform } from './commands';

export type EditorShortcut =
    | 'undo'
    | 'redo'
    | 'duplicate'
    | 'delete'
    | 'move-up'
    | 'move-down'
    | 'move-out'
    | 'move-in'
    | 'column-prev'
    | 'column-next';

type ShortcutKeyEvent = Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

const SHORTCUT_IDS = new Set<string>([
    'undo',
    'redo',
    'duplicate',
    'delete',
    'move-up',
    'move-down',
    'move-out',
    'move-in',
    'column-prev',
    'column-next',
]);

/**
 * Matches physical keys (`KeyboardEvent.code`), never `key`: with a Cyrillic layout Ctrl+Z
 * produces «я», and shortcuts must not depend on the active layout. While the author types in
 * a field, text-editing keys (undo/redo/delete, word-jumping Alt+arrows) belong to the field.
 * The bindings come from the command registry (`commands.ts`).
 */
export function matchEditorShortcut(
    event: ShortcutKeyEvent,
    { typing, apple = false }: { typing: boolean; apple?: boolean }
): EditorShortcut | null {
    const mod = event.ctrlKey || event.metaKey;
    for (const command of EDITOR_COMMANDS) {
        if (!SHORTCUT_IDS.has(command.id) || (typing && !command.whileTyping)) continue;
        const hit = command.keys?.some(
            (binding) =>
                (binding.apple === undefined || binding.apple === apple) &&
                binding.code === event.code &&
                Boolean(binding.mod) === mod &&
                Boolean(binding.shift) === event.shiftKey &&
                Boolean(binding.alt) === event.altKey
        );
        if (hit) return command.id as EditorShortcut;
    }
    return null;
}

export function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    return target.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

export type EditorShortcutHandlers = Partial<Record<EditorShortcut, () => void>>;

/**
 * Listens on the editor's own element (not `document`), so the shortcuts never fire behind
 * another dialog; a handled key is `preventDefault`ed so Ctrl+D never bookmarks the page. The
 * element comes from a callback ref: portalled dialog content mounts after the first render.
 */
export function useEditorShortcuts(
    element: HTMLElement | null,
    handlers: EditorShortcutHandlers
): void {
    const handlersRef = useRef(handlers);
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        if (!element) return;
        const onKeyDown = (event: KeyboardEvent) => {
            const shortcut = matchEditorShortcut(event, {
                typing: isTypingTarget(event.target),
                apple: isApplePlatform(),
            });
            const handler = shortcut ? handlersRef.current[shortcut] : undefined;
            if (!handler) return;
            event.preventDefault();
            handler();
        };
        element.addEventListener('keydown', onKeyDown);
        return () => element.removeEventListener('keydown', onKeyDown);
    }, [element]);
}
