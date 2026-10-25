import { isDevelopment } from '@site/src/shared/utils/env';

/**
 * Single reporting channel for the sheet manager's graceful-degradation paths. Degradation
 * keeps the UI usable, but every rejected write, quarantined entry, unresolved binding, or
 * failed formula must be observable: subscribers (tests) receive every report, and in
 * development each distinct issue is also logged once to the console.
 */
export type SheetIssueCode =
    | 'template-value-write-rejected'
    | 'template-value-write-skipped'
    | 'template-quarantined'
    | 'document-recovered'
    | 'binding-unresolved'
    | 'catalog-unavailable'
    | 'list-entry-unreadable'
    /** A stored tracker value does not have the tracker value shape; it reads as empty. */
    | 'template-value-unreadable'
    /** Stored tracker marks or notes under levels, kinds, columns, or copies the page lost. */
    | 'template-value-hidden'
    | 'formula-error'
    | 'template-reference-invalid'
    /** A document rendered a page other than the one it asked for (stale id, kind mismatch). */
    | 'template-fallback'
    /** A reference value names a document that no longer exists. */
    | 'reference-target-missing'
    /** A reference value names a document outside the template's setting (spec 017). */
    | 'reference-target-out-of-scope'
    /** A catalog value was clamped or dropped while filling a sheet. */
    | 'catalog-detail-out-of-range'
    /** A template was applied to a document of another system or kind; its default page rendered. */
    | 'template-incompatible'
    /** A library item could not be placed in the tree where its references say (spec 013). */
    | 'library-placement'
    /** A schema rule no editor check covers blocked a save (spec 022): add a specific check. */
    | 'template-draft-invalid'
    /** Pasted text named the copied-elements format but was refused (spec 023): version or schema. */
    | 'template-clipboard-invalid'
    /** A document's record could not be read, is missing, or no longer validates (spec 032). */
    | 'document-record-unreadable'
    | 'document-record-missing'
    | 'document-record-invalid'
    /** A changed document could not be saved; it stays queued for the next attempt. */
    | 'document-write-failed'
    /** The move of stored documents to one record each failed; nothing is saved until reload. */
    | 'document-migration-failed'
    /** A record without an index entry got its entry back. */
    | 'document-index-rebuilt'
    /** A deleted document's record could not be removed yet. */
    | 'document-purge-failed'
    | 'document-folders-repaired'
    /** A new document's folder was deleted before it was created; it went to the top level. */
    | 'document-folder-missing'
    /** The create dialog's stored recent kinds and folds are unreadable; they start over (spec 039). */
    | 'create-preferences-invalid'
    /** Recent kinds that are no longer installed were dropped from the create dialog. */
    | 'create-recent-missing'
    /** A documentation create button names a kind or an example that is not installed. */
    | 'create-kind-unavailable'
    /** More documents may link to a document than one "linked from" lookup reads (spec 040). */
    | 'linked-from-truncated'
    | 'document-boot-failed'
    /** The stored arrangement of panes is not readable; the current document shows alone (spec 034). */
    | 'pane-arrangement-invalid'
    /** The dice panel could not be drawn as a tab; it slides in as on other pages (spec 036). */
    | 'dice-tab-unavailable'
    /** Markdown shown in a fallback look: an unknown callout type, a non-HTTPS image (spec 043). */
    | 'markdown-render-issue';

export interface SheetIssue {
    code: SheetIssueCode;
    message: string;
    details?: Record<string, unknown>;
}

type SheetIssueListener = (issue: SheetIssue) => void;

const listeners = new Set<SheetIssueListener>();
const logged = new Set<string>();
const MAX_LOGGED_SIGNATURES = 500;

export function reportSheetIssue(issue: SheetIssue): void {
    for (const listener of listeners) listener(issue);
    // Subscribers own the reports; console output is the fallback channel for the app.
    if (listeners.size > 0 || !isDevelopment()) return;

    const signature = `${issue.code}:${issue.message}:${safeStringify(issue.details)}`;
    if (logged.has(signature)) return;
    if (logged.size >= MAX_LOGGED_SIGNATURES) logged.clear();
    logged.add(signature);
    console.warn(`[sheet_manager] ${issue.code}: ${issue.message}`, issue.details ?? '');
}

export function subscribeSheetIssues(listener: SheetIssueListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Short, human-readable summary of a thrown parse error (Zod or otherwise). */
export function describeError(error: unknown): string {
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues)) {
        return (error.issues as Array<{ path?: unknown[]; message?: string }>)
            .slice(0, 5)
            .map((issue) => `${(issue.path ?? []).join('.') || '<root>'}: ${issue.message}`)
            .join('; ');
    }
    return error instanceof Error ? error.message : String(error);
}

function safeStringify(value: unknown): string {
    try {
        return JSON.stringify(value) ?? '';
    } catch {
        return String(value);
    }
}
