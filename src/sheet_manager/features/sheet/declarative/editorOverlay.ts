import { createContext, type ReactNode, useContext } from 'react';

import type { TemplateNode } from '../../../types/template';

/** Where a rendered node sits: `index` in its parent's children, `column` when stacked. */
export interface OverlayPlacement {
    parentId: string | null;
    index: number;
    column: number | null;
}

export interface OverlayFrameArgs extends OverlayPlacement {
    node: TemplateNode;
    /** The node's display condition is false on the current document. */
    conditionHidden: boolean;
    content: ReactNode;
    /**
     * Changes whenever what nodes display changes (values, formula results), but not when only
     * the template changes: a frame whose node, placement, and version are unchanged may skip
     * re-rendering its subtree.
     */
    version: unknown;
}

/**
 * The template editor's hook into the real renderer (spec 012). When present, every node is
 * wrapped in an editor frame, condition-hidden nodes stay visible, and insertion points are
 * rendered between children. Absent (the default), the renderer behaves exactly as before.
 */
export interface TemplateEditorOverlay {
    renderFrame(args: OverlayFrameArgs): ReactNode;
    /** The insertion point after the last child of a list or column (`index` = insert index). */
    renderEndSlot(placement: OverlayPlacement): ReactNode;
    /** A column of a multi-column container that has no children yet. */
    renderEmptyColumn(placement: OverlayPlacement): ReactNode;
}

export const TemplateEditorOverlayContext = createContext<TemplateEditorOverlay | null>(null);

/** The current display version (see `OverlayFrameArgs.version`), provided by the renderer. */
export const OverlayVersionContext = createContext<unknown>(undefined);

export function useTemplateEditorOverlay(): TemplateEditorOverlay | null {
    return useContext(TemplateEditorOverlayContext);
}
