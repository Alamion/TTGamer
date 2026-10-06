import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { findNodePosition } from '../draft';
import { insertAt, placeAt } from '../operations/structure';
import { rangeSelection, selectOnly, toggleInSelection } from '../selection';
import type { EditorActions, SelectMode } from './context';
import type { EditorSession } from './store';

const editor = uiMessages.sheet.templates.editor;

/** Scrolls an element into view, without motion when the reader asked for less. */
export function reveal(selector: string, block: ScrollLogicalPosition) {
    const element = document.querySelector(selector);
    const reduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element?.scrollIntoView?.({ block, behavior: reduced ? 'auto' : 'smooth' });
}

/** Opens folded groups around a node, outermost first, then scrolls it into view. */
export function revealNode(session: EditorSession, nodeId: string) {
    const chain: string[] = [];
    const current = session.draft();
    for (
        let parent = findNodePosition(current, nodeId)?.parentId ?? null;
        parent !== null;
        parent = findNodePosition(current, parent)?.parentId ?? null
    ) {
        chain.unshift(parent);
    }
    // The page renders the draft deferred: give it a moment before each level.
    const later = (run: () => void) => setTimeout(run, 16);
    const shown = () =>
        document.querySelector(`[data-editor-frame][data-node-id="${nodeId}"]`) !== null;
    const step = (index: number) => {
        if (index >= chain.length || shown()) {
            reveal(`[data-editor-frame][data-node-id="${nodeId}"]`, 'center');
            reveal(`[data-outline-row="${nodeId}"]`, 'nearest');
            return;
        }
        const frame = document.querySelector(`[data-editor-frame][data-node-id="${chain[index]}"]`);
        // A folded block's own header toggle, never a popup trigger (the "+" insert menus).
        const toggle = frame?.querySelector<HTMLElement>(
            'button[aria-expanded="false"]:not([aria-haspopup])'
        );
        if (toggle && toggle.closest('[data-editor-frame]') === frame) {
            // Opening the block must not select it: the page skips clicks while revealing.
            const page = toggle.closest('[data-editor-page]');
            page?.setAttribute('data-revealing', '');
            toggle.click();
            page?.removeAttribute('data-revealing');
        }
        later(() => step(index + 1));
    };
    later(() => step(0));
}

/** Selects by click mode and reveals the element in the other area. */
export function selectNode(
    session: EditorSession,
    nodeId: string | null,
    origin?: 'page' | 'outline',
    mode: SelectMode = 'only'
) {
    const before = session.selection();
    const next =
        nodeId === null || mode === 'only'
            ? selectOnly(nodeId)
            : mode === 'toggle'
              ? toggleInSelection(before, nodeId)
              : rangeSelection(session.draft(), before, nodeId);
    session.select(next);
    if (mode !== 'only' && next.ids.length !== before.ids.length) {
        const count = next.ids.length;
        session.announce({ message: editor.selectedCount, count, values: { count } });
    }
    if (!nodeId || !next.ids.includes(nodeId)) return;
    if (origin === 'page') reveal(`[data-outline-row="${nodeId}"]`, 'nearest');
    if (origin === 'outline') reveal(`[data-editor-frame][data-node-id="${nodeId}"]`, 'center');
}

export function createEditorActions(session: EditorSession): EditorActions {
    return {
        select: (nodeId, origin, mode) => selectNode(session, nodeId, origin, mode),
        insertAt: (placement, node) => session.run(insertAt(placement, node)),
        moveTo: (nodeId, placement) => session.run(placeAt(nodeId, placement)),
    };
}
