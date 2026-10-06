import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { useState } from 'react';
import { ZodError } from 'zod';

import { describeError, reportSheetIssue } from '../../../diagnostics';
import { useDocumentStore } from '../../../store/documentStore';
import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import { useTemplateStore } from '../../../store/templateStore';
import { type CustomTemplate, CustomTemplateSchema } from '../../../types/template';
import { type ListItemChange, listItemChangeReport } from '../../sheet/data/listItemChanges';
import { planTemplateRetarget, type RetargetPlan } from '../../sheet/data/templateRetarget';
import { type TrackerChange, trackerChangeReport } from '../../sheet/data/trackerChanges';
import type { DraftIssue, EditorDraft } from '../draft';
import { type KindChange, kindChangeReport } from '../elementKinds';
import { describeLocation, issueLocation, reportUncoveredIssues } from '../issues';
import type { EditorSession } from './store';

const editor = uiMessages.sheet.templates.editor;
const tracker = uiMessages.sheet.templates.tracker;

/** A save waiting for confirmation: a retarget (T-070) and/or values a save stops showing. */
interface PendingSave {
    template: CustomTemplate;
    plan?: RetargetPlan;
    lists: readonly ListItemChange[];
    trackers: readonly TrackerChange[];
    kinds: readonly KindChange[];
}

/** The confirmation of a pending save, ready to show. */
export interface SaveConfirmation {
    title: string;
    description: string;
    confirmLabel: string;
    confirm(): void;
    cancel(): void;
}

/**
 * Saving the edited page (spec 012 and later): a valid page whose save hides stored values or
 * moves documents asks first; an invalid one shows its problems in plain words (spec 022, FR-019).
 */
export function useTemplateSave({
    base,
    editingDefault,
    onClose,
    onSaved,
    session,
    specificIssues,
}: {
    /** The page as it was stored, when editing an existing one. */
    base: CustomTemplate | undefined;
    editingDefault: boolean;
    onClose: () => void;
    onSaved?: (template: CustomTemplate) => void;
    session: EditorSession;
    specificIssues: readonly DraftIssue[];
}): { save(): void; confirmation: SaveConfirmation | null } {
    const plural = usePluralMessage();
    const [pending, setPending] = useState<PendingSave | null>(null);

    const saveUserTemplate = (template: CustomTemplate, plan: RetargetPlan) => {
        useTemplateStore.getState().saveTemplate(template);
        const types = useDocumentTypeStore.getState();
        for (const setting of plan.settings) types.saveSetting(setting);
        for (const type of plan.types) types.saveType(type);
        const { updateDocumentMetadata } = useDocumentStore.getState();
        for (const id of plan.documentIds) updateDocumentMetadata(id, { templateId: undefined });
        onSaved?.(template);
        onClose();
    };

    const saveDefault = (template: CustomTemplate) => {
        // Draft-until-save (FR-9): the override lands only on explicit save; assigned
        // documents then render the saved version (live propagation, clarification Q2).
        useTemplateStore.getState().setDefaultOverride(template);
        onClose();
    };

    const save = () => {
        const draft: EditorDraft = session.draft();
        try {
            const parsed = CustomTemplateSchema.parse(draft);
            const { documents } = useDocumentStore.getState();
            // Entries a changed list stops showing are confirmed first; nothing is deleted.
            const lists = listItemChangeReport(base, parsed, documents);
            // Tracker marks, notes, and copies a save stops showing (spec 018, FR-026).
            const trackers = trackerChangeReport(base, parsed, documents);
            // Lists and tables switched to the other kind stop showing stored values (spec 022).
            const kinds = kindChangeReport(base, parsed, documents);
            const asks = lists.length > 0 || trackers.length > 0 || kinds.length > 0;
            if (editingDefault) {
                if (asks) setPending({ template: parsed, lists, trackers, kinds });
                else saveDefault(parsed);
                return;
            }
            // A page moved to another type or setting (T-070) takes its assignments along.
            const { settings, types } = useDocumentTypeStore.getState();
            const plan = planTemplateRetarget(parsed, {
                documents,
                settings,
                types,
                templates: useTemplateStore.getState().templates,
            });
            if (plan.documentIds.length > 0 || asks) {
                setPending({ template: parsed, plan, lists, trackers, kinds });
            } else saveUserTemplate(parsed, plan);
        } catch (error) {
            // Raw schema text never reaches the author (spec 022, FR-019): each problem is
            // mapped to its element and setting, and rules no check covers are reported.
            if (error instanceof ZodError) {
                reportUncoveredIssues(draft, specificIssues);
                const mapped = error.issues.map((issue) =>
                    describeLocation(draft, issueLocation(draft, issue.path))
                );
                session.showIssues(
                    mapped.filter(
                        (issue, index) =>
                            mapped.findIndex(({ message }) => message === issue.message) === index
                    )
                );
            } else {
                reportSheetIssue({
                    code: 'template-draft-invalid',
                    message: 'Saving the template failed',
                    details: { error: describeError(error) },
                });
                session.showIssues([describeLocation(draft, {})]);
            }
        }
    };

    const describe = ({ plan, lists, trackers, kinds }: PendingSave): string =>
        [
            ...kinds.map(({ title, kind }) =>
                translate(editor.kindChangeSaveWarning, {
                    title,
                    kind: translate(kind === 'table' ? editor.kindTable : editor.kindEntries),
                })
            ),
            ...lists.flatMap(({ title, documents, lostValues, hiddenNames }) => [
                ...(lostValues > 0
                    ? [
                          plural(editor.listChangeValues, lostValues, {
                              title,
                              documents: plural(editor.listChangeSheets, documents),
                          }),
                      ]
                    : []),
                ...(hiddenNames > 0
                    ? [plural(editor.listChangeNames, hiddenNames, { title })]
                    : []),
            ]),
            ...(lists.length > 0 ? [translate(editor.listChangeNote)] : []),
            ...trackers.flatMap(({ title, documents, lostMarks, lostTexts, lostCopies }) => {
                const where = { title, documents: plural(editor.listChangeSheets, documents) };
                return [
                    ...(lostMarks > 0 ? [plural(tracker.changeMarks, lostMarks, where)] : []),
                    ...(lostTexts > 0 ? [plural(tracker.changeTexts, lostTexts, where)] : []),
                    ...(lostCopies > 0 ? [plural(tracker.changeCopies, lostCopies, where)] : []),
                ];
            }),
            ...(trackers.length > 0 ? [translate(tracker.changeNote)] : []),
            ...(plan && plan.documentIds.length > 0
                ? [plural(editor.retargetDescription, plan.documentIds.length)]
                : []),
        ].join('\n');

    const confirmation: SaveConfirmation | null = pending && {
        title: translate(
            pending.kinds.length
                ? editor.kindChangeTitle
                : pending.lists.length
                  ? editor.listChangeTitle
                  : pending.trackers.length
                    ? tracker.changeTitle
                    : editor.retargetTitle
        ),
        description: describe(pending),
        confirmLabel: translate(
            pending.lists.length || pending.trackers.length || pending.kinds.length
                ? editor.listChangeConfirm
                : editor.retargetConfirm
        ),
        confirm: () => {
            if (pending.plan) saveUserTemplate(pending.template, pending.plan);
            else saveDefault(pending.template);
            setPending(null);
        },
        cancel: () => setPending(null),
    };

    return { save, confirmation };
}
