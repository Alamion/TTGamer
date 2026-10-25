/**
 * Where the focus goes once a new document is made (spec 043): a page part that wants the cursor
 * (a note's empty text) claims it for its document, and the create dialog hands the focus over
 * when it closes instead of returning it to the button that opened it.
 */
const claims = new Map<string, () => void>();

/** Claims the focus for a document's first moment; returns the release. */
export function claimNewDocumentFocus(documentId: string, focus: () => void): () => void {
    claims.set(documentId, focus);
    return () => {
        if (claims.get(documentId) === focus) claims.delete(documentId);
    };
}

/** Focuses what a new document claimed; `false` when nothing did. */
export function takeNewDocumentFocus(documentId: string): boolean {
    const focus = claims.get(documentId);
    if (!focus) return false;
    claims.delete(documentId);
    focus();
    return true;
}
