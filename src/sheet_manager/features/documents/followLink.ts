import { linkName } from '@site/src/shared/markdown/links';
import { useCallback, useContext } from 'react';

import { reportSheetIssue } from '../../diagnostics';
import { useDocumentSource } from '../../hooks/useDocumentSource';
import { useDocumentStore } from '../../store/documentStore';
import { systemRegistry } from '../../systems';
import { DocumentLinkContext } from '../sheet/declarative/documentLinks';
import { openInNewTab } from '../sheet/panes/paneStore';
import { createFromChoice, type CreateTarget } from './createFromChoice';

/**
 * Following a link between documents (spec 044, US1): the same history as reference fields, a new
 * tab on request, and a scroll to the linked section once the target is drawn.
 */

/** How long a followed section is looked for while the target draws. */
const SECTION_WAIT_MS = 2000;

/** The element a section anchor stands for: its child when the anchor takes no box itself. */
const anchorTarget = (anchor: Element): Element =>
    anchor.classList.contains('contents') ? (anchor.firstElementChild ?? anchor) : anchor;

/** The nearest box the reader can scroll themselves; the page when none is. */
function scrollerOf(element: Element): Element | undefined {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const { overflowY } = getComputedStyle(parent);
        if (
            (overflowY === 'auto' || overflowY === 'scroll') &&
            parent.scrollHeight > parent.clientHeight
        )
            return parent;
    }
    return undefined;
}

/**
 * Scrolls one box to show an element. `scrollIntoView` would also scroll clipped boxes, such as a
 * pane group's frame, moving its tab strip out of reach.
 */
function reveal(element: Element, block: 'start' | 'center'): void {
    const box = element.getBoundingClientRect();
    const scroller = scrollerOf(element);
    // The page scrolls under the sticky navbar.
    const top = scroller
        ? scroller.getBoundingClientRect().top
        : (document.querySelector('.navbar')?.getBoundingClientRect().bottom ?? 0);
    const height = (scroller ? scroller.clientHeight : window.innerHeight) - (scroller ? 0 : top);
    const offset = box.top - top - (block === 'center' ? (height - box.height) / 2 : 0);
    if (scroller) scroller.scrollTop += offset;
    else window.scrollBy(0, offset);
}

/** The drawn page of a document, outside preview cards. */
function documentRoot(documentId: string): Element | undefined {
    const selector = `[data-document-id="${CSS.escape(documentId)}"]`;
    return [...document.querySelectorAll(selector)].find(
        (root) => !root.closest('[data-preview-card]')
    );
}

/** A section of a drawn document by its shown name or its source (English) name. */
export function findSection(root: Element, section: string): Element | undefined {
    const wanted = linkName(section);
    const anchor = [...root.querySelectorAll<HTMLElement>('[data-section]')].find(
        (candidate) =>
            linkName(candidate.dataset.section ?? '') === wanted ||
            linkName(candidate.dataset.sectionSource ?? '') === wanted
    );
    return anchor ? anchorTarget(anchor) : undefined;
}

/** Scrolls to a section once the document is drawn; a missing section is reported. */
export function scrollToSection(documentId: string, section: string): void {
    const started = Date.now();
    const look = () => {
        const root = documentRoot(documentId);
        const found = root && findSection(root, section);
        if (found) {
            reveal(found, 'start');
            return;
        }
        if (Date.now() - started < SECTION_WAIT_MS) {
            requestAnimationFrame(look);
            return;
        }
        reportSheetIssue({
            code: 'link-section-missing',
            message: 'A linked section is not on its document; the document opened at the top',
            details: { documentId, section },
        });
    };
    requestAnimationFrame(look);
}

/** Scrolls to the markdown block holding a source line once the document is drawn. */
export function scrollToLine(documentId: string, line: number): void {
    const started = Date.now();
    const look = () => {
        const root = documentRoot(documentId);
        const blocks = root ? [...root.querySelectorAll<HTMLElement>('[data-line]')] : [];
        const at = blocks.reduce<HTMLElement | undefined>((best, block) => {
            const from = Number(block.dataset.line);
            return from <= line && (!best || from >= Number(best.dataset.line)) ? block : best;
        }, undefined);
        if (at) {
            reveal(anchorTarget(at), 'center');
            return;
        }
        if (Date.now() - started < SECTION_WAIT_MS) requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
}

export interface FollowOptions {
    newTab?: boolean;
    section?: string;
    /** A source line of the target's markdown to show ("Mentioned in"). */
    line?: number;
}

/** Opens a linked document as a reference field does; previews never leave themselves. */
export function useFollowDocument(): (documentId: string, options?: FollowOptions) => void {
    const { preview } = useDocumentSource();
    const followLink = useContext(DocumentLinkContext);
    return useCallback(
        (documentId, { newTab = false, section, line } = {}) => {
            if (preview) return;
            if (newTab) openInNewTab(documentId);
            else if (followLink) followLink(documentId);
            else useDocumentStore.getState().setCurrentDocument(documentId);
            if (section) scrollToSection(documentId, section);
            else if (line !== undefined) scrollToLine(documentId, line);
        },
        [preview, followLink]
    );
}

/** The kind a link to a missing name creates (the General note), if one is installed. */
export function linkNoteKind(): CreateTarget | undefined {
    for (const system of systemRegistry.getSystems()) {
        const definition = system.documents.find(({ newFromLink }) => newFromLink);
        if (definition) return { systemId: system.id, definitionId: definition.id };
    }
    return undefined;
}

/** Creates the document a missing link names, in the given folder; its id, or nothing. */
export function createLinkedDocument(name: string, parentId: string | null): string | undefined {
    const target = linkNoteKind();
    if (!target) return undefined;
    return createFromChoice(target, { name, parentId, activate: false }).id;
}
