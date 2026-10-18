import { useEffect, useMemo, useState } from 'react';

import { reportSheetIssue } from '../../diagnostics';
import type { DocumentIndexEntry } from '../../store/documentIndex';
import { loadDocuments, useDocumentStore } from '../../store/documentStore';

/**
 * Documents that link to a document (spec 040, D7): the "Member of" list of a character is the
 * groups whose values name it. Members are stored once, on the group; this reads them back.
 */

/** At most this many linking candidates are read per lookup (constitution VII scale note). */
export const LINKED_FROM_LIMIT = 200;

export interface LinkedFromScope {
    systemId: string;
    settingId: string | undefined;
    /** Kinds of the documents that may link here (the field's target kinds). */
    kinds: ReadonlySet<string>;
}

export interface LinkingDocument {
    id: string;
    name: string;
    kind: string;
}

export interface LinkedFromResult {
    documents: LinkingDocument[];
    /** More candidates existed than were read. */
    truncated: boolean;
}

/** Any stored value naming the id, under whatever key the author chose. */
const names = (value: unknown, id: string): boolean =>
    value === id || (Array.isArray(value) && value.includes(id));

/** Index entries that may link here: same system and setting, of the scope's kinds, by name. */
export function linkCandidates(
    entries: readonly DocumentIndexEntry[],
    documentId: string,
    scope: LinkedFromScope
): { candidates: DocumentIndexEntry[]; truncated: boolean } {
    const all = entries
        .filter(
            (entry) =>
                entry.id !== documentId &&
                entry.systemId === scope.systemId &&
                (entry.settingId ?? undefined) === scope.settingId &&
                scope.kinds.has(entry.kind)
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    return {
        candidates: all.slice(0, LINKED_FROM_LIMIT),
        truncated: all.length > LINKED_FROM_LIMIT,
    };
}

/** Reads the candidates by id (never the loaded cache alone) and keeps those naming the document. */
export async function findLinkingDocuments(
    documentId: string,
    scope: LinkedFromScope
): Promise<LinkedFromResult> {
    const { candidates, truncated } = linkCandidates(
        useDocumentStore.getState().entries,
        documentId,
        scope
    );
    if (truncated) {
        reportSheetIssue({
            code: 'linked-from-truncated',
            message:
                'More documents may link here than are read; the first ones by name are listed',
            details: { documentId, limit: LINKED_FROM_LIMIT },
        });
    }
    const byId = new Map(candidates.map((entry) => [entry.id, entry]));
    const loaded = await loadDocuments(candidates.map(({ id }) => id));
    const documents = loaded
        .filter((document) =>
            Object.values(document.templateValues ?? {}).some((value) => names(value, documentId))
        )
        .map((document) => ({
            id: document.id,
            name: byId.get(document.id)?.name || document.metadata.title || document.definitionId,
            kind: String(document.kind),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    return { documents, truncated };
}

/** The documents linking here, refreshed when a candidate changes; `undefined` while read. */
export function useLinkedFrom(
    documentId: string | undefined,
    scope: LinkedFromScope | undefined
): LinkedFromResult | undefined {
    const entries = useDocumentStore((state) => state.entries);
    const kindsKey = scope ? [...scope.kinds].sort().join('|') : '';
    // Only the candidates' own changes (and the set of candidates) start a new read, not edits of
    // the document being typed in.
    const candidatesKey = useMemo(() => {
        if (!documentId || !scope) return '';
        return linkCandidates(entries, documentId, scope)
            .candidates.map(({ id, updatedAt }) => `${id}:${updatedAt}`)
            .join('|');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries, documentId, scope?.systemId, scope?.settingId, kindsKey]);
    const [result, setResult] = useState<LinkedFromResult>();
    useEffect(() => {
        if (!documentId || !scope) return;
        let active = true;
        void findLinkingDocuments(documentId, scope).then((value) => {
            if (active) setResult(value);
        });
        return () => {
            active = false;
        };
        // The scope is compared by value; `candidatesKey` stands for the entries that matter.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentId, candidatesKey, scope?.systemId, scope?.settingId, kindsKey]);
    return result;
}
