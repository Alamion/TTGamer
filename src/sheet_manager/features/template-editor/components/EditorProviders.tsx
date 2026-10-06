import { type ReactNode, useMemo } from 'react';

import { listDocumentBindings } from '../../../systems/templateBindings';
import {
    collectTemplateFields,
    collectTemplateNodes,
    TEMPLATE_LIMITS,
} from '../../../types/template';
import { listTemplateNumericCoordinates } from '../../sheet/data/templateReferences';
import type { EditorDraft } from '../draft';
import {
    EditorCoordinatesContext,
    EditorFillTargetsContext,
    type EditorModel,
    EditorModelContext,
    type FillTarget,
} from '../EditorModel';
import { createEditorActions } from '../session/actions';
import {
    EditorActionsContext,
    EditorIssueNodesContext,
    EditorSessionContext,
} from '../session/context';
import type { EditorSession } from '../session/store';
import type { DraftIssues } from '../session/useDraftIssues';
import {
    createNodeEdits,
    createSelectionEdits,
    type DropColumnsRequest,
    NodeEditsContext,
    SelectionEditsContext,
} from '../session/useNodeEdits';
import {
    IssueGroupCountsContext,
    type SettingsGroupState,
    SettingsGroupStateContext,
} from '../settings/groupState';

/**
 * Every context the editor's parts read, provided once. Each value changes only when what it
 * describes changes, so memoized panels and frames skip unrelated edits.
 */
export function EditorProviders({
    children,
    draft,
    groups,
    issues,
    onDropColumns,
    session,
}: {
    children: ReactNode;
    draft: EditorDraft;
    groups: SettingsGroupState;
    issues: DraftIssues;
    onDropColumns: (request: DropColumnsRequest) => void;
    session: EditorSession;
}) {
    const actions = useMemo(() => createEditorActions(session), [session]);
    const nodeEdits = useMemo(
        () => createNodeEdits(session, onDropColumns),
        [onDropColumns, session]
    );
    const selectionEdits = useMemo(() => createSelectionEdits(session), [session]);

    const atNodeLimit = collectTemplateNodes(draft).length >= TEMPLATE_LIMITS.nodesPerTemplate;
    const model = useMemo<EditorModel>(
        () => ({
            draftId: draft.id,
            systemId: draft.systemId,
            documentKind: draft.documentKind,
            settingId: draft.settingId,
            bindings: listDocumentBindings(draft.systemId, draft.documentKind),
            coordinateListId: `template-coordinates-${draft.id}`,
            atNodeLimit,
        }),
        [draft.id, draft.systemId, draft.documentKind, draft.settingId, atNodeLimit]
    );
    // Keyed by content so the context value changes only when a fill target actually changes.
    const fillTargetsKey = JSON.stringify(
        [...collectTemplateFields(draft).values()].map(({ id, type, label }) => [id, type, label])
    );
    const fillTargets = useMemo<readonly FillTarget[]>(
        () =>
            (JSON.parse(fillTargetsKey) as Array<[string, FillTarget['type'], string]>).map(
                ([id, type, label]) => ({ id, type, label })
            ),
        [fillTargetsKey]
    );
    const coordinatesKey = JSON.stringify(
        listTemplateNumericCoordinates(draft).map(({ coordinate, label }) => [coordinate, label])
    );
    const coordinates = useMemo(
        () => JSON.parse(coordinatesKey) as Array<[string, string]>,
        [coordinatesKey]
    );
    const coordinateSet = useMemo(
        () => new Set(coordinates.map(([coordinate]) => coordinate)),
        [coordinates]
    );
    const coordinateOptions = useMemo(
        () =>
            coordinates.map(([coordinate, label]) => (
                <option key={coordinate} value={coordinate}>
                    {label}
                </option>
            )),
        [coordinates]
    );

    return (
        <EditorSessionContext.Provider value={session}>
            <EditorActionsContext.Provider value={actions}>
                <NodeEditsContext.Provider value={nodeEdits}>
                    <SelectionEditsContext.Provider value={selectionEdits}>
                        <EditorModelContext.Provider value={model}>
                            <EditorCoordinatesContext.Provider value={coordinateSet}>
                                <EditorFillTargetsContext.Provider value={fillTargets}>
                                    <SettingsGroupStateContext.Provider value={groups}>
                                        <IssueGroupCountsContext.Provider
                                            value={issues.groupCounts}
                                        >
                                            <EditorIssueNodesContext.Provider
                                                value={issues.nodeIds}
                                            >
                                                {children}
                                                <datalist id={model.coordinateListId}>
                                                    {coordinateOptions}
                                                </datalist>
                                            </EditorIssueNodesContext.Provider>
                                        </IssueGroupCountsContext.Provider>
                                    </SettingsGroupStateContext.Provider>
                                </EditorFillTargetsContext.Provider>
                            </EditorCoordinatesContext.Provider>
                        </EditorModelContext.Provider>
                    </SelectionEditsContext.Provider>
                </NodeEditsContext.Provider>
            </EditorActionsContext.Provider>
        </EditorSessionContext.Provider>
    );
}
