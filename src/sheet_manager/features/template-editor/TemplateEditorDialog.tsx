import { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { useCallback, useMemo, useState } from 'react';
import { useStore } from 'zustand';

import { reportSheetIssue } from '../../diagnostics';
import { isDefaultTemplateId } from '../../systems/view';
import type { CustomTemplate } from '../../types/template';
import { reviewBaseFor, usePageEditorSession, usePendingUpdate } from '../sheet/data/pendingUpdate';
import { isTypingTarget, shortcutHandlers, useEditorShortcuts } from './commands/keys';
import { commandById, type CommandContext } from './commands/list';
import { EditorConfirms } from './components/EditorConfirms';
import { EditorFooter } from './components/EditorFooter';
import { type EditorArea, EditorPanes } from './components/EditorPanes';
import { EditorPreview } from './components/EditorPreview';
import { EditorProviders } from './components/EditorProviders';
import { EditorTemplateFields } from './components/EditorTemplateFields';
import { type EditorMode, EditorToolbar } from './components/EditorToolbar';
import { ShortcutList } from './components/ShortcutList';
import { type DraftIssue } from './issues/draftIssues';
import { differencesOf } from './merge/differences';
import { mergePages } from './merge/merge';
import { createDraftFromTemplate, createEmptyDraft } from './model/factories';
import { generateDraftId } from './model/ids';
import { type EditorDraft } from './model/types';
import { reveal, selectNode } from './session/actions';
import { clipboardAction, useClipboardEvents } from './session/clipboard';
import { createEditorSession, type EditorSession } from './session/store';
import { useDraftIssues } from './session/useDraftIssues';
import type { DropColumnsRequest } from './session/useNodeEdits';
import { useTemplateSave } from './session/useTemplateSave';
import { useSettingsGroupSession } from './settings/groupState';

const library = uiMessages.sheet.templates.library;

export interface TemplateEditorDialogProps {
    base:
        | {
              kind: 'empty';
              documentKind?: string;
              systemId?: string;
              settingId?: string;
              name?: string;
          }
        | { kind: 'skeleton'; documentKind: string; template: CustomTemplate }
        | { kind: 'duplicate' | 'edit'; template: CustomTemplate }
        | {
              kind: 'review';
              copy: CustomTemplate;
              shipped: CustomTemplate;
              mode: 'merge';
              baseline: CustomTemplate;
          }
        | {
              kind: 'review';
              copy: CustomTemplate;
              shipped: CustomTemplate;
              mode: 'differences';
          };
    onClose: () => void;
    /** Called with the saved template (user templates only; e.g. to create a user type). */
    onSaved?: (template: CustomTemplate) => void;
    /** The caller owns the page's place (a new type's first page, a setting's page). */
    lockTarget?: boolean;
}

function initialDraft(
    base: Exclude<TemplateEditorDialogProps['base'], { kind: 'review' }>
): EditorDraft {
    if (base.kind === 'empty') {
        const draft = createEmptyDraft(base.documentKind ?? 'character', base.systemId);
        return {
            ...draft,
            ...(base.name ? { name: base.name } : {}),
            ...(base.settingId ? { settingId: base.settingId } : {}),
        };
    }
    if (base.kind === 'edit') return createDraftFromTemplate(base.template);
    return createDraftFromTemplate(base.template, { id: generateDraftId('tpl') });
}

export function TemplateEditorDialog(props: TemplateEditorDialogProps) {
    const [base, setBase] = useState(props.base);
    return <EditorSessionDialog {...props} base={base} key={base.kind} onReview={setBase} />;
}

type ReviewBase = Extract<TemplateEditorDialogProps['base'], { kind: 'review' }>;
interface ReviewEntry {
    onReview: (base: ReviewBase) => void;
}

function EditorSessionDialog(props: TemplateEditorDialogProps & ReviewEntry) {
    const plural = usePluralMessage();
    // One session per opening (spec 025, D2): created with the dialog, dropped with it.
    const [session] = useState(() => {
        const { base } = props;
        if (base.kind !== 'review') return createEditorSession(initialDraft(base), plural);
        let result =
            base.mode === 'merge'
                ? mergePages(base.baseline, base.shipped, base.copy)
                : differencesOf(base.shipped, base.copy);
        const failed = 'error' in result;
        let mode = base.mode;
        if ('error' in result) {
            reportSheetIssue({
                code: 'template-merge-failed',
                message: 'Merging the shipped page failed',
                details: { stage: mode, error: result.error, templateId: base.copy.id },
            });
            if (mode === 'merge') {
                mode = 'differences';
                result = differencesOf(base.shipped, base.copy);
                if ('error' in result) {
                    reportSheetIssue({
                        code: 'template-merge-failed',
                        message: 'Comparing the shipped page failed',
                        details: { stage: mode, error: result.error, templateId: base.copy.id },
                    });
                }
            }
        }
        return createEditorSession(
            'error' in result ? createDraftFromTemplate(base.copy) : result.draft,
            plural,
            { mode, items: 'error' in result ? [] : result.items, shipped: base.shipped, failed }
        );
    });
    return <EditorDialog {...props} session={session} />;
}

/** Selects the issue's element, opens its group, and focuses the setting (spec 022, R3). */
function focusSetting(nodeId: string, key: string) {
    const focus = () => {
        const target = document.querySelector<HTMLElement>(
            `[data-settings-for="${nodeId}"] [data-setting="${key}"]`
        );
        if (!target) return;
        for (let details = target.closest('details'); details;) {
            details.open = true;
            details = details.parentElement?.closest('details') ?? null;
        }
        target.focus();
        target.scrollIntoView?.({ block: 'nearest' });
    };
    // The settings remount for the new selection first.
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(focus);
    else setTimeout(focus, 0);
}

function EditorDialog({
    base,
    lockTarget = false,
    onClose,
    onSaved,
    session,
    onReview,
}: TemplateEditorDialogProps & ReviewEntry & { session: EditorSession }) {
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');
    // Feature 004: editing a default template targets its override, never the custom library.
    const editingDefault =
        base.kind === 'review' ||
        (base.kind === 'edit' && isDefaultTemplateId(base.template.id, base.template.systemId));

    // The dialog sits outside its own providers, so it reads the session store directly.
    const draft = useStore(session.store, (state) => state.history.present.draft);
    const [mode, setMode] = useState<EditorMode>('edit');
    const [area, setArea] = useState<EditorArea>('page');
    const [discardOpen, setDiscardOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [dropColumns, setDropColumns] = useState<DropColumnsRequest | null>(null);
    const [initialJson] = useState(() => JSON.stringify(draft));
    const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null);
    usePageEditorSession(draft.systemId, draft.id);
    const pending = usePendingUpdate(draft.systemId, draft.id);
    const canReview =
        editingDefault &&
        base.kind === 'edit' &&
        (pending.state === 'base-differs' ||
            pending.state === 'no-base-differs' ||
            pending.state === 'dismissed');
    const reviewDisabled = JSON.stringify(draft) !== initialJson;
    const openReview = () => {
        if (!canReview || reviewDisabled) return;
        const review = reviewBaseFor(pending);
        if (review) onReview(review);
    };

    const commands = useMemo<CommandContext>(
        () => ({
            session,
            clipboard: (action) => clipboardAction(session, action, null),
            openShortcuts: () => setShortcutsOpen(true),
        }),
        [session]
    );
    const handlers = useMemo(() => shortcutHandlers(commands), [commands]);
    useEditorShortcuts(contentElement, mode === 'edit' ? handlers : {});
    useClipboardEvents(mode === 'edit' ? contentElement : null, session);

    const issues = useDraftIssues(draft);
    const groups = useSettingsGroupSession();
    const { setOpen: openGroup } = groups;
    const goToIssue = useCallback(
        ({ nodeId, setting }: DraftIssue) => {
            if (!nodeId) return;
            setMode('edit');
            setArea('settings');
            selectNode(session, nodeId, 'outline');
            reveal(`[data-outline-row="${nodeId}"]`, 'nearest');
            if (!setting) return;
            openGroup(setting.group, true);
            focusSetting(nodeId, setting.key);
        },
        [openGroup, session]
    );

    const { save, confirmation } = useTemplateSave({
        base: base.kind === 'review' ? base.copy : base.kind === 'edit' ? base.template : undefined,
        editingDefault,
        onClose,
        onSaved,
        session,
        specificIssues: issues.specific,
    });
    const requestClose = () => {
        if (JSON.stringify(draft) !== initialJson) setDiscardOpen(true);
        else onClose();
    };
    const clearSelection = commandById('clear-selection');

    return (
        <Dialog.Root
            open
            onOpenChange={(open) => {
                if (!open) requestClose();
            }}
        >
            <EditorProviders
                draft={draft}
                groups={groups}
                issues={issues}
                onDropColumns={setDropColumns}
                session={session}
            >
                <Dialog.Portal container={modalRoot ?? undefined}>
                    <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/50" />
                    <Dialog.Content
                        ref={setContentElement}
                        onEscapeKeyDown={(event) => {
                            // Escape clears a selection first; with none it closes (research R9).
                            const { ids } = session.selection();
                            if (
                                mode !== 'edit' ||
                                isTypingTarget(event.target) ||
                                !clearSelection.enabled?.(commands, ids)
                            ) {
                                return;
                            }
                            event.preventDefault();
                            clearSelection.run?.(commands);
                        }}
                        className="fixed left-1/2 top-1/2 z-[9999] flex h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[110rem] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-bgSurface shadow-xl focus:outline-hidden"
                    >
                        <EditorToolbar
                            commands={commands}
                            mode={mode}
                            name={draft.name}
                            onModeChange={setMode}
                        />
                        <Dialog.Description className="sr-only">
                            {translate(library.title)}
                        </Dialog.Description>
                        {mode === 'edit' && (
                            <EditorTemplateFields
                                draft={draft}
                                targetFixed={editingDefault || lockTarget}
                                kindFixed={editingDefault}
                                review={
                                    canReview
                                        ? { disabled: reviewDisabled, open: openReview }
                                        : undefined
                                }
                            />
                        )}
                        {mode === 'preview' ? (
                            <div className="min-h-0 flex-1 overflow-y-auto bg-bgBase">
                                <EditorPreview draft={draft} />
                            </div>
                        ) : (
                            <EditorPanes
                                area={area}
                                commands={commands}
                                draft={draft}
                                onAreaChange={setArea}
                            />
                        )}
                        <EditorFooter
                            draftIssues={issues.all}
                            notices={issues.notices}
                            onCancel={requestClose}
                            onGoToIssue={goToIssue}
                            onSave={save}
                            saveDisabled={issues.specific.length > 0}
                        />
                    </Dialog.Content>
                </Dialog.Portal>
                <ShortcutList open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
                <EditorConfirms
                    discardOpen={discardOpen}
                    dropColumns={dropColumns}
                    onClose={onClose}
                    onDiscardOpenChange={setDiscardOpen}
                    onDropColumnsDone={() => setDropColumns(null)}
                    save={confirmation}
                />
            </EditorProviders>
        </Dialog.Root>
    );
}
