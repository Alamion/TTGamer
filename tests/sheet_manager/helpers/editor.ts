import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { fireEvent } from '@testing-library/react';

export const NODE_MIME = 'application/x-ttgamer-template-node';

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

/** A `DataTransfer` stand-in carrying a dragged template node id. */
export function nodeDataTransfer(nodeId: string) {
    return {
        types: [NODE_MIME],
        getData: (type: string) => (type === NODE_MIME ? nodeId : ''),
        setData: () => undefined,
        dropEffect: 'none',
        effectAllowed: 'move',
    };
}

/** Drags a node (by id) onto a drop target: dragOver then drop, as the browser does. */
export function dragNode(nodeId: string, target: Element): void {
    const dataTransfer = nodeDataTransfer(nodeId);
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });
}
