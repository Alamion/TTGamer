import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useMemo } from 'react';

import {
    collectDraftIssues,
    type DraftIssue,
    type DraftIssueMessages,
    type EditorDraft,
} from '../draft';
import { useSchemaBackstop } from '../issues';
import type { SettingsGroupId } from '../settings/groupedSettings';

const editor = uiMessages.sheet.templates.editor;
const tracker = uiMessages.sheet.templates.tracker;

function issueMessages(): DraftIssueMessages {
    return {
        emptyName: translate(editor.emptyName),
        emptyLabel: translate(editor.emptyLabel),
        duplicateId: translate(editor.duplicateId),
        invalidKey: translate(editor.invalidKey),
        limitReached: translate(editor.limitReached),
        invalidBounds: translate(editor.invalidBounds),
        unknownCoordinate: translate(editor.unknownCoordinate),
        circularDependency: translate(editor.circularDependency),
        unknownBinding: translate(editor.unknownBinding),
        unknownCatalog: translate(editor.unknownCatalog),
        unknownFillTarget: translate(editor.unknownFillTarget),
        listCatalogUnnamed: translate(editor.listCatalogNeedsNames),
        unknownLabelMessage: translate(editor.unknownLabelMessage),
        invalidDocsLink: translate(editor.invalidDocsLink),
        referenceTargetUnavailable: translate(editor.referenceTargetUnavailable),
        trackerLengthEmpty: translate(tracker.issueLengthEmpty),
        trackerCovers: translate(tracker.issueCovers),
    };
}

export interface DraftIssues {
    /** Problems the editor's own checks find; they block saving. */
    specific: readonly DraftIssue[];
    /** Specific problems plus schema rules no check covers (spec 022, R4). */
    all: readonly DraftIssue[];
    /** Issue counts per element and settings group, for the closed group headers. */
    groupCounts: ReadonlyMap<string, Partial<Record<SettingsGroupId, number>>>;
    /** Elements with at least one issue. */
    nodeIds: ReadonlySet<string>;
}

/** The draft's issues; each derived value changes only when what it describes changes. */
export function useDraftIssues(draft: EditorDraft): DraftIssues {
    const messages = useMemo(() => issueMessages(), []);
    const specific = useMemo(() => collectDraftIssues(draft, messages), [draft, messages]);
    const backstop = useSchemaBackstop(draft, specific);
    const all = useMemo(() => [...specific, ...backstop], [specific, backstop]);
    const groupsKey = all
        .filter(({ nodeId, setting }) => nodeId && setting)
        .map(({ nodeId, setting }) => `${nodeId}\u0000${setting!.group}`)
        .join('\u0001');
    const groupCounts = useMemo(() => {
        const counts = new Map<string, Partial<Record<SettingsGroupId, number>>>();
        for (const entry of groupsKey ? groupsKey.split('\u0001') : []) {
            const [nodeId, group] = entry.split('\u0000') as [string, SettingsGroupId];
            const current = counts.get(nodeId) ?? {};
            current[group] = (current[group] ?? 0) + 1;
            counts.set(nodeId, current);
        }
        return counts;
    }, [groupsKey]);
    const nodeKey = all
        .map(({ nodeId }) => nodeId)
        .filter(Boolean)
        .join('|');
    const nodeIds = useMemo(() => new Set(nodeKey ? nodeKey.split('|') : []), [nodeKey]);
    return { specific, all, groupCounts, nodeIds };
}
