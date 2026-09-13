import { type SheetIssue, subscribeSheetIssues } from '@site/src/sheet_manager/diagnostics';
import { afterEach, beforeEach } from 'vitest';

/**
 * Sheet degradation paths report through `reportSheetIssue`. An unexpected report fails the
 * test that produced it; tests that exercise a degradation path on purpose must consume the
 * reports with `takeSheetIssues()` and assert on them.
 */
let collected: SheetIssue[] = [];

subscribeSheetIssues((issue) => collected.push(issue));

/** Returns and clears the issues reported so far in the current test. */
export function takeSheetIssues(): SheetIssue[] {
    const issues = collected;
    collected = [];
    return issues;
}

beforeEach(() => {
    collected = [];
});

afterEach(() => {
    const unexpected = takeSheetIssues();
    if (unexpected.length === 0) return;
    const lines = unexpected.map(
        (issue) => `  - ${issue.code}: ${issue.message} ${JSON.stringify(issue.details ?? {})}`
    );
    throw new Error(
        `Unexpected sheet issues (consume expected ones with takeSheetIssues()):\n${lines.join('\n')}`
    );
});
