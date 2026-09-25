import { useEffect, useRef } from 'react';

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

/**
 * Matches physical keys (`KeyboardEvent.code`), never `key`: with a Cyrillic layout Ctrl+Z
 * produces «я», and shortcuts must not depend on the active layout. While the author types in
 * a field, text-editing keys (undo/redo/delete, word-jumping Alt+arrows) belong to the field.
 */
export function matchEditorShortcut(
    event: ShortcutKeyEvent,
    { typing }: { typing: boolean }
): EditorShortcut | null {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && !event.altKey) {
        if (event.code === 'KeyZ') return typing ? null : event.shiftKey ? 'redo' : 'undo';
        if (event.code === 'KeyY') return typing ? null : 'redo';
        if (event.code === 'KeyD' && !event.shiftKey) return 'duplicate';
        return null;
    }
    if (typing) return null;
    if (event.altKey && !mod) {
        switch (event.code) {
            case 'ArrowUp':
                return event.shiftKey ? null : 'move-up';
            case 'ArrowDown':
                return event.shiftKey ? null : 'move-down';
            case 'ArrowLeft':
                return event.shiftKey ? 'column-prev' : 'move-out';
            case 'ArrowRight':
                return event.shiftKey ? 'column-next' : 'move-in';
            default:
                return null;
        }
    }
    if (!event.altKey && !event.shiftKey && event.code === 'Delete') return 'delete';
    return null;
}

function isTypingTarget(target: EventTarget | null): boolean {
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
            const shortcut = matchEditorShortcut(event, { typing: isTypingTarget(event.target) });
            const handler = shortcut ? handlersRef.current[shortcut] : undefined;
            if (!handler) return;
            event.preventDefault();
            handler();
        };
        element.addEventListener('keydown', onKeyDown);
        return () => element.removeEventListener('keydown', onKeyDown);
    }, [element]);
}
