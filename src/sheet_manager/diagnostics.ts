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
    | 'formula-error'
    | 'template-reference-invalid'
    /** A document rendered a page other than the one it asked for (stale id, kind mismatch). */
    | 'template-fallback'
    /** A reference value names a document that no longer exists. */
    | 'reference-target-missing'
    /** A catalog value was clamped or dropped while filling a sheet. */
    | 'catalog-detail-out-of-range'
    /** A template was applied to a document of another system or kind; its default page rendered. */
    | 'template-incompatible'
    /** A library item could not be placed in the tree where its references say (spec 013). */
    | 'library-placement';

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
