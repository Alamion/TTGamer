import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { useState } from 'react';
import { ZodError } from 'zod';

import { describeError, reportSheetIssue } from '../../../diagnostics';
import { documentRefs } from '../../../store/documentIndex';
import { loadDocuments, useDocumentStore } from '../../../store/documentStore';
import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import { useTemplateStore } from '../../../store/templateStore';
import { type CustomTemplate, CustomTemplateSchema } from '../../../types/template';
import { planTemplateRetarget, type RetargetPlan } from '../../sheet/data/templateRetarget';
import type { DraftIssue } from '../issues/draftIssues';
import { describeLocation, issueLocation, reportUncoveredIssues } from '../issues/schemaIssues';
import type { EditorDraft } from '../model/types';
import { saveEffects } from './saveChecks';
import { savedValuesMayChange } from './saveDocuments';
import type { EditorSession } from './store';

const editor = uiMessages.sheet.templates.editor;

/** A save waiting for confirmation: a retarget (T-070) and/or values a save stops showing. */
interface PendingSave {
    template: CustomTemplate;
    plan?: RetargetPlan;
    effects: { title?: string; lines: readonly string[] };
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
        useDocumentStore
            .getState()
            .relocateDocuments(plan.documentIds.map((id) => ({ id, templateId: null })));
        onSaved?.(template);
        onClose();
    };

    const saveDefault = (template: CustomTemplate) => {
        // Draft-until-save (FR-9): the override lands only on explicit save; assigned
        // documents then render the saved version (live propagation, clarification Q2).
        useTemplateStore.getState().setDefaultOverride(template);
        onClose();
    };

    const showSaveProblem = (draft: EditorDraft, error: unknown) => {
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
    };

    /** The save once the stored values its checks need are at hand. */
    const finishSave = (parsed: CustomTemplate, documents: Parameters<typeof saveEffects>[2]) => {
        // Values a save stops showing are confirmed first; nothing is deleted (saveChecks.ts).
        const effects = saveEffects(base, parsed, documents, plural);
        const asks = effects.lines.length > 0;
        if (editingDefault) {
            if (asks) setPending({ template: parsed, effects });
            else saveDefault(parsed);
            return;
        }
        // A page moved to another type or setting (T-070) takes its assignments along.
        const { settings, types } = useDocumentTypeStore.getState();
        const plan = planTemplateRetarget(parsed, {
            documents: documentRefs(useDocumentStore.getState().entries),
            settings,
            types,
            templates: useTemplateStore.getState().templates,
        });
        if (plan.documentIds.length > 0 || asks) {
            setPending({ template: parsed, plan, effects });
        } else saveUserTemplate(parsed, plan);
    };

    const save = () => {
        const draft: EditorDraft = session.draft();
        try {
            const parsed = CustomTemplateSchema.parse(draft);
            const { documents, entries } = useDocumentStore.getState();
            // Stored values are read from the documents that are not open only when a list,
            // table, or tracker of the page changed (spec 032, D2).
            const unopened =
                base && savedValuesMayChange(base, parsed)
                    ? entries
                          .filter(
                              (entry) =>
                                  entry.systemId === parsed.systemId &&
                                  entry.kind === parsed.documentKind &&
                                  !documents.some(({ id }) => id === entry.id)
                          )
                          .map(({ id }) => id)
                    : [];
            if (unopened.length === 0) {
                finishSave(parsed, documents);
                return;
            }
            void loadDocuments(unopened)
                .then((loaded) => finishSave(parsed, [...documents, ...loaded]))
                .catch((error: unknown) => showSaveProblem(draft, error));
        } catch (error) {
            showSaveProblem(draft, error);
        }
    };

    const confirmation: SaveConfirmation | null = pending && {
        title: pending.effects.title ?? translate(editor.retargetTitle),
        description: [
            ...pending.effects.lines,
            ...(pending.plan && pending.plan.documentIds.length > 0
                ? [plural(editor.retargetDescription, pending.plan.documentIds.length)]
                : []),
        ].join('\n'),
        confirmLabel: translate(
            pending.effects.lines.length > 0 ? editor.listChangeConfirm : editor.retargetConfirm
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
