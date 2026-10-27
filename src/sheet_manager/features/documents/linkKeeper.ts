import { linkName, rewriteLinks, splitLinkTarget } from '@site/src/shared/markdown/links';

import { reportSheetIssue } from '../../diagnostics';
import type { DocumentIndexEntry, Folder } from '../../store/documentIndex';
import { rewriteDocumentMarkdown } from '../../store/documentStore';
import { linksOf, sourcesNaming } from '../../store/linkIndexStore';
import {
    folderPathOf,
    type LinkBuckets,
    linkBuckets,
    linkReferenceFor,
    resolveLink,
} from './linkResolve';

/**
 * Keeping links (spec 044, US4, design D5): after a change to the tree, every link that would now
 * mean another document is rewritten to keep its target: its new name, or its folder path when the
 * name alone finds another. Deleting is not kept (D2).
 */

export interface TreeShape {
    entries: readonly DocumentIndexEntry[];
    folders: readonly Folder[];
}

/** One reference rewritten in one markdown value of one document. */
export interface LinkEdit {
    documentId: string;
    key: string;
    from: string;
    to: string;
}

export interface LinkEditResult {
    /** Links rewritten. */
    links: number;
    /** Documents changed. */
    documents: number;
    /** Edits whose link was no longer there (changed by hand since). */
    skipped: number;
}

const bucketsOf = (shape: TreeShape): LinkBuckets => linkBuckets(shape.entries, shape.folders);

function moved(
    before: DocumentIndexEntry,
    after: DocumentIndexEntry,
    b: LinkBuckets,
    a: LinkBuckets
) {
    return before.parentId !== after.parentId || folderPathOf(before, b) !== folderPathOf(after, a);
}

/** The link edits that keep every link's target across a change of the tree. */
export function planLinkEdits(before: TreeShape, after: TreeShape): LinkEdit[] {
    const b = bucketsOf(before);
    const a = bucketsOf(after);
    const names = new Set<string>();
    const movedSources = new Set<string>();
    for (const entry of a.entries) {
        const previous = b.byId.get(entry.id);
        if (!previous) {
            names.add(linkName(entry.name));
        } else if (previous.name !== entry.name) {
            names.add(linkName(previous.name));
            names.add(linkName(entry.name));
        } else if (moved(previous, entry, b, a)) {
            names.add(linkName(entry.name));
        }
        // A moved document's own links are read from its new place.
        if (previous && moved(previous, entry, b, a)) movedSources.add(entry.id);
    }
    names.delete('');
    const sources = new Set(movedSources);
    for (const name of names) for (const id of sourcesNaming(name)) sources.add(id);

    const edits: LinkEdit[] = [];
    const seen = new Set<string>();
    for (const sourceId of sources) {
        const sourceAfter = a.byId.get(sourceId);
        if (!sourceAfter) continue;
        const sourceBefore = b.byId.get(sourceId) ?? sourceAfter;
        const everyLink = movedSources.has(sourceId);
        for (const row of linksOf(sourceId)) {
            const target = splitLinkTarget(row.reference);
            if (!everyLink && !names.has(linkName(target.name))) continue;
            const was = resolveLink(target, sourceBefore.parentId, b);
            if (!was) continue;
            const kept = a.byId.get(was.id);
            if (!kept) continue;
            if (resolveLink(target, sourceAfter.parentId, a)?.id === was.id) continue;
            const to = linkReferenceFor(kept, sourceAfter.parentId, a);
            const key = `${sourceId}\u0000${row.key}\u0000${row.reference}`;
            if (to === row.reference || seen.has(key)) continue;
            seen.add(key);
            edits.push({ documentId: sourceId, key: row.key, from: row.reference, to });
        }
    }
    return edits;
}

/**
 * Writes link edits into their documents; `reverse` puts the earlier references back, leaving a
 * link changed by hand since then as it is (counted in `skipped`).
 */
export async function applyLinkEdits(
    edits: readonly LinkEdit[],
    reverse = false
): Promise<LinkEditResult> {
    const byDocument = new Map<string, LinkEdit[]>();
    for (const edit of edits) {
        const list = byDocument.get(edit.documentId);
        if (list) list.push(edit);
        else byDocument.set(edit.documentId, [edit]);
    }
    const result: LinkEditResult = { links: 0, documents: 0, skipped: 0 };
    for (const [documentId, list] of byDocument) {
        let found = 0;
        const changed = await rewriteDocumentMarkdown(documentId, (key, text) => {
            let next = text;
            for (const edit of list) {
                if (edit.key !== key) continue;
                const [from, to] = reverse ? [edit.to, edit.from] : [edit.from, edit.to];
                const rewritten = rewriteLinks(next, new Map([[from, to]]));
                if (rewritten.count === 0) continue;
                found += 1;
                result.links += rewritten.count;
                next = rewritten.text;
            }
            return next;
        });
        result.skipped += list.length - found;
        if (changed) result.documents += 1;
    }
    if (result.links > 0 || result.skipped > 0) {
        reportSheetIssue({
            code: 'links-kept',
            message: reverse
                ? 'Rewritten links were put back as they were'
                : 'Links in other documents were rewritten to keep their targets',
            details: { ...result },
        });
    }
    return result;
}
