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
            found.scrollIntoView({ block: 'start' });
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

export interface FollowOptions {
    newTab?: boolean;
    section?: string;
}

/** Opens a linked document as a reference field does; previews never leave themselves. */
export function useFollowDocument(): (documentId: string, options?: FollowOptions) => void {
    const { preview } = useDocumentSource();
    const followLink = useContext(DocumentLinkContext);
    return useCallback(
        (documentId, { newTab = false, section } = {}) => {
            if (preview) return;
            if (newTab) openInNewTab(documentId);
            else if (followLink) followLink(documentId);
            else useDocumentStore.getState().setCurrentDocument(documentId);
            if (section) scrollToSection(documentId, section);
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
