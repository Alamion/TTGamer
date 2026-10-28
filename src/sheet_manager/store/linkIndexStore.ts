import { extractLinks, linkName, splitLinkTarget } from '@site/src/shared/markdown/links';
import { create } from 'zustand';

import { describeError, reportSheetIssue } from '../diagnostics';
import {
    iterateLinkRecords,
    LINK_RECORD_VERSION,
    LinkRecordSchema,
    type LinkRow,
    LINKS_PER_DOCUMENT_MAX,
    removeLinkRecord,
    writeLinkRecord,
} from '../persistence/linkStorage';
import type { UnknownDocumentEnvelope } from '../types/document';
import { TemplateMarkdownValueSchema } from '../types/templateValues';

/**
 * The link index in memory (spec 044, D3): each document's links as written, and the documents
 * that link to a name. Records are saved with their documents; at start-up one cursor reads them
 * all, and documents without a current record are read again in the background.
 */

/** Documents read again per step of the start-up rebuild. */
const REBUILD_CHUNK = 50;

const linksBySource = new Map<string, readonly LinkRow[]>();
/** Moves on every reset, so a load started before it stops. */
let generation = 0;
let scheduled: (() => void) | undefined;
const sourcesByName = new Map<string, Set<string>>();

interface LinkIndexState {
    /** Moves on every change, so readers can subscribe. */
    version: number;
    /** The stored records have been read. */
    ready: boolean;
}

export const useLinkIndex = create<LinkIndexState>(() => ({ version: 0, ready: false }));

const bump = () => useLinkIndex.setState(({ version }) => ({ version: version + 1 }));

function unlink(id: string) {
    for (const row of linksBySource.get(id) ?? []) {
        const key = linkName(splitLinkTarget(row.reference).name);
        const sources = sourcesByName.get(key);
        sources?.delete(id);
        if (sources?.size === 0) sourcesByName.delete(key);
    }
    linksBySource.delete(id);
}

function remember(id: string, rows: readonly LinkRow[]) {
    unlink(id);
    if (rows.length === 0) return;
    linksBySource.set(id, rows);
    for (const row of rows) {
        const key = linkName(splitLinkTarget(row.reference).name);
        const sources = sourcesByName.get(key);
        if (sources) sources.add(id);
        else sourcesByName.set(key, new Set([id]));
    }
}

/** Template value keys derived from another value (`#detail`) never hold markdown. */
const isMarkdownKey = (key: string) => !key.includes('#');

/** The links a document's markdown values make, as written. */
export function documentLinkRows(document: UnknownDocumentEnvelope): LinkRow[] {
    const rows: LinkRow[] = [];
    for (const [key, value] of Object.entries(document.templateValues ?? {})) {
        if (!isMarkdownKey(key) || !value || typeof value !== 'object' || Array.isArray(value)) {
            continue;
        }
        const markdown = TemplateMarkdownValueSchema.safeParse(value);
        if (!markdown.success || !markdown.data.text.includes('[[')) continue;
        for (const link of extractLinks(markdown.data.text)) {
            rows.push({
                reference: link.reference,
                ...(link.section ? { section: link.section } : {}),
                ...(link.alias ? { alias: link.alias } : {}),
                embed: link.embed,
                key,
                line: link.line,
                context: link.context,
            });
            if (rows.length >= LINKS_PER_DOCUMENT_MAX) return rows;
        }
    }
    return rows;
}

/** Saves a document's link record (an empty one too: it marks the document as read). */
export async function saveDocumentLinks(document: UnknownDocumentEnvelope): Promise<void> {
    // The document is already saved: a failure here is reported, never thrown back at the writer.
    try {
        const rows = documentLinkRows(document);
        remember(document.id, rows);
        bump();
        await writeLinkRecord(document.id, { v: LINK_RECORD_VERSION, links: rows });
    } catch (error) {
        reportSheetIssue({
            code: 'link-index-write-failed',
            message: 'A document link record could not be saved',
            details: { documentId: document.id, error: describeError(error) },
        });
    }
}

/** Removes a purged document's link record. */
export async function forgetDocumentLinks(id: string): Promise<void> {
    unlink(id);
    bump();
    await removeLinkRecord(id);
}

/** A document's links as written. */
export const linksOf = (id: string): readonly LinkRow[] => linksBySource.get(id) ?? [];

/** Documents whose markdown links to a name (any folder path), as a fresh array. */
export const sourcesNaming = (name: string): string[] => [
    ...(sourcesByName.get(linkName(name)) ?? []),
];

/**
 * Reads every stored record, then reads again (in steps, in the background) the documents of
 * `ids` that have no current record. `read` loads one document; `null` skips it.
 */
export async function loadLinkIndex(
    ids: readonly string[],
    read: (id: string) => Promise<UnknownDocumentEnvelope | null>
): Promise<void> {
    const started = generation;
    const stored = new Set<string>();
    let invalid = 0;
    await iterateLinkRecords((record, id) => {
        const parsed = LinkRecordSchema.safeParse(record);
        if (!parsed.success) {
            invalid += 1;
            return;
        }
        stored.add(id);
        remember(id, parsed.data.links);
    });
    if (started !== generation) return;
    useLinkIndex.setState(({ version }) => ({ version: version + 1, ready: true }));
    const missing = ids.filter((id) => !stored.has(id));
    for (let index = 0; index < missing.length; index += REBUILD_CHUNK) {
        const documents = await Promise.all(missing.slice(index, index + REBUILD_CHUNK).map(read));
        if (started !== generation) return;
        await Promise.all(
            documents.flatMap((document) => (document ? [saveDocumentLinks(document)] : []))
        );
    }
    if (missing.length > 0 || invalid > 0) {
        reportSheetIssue({
            code: 'link-index-rebuilt',
            message:
                'Link records were missing or invalid and were read again from their documents',
            details: { missing: missing.length, invalid },
        });
    }
}

/**
 * Loads the index once the page is idle (or soon, where idle callbacks are missing). `ids` is read
 * when the load starts, so documents opened meanwhile are included.
 */
export function scheduleLinkIndexLoad(
    ids: () => readonly string[],
    read: (id: string) => Promise<UnknownDocumentEnvelope | null>
): void {
    scheduled?.();
    const run = () => {
        scheduled = undefined;
        void loadLinkIndex(ids(), read).catch((error: unknown) =>
            reportSheetIssue({
                code: 'link-index-write-failed',
                message: 'The link index could not be read',
                details: { error: describeError(error) },
            })
        );
    };
    if (typeof requestIdleCallback === 'function') {
        const handle = requestIdleCallback(run, { timeout: 3000 });
        scheduled = () => cancelIdleCallback(handle);
    } else {
        const handle = setTimeout(run, 500);
        scheduled = () => clearTimeout(handle);
    }
}

/** Forgets everything in memory and stops a pending or running load (tests). */
export function resetLinkIndex(): void {
    scheduled?.();
    scheduled = undefined;
    generation += 1;
    linksBySource.clear();
    sourcesByName.clear();
    useLinkIndex.setState({ version: 0, ready: false });
}
