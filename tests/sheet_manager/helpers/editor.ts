import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { fireEvent } from '@testing-library/react';

/** Empties every store the editor reads, so a test starts from a known library. */
export function resetEditorStores(): void {
    useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });
    useDocumentStore.setState({ documents: [], currentDocumentId: null });
}

interface ShortcutOptions {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    /** The character the active layout produces; defaults to the Latin letter of `code`. */
    key?: string;
}

/**
 * Fires a keydown the way a real keyboard does: `code` names the physical key and `key` the
 * layout's character, so `{ code: 'KeyZ', key: 'я' }` simulates Ctrl+Z on a Russian layout.
 */
export function pressShortcut(target: Element, code: string, options: ShortcutOptions = {}) {
    const latin = code.startsWith('Key') ? code.slice(3).toLowerCase() : code;
    return fireEvent.keyDown(target, {
        code,
        key: options.key ?? latin,
        ctrlKey: options.ctrl ?? false,
        metaKey: options.meta ?? false,
        shiftKey: options.shift ?? false,
        altKey: options.alt ?? false,
        bubbles: true,
    });
}

/** jsdom has no PointerEvent; a MouseEvent with a pointer type is enough for the editor. */
function ensurePointerEvent(): void {
    if (typeof window.PointerEvent === 'function') return;
    class TestPointerEvent extends MouseEvent {
        pointerType: string;
        pointerId: number;
        constructor(type: string, init: PointerEventInit = {}) {
            super(type, init);
            this.pointerType = init.pointerType ?? 'mouse';
            this.pointerId = init.pointerId ?? 1;
        }
    }
    window.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
}

const FAR = { left: 0, right: 10, top: 10_000, bottom: 10_002 };
const TARGET = { left: 0, right: 10, top: 100, bottom: 102 };
const DROP_POINT = { clientX: 5, clientY: 101 };

function stubRect(element: Element, rect: typeof FAR): void {
    Object.defineProperty(element, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ ...rect, x: rect.left, y: rect.top, width: 10, height: 2, toJSON() {} }),
    });
}

/** The grip of a node on a surface (page frames or outline rows). */
function gripOf(nodeId: string, surface: 'page' | 'outline'): Element {
    const grip = document.querySelector(
        `[data-testid="${surface === 'page' ? 'page-grip' : 'grip'}-${nodeId}"]`
    );
    if (!grip) throw new Error(`No ${surface} grip for ${nodeId}`);
    return grip;
}

/** Presses a node's grip (mouse, primary button). */
export function startDrag(nodeId: string, surface: 'page' | 'outline' = 'page'): void {
    ensurePointerEvent();
    fireEvent.pointerDown(gripOf(nodeId, surface), {
        button: 0,
        pointerType: 'mouse',
        clientX: 0,
        clientY: 0,
    });
}

/**
 * Moves the pointer onto `target`: jsdom has no layout, so the target slot is placed under the
 * pointer and every other slot of its surface far below (containers keep empty rectangles).
 */
export function dragOver(target: Element): void {
    const outline = target.hasAttribute('data-outline-slot');
    const slots = document.querySelectorAll(outline ? '[data-outline-slot]' : '[data-insert-slot]');
    for (const slot of slots) stubRect(slot, slot === target ? TARGET : FAR);
    fireEvent.pointerMove(window, { pointerType: 'mouse', ...DROP_POINT });
}

export function releaseDrag(): void {
    fireEvent.pointerUp(window, { pointerType: 'mouse', ...DROP_POINT });
}

/** Drags a node (by id) onto a slot of the page or the outline and releases it there. */
export function dragNode(nodeId: string, target: Element): void {
    startDrag(nodeId, target.hasAttribute('data-outline-slot') ? 'outline' : 'page');
    dragOver(target);
    releaseDrag();
}

/**
 * Opens the settings groups that start closed (Look, Visibility and help; spec 022). The open
 * state lasts for the dialog session, so later selections keep them open.
 */
export function openSettingsGroups(): void {
    for (const button of document.querySelectorAll<HTMLButtonElement>(
        '[data-settings-group] > button[aria-expanded="false"]'
    )) {
        fireEvent.click(button);
    }
}
