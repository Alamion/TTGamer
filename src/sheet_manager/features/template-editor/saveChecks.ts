import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { CustomTemplate } from '../../types/template';
import { listItemChangeReport } from '../sheet/data/listItemChanges';
import { trackerChangeReport } from '../sheet/data/trackerChanges';
import { kindChangeReport } from './elementKinds';

const editor = uiMessages.sheet.templates.editor;
const tracker = uiMessages.sheet.templates.tracker;

interface MessageDescriptor {
    id: string;
    message: string;
}

interface StoredDocument {
    systemId: string;
    kind: string;
    templateValues?: Readonly<Record<string, unknown>>;
}

export type PluralMessage = (
    descriptor: MessageDescriptor,
    count: number,
    values?: Record<string, string | number>
) => string;

/**
 * One kind of stored value a save stops showing (spec 025, D9). A save with lines from any check
 * asks first; nothing is deleted either way.
 */
export interface SaveCheck {
    id: string;
    /** The confirmation's title when this is the first check with lines. */
    title: MessageDescriptor;
    lines(
        before: CustomTemplate,
        after: CustomTemplate,
        documents: readonly StoredDocument[],
        plural: PluralMessage
    ): string[];
}

/** Every save check, in the order the confirmation lists them. */
export const SAVE_CHECKS: readonly SaveCheck[] = [
    {
        // Lists and tables switched to the other kind stop showing stored values (spec 022).
        id: 'kinds',
        title: editor.kindChangeTitle,
        lines: (before, after, documents) =>
            kindChangeReport(before, after, documents).map(({ title, kind }) =>
                translate(editor.kindChangeSaveWarning, {
                    title,
                    kind: translate(kind === 'table' ? editor.kindTable : editor.kindEntries),
                })
            ),
    },
    {
        // Entries a changed list stops showing (spec 016).
        id: 'lists',
        title: editor.listChangeTitle,
        lines: (before, after, documents, plural) => {
            const changes = listItemChangeReport(before, after, documents);
            const lines = changes.flatMap(
                ({ title, documents: count, lostValues, hiddenNames }) => [
                    ...(lostValues > 0
                        ? [
                              plural(editor.listChangeValues, lostValues, {
                                  title,
                                  documents: plural(editor.listChangeSheets, count),
                              }),
                          ]
                        : []),
                    ...(hiddenNames > 0
                        ? [plural(editor.listChangeNames, hiddenNames, { title })]
                        : []),
                ]
            );
            return lines.length > 0 ? [...lines, translate(editor.listChangeNote)] : [];
        },
    },
    {
        // Tracker marks, notes, and copies a save stops showing (spec 018, FR-026).
        id: 'trackers',
        title: tracker.changeTitle,
        lines: (before, after, documents, plural) => {
            const changes = trackerChangeReport(before, after, documents);
            const lines = changes.flatMap(
                ({ title, documents: count, lostMarks, lostTexts, lostCopies }) => {
                    const where = { title, documents: plural(editor.listChangeSheets, count) };
                    return [
                        ...(lostMarks > 0 ? [plural(tracker.changeMarks, lostMarks, where)] : []),
                        ...(lostTexts > 0 ? [plural(tracker.changeTexts, lostTexts, where)] : []),
                        ...(lostCopies > 0
                            ? [plural(tracker.changeCopies, lostCopies, where)]
                            : []),
                    ];
                }
            );
            return lines.length > 0 ? [...lines, translate(tracker.changeNote)] : [];
        },
    },
];

/** What a save would stop showing: every check's lines, titled by the first that has any. */
export function saveEffects(
    before: CustomTemplate | undefined,
    after: CustomTemplate,
    documents: readonly StoredDocument[],
    plural: PluralMessage,
    checks: readonly SaveCheck[] = SAVE_CHECKS
): { title?: string; lines: string[] } {
    if (!before) return { lines: [] };
    let title: string | undefined;
    const lines = checks.flatMap((check) => {
        const found = check.lines(before, after, documents, plural);
        if (found.length > 0) title ??= translate(check.title);
        return found;
    });
    return title ? { title, lines } : { lines };
}
