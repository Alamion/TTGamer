import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { DraftIssue } from '../issues/draftIssues';
import type { EditorSelectionState } from '../model/selection';
import type { EditorDraft } from '../model/types';
import type { Announcement, MessageDescriptor, Operation, OpRefusal } from '../operations/types';
import type { SwitchStash } from '../settings/keepSettings';
import {
    applyChange,
    createHistory,
    type DraftChangeMeta,
    type EditorHistory,
    redo,
    select,
    undo,
} from './history';

const editor = uiMessages.sheet.templates.editor;

export interface EditorSessionState {
    history: EditorHistory;
    /** Problems a refused operation or a refused save shows until the next change. */
    saveIssues: readonly DraftIssue[];
    /** The last screen-reader message. */
    announcement: string;
}

export type PluralMessage = (
    descriptor: MessageDescriptor,
    count: number,
    values?: Record<string, string | number>
) => string;

/**
 * One editor opening (spec 025, D2): the page being edited, its history and selection, and the
 * settings switches set aside. Created with the dialog and dropped with it; never persisted.
 * Every change goes through `change` (a plain page edit) or `run` (an operation that may be
 * refused, select, and announce).
 */
export interface EditorSession {
    readonly store: StoreApi<EditorSessionState>;
    readonly stash: SwitchStash;
    draft(): EditorDraft;
    selection(): EditorSelectionState;
    change(update: (draft: EditorDraft) => EditorDraft, meta?: DraftChangeMeta): void;
    run(operation: Operation, meta?: Omit<DraftChangeMeta, 'selection'>): boolean;
    select(selection: EditorSelectionState): void;
    undo(): void;
    redo(): void;
    announce(announcement: Announcement | string): void;
    showIssues(issues: readonly DraftIssue[]): void;
}

export function refusalMessage(refusal: OpRefusal): string {
    const limit = String(refusal.limit ?? 0);
    if (refusal.error === 'depth') return translate(editor.depthMessage).replace('{limit}', limit);
    if (refusal.error === 'count') return translate(editor.countMessage).replace('{limit}', limit);
    return translate(editor.cannotMoveIntoItself);
}

export function createEditorSession(draft: EditorDraft, plural: PluralMessage): EditorSession {
    const store = createStore<EditorSessionState>(() => ({
        history: createHistory(draft),
        saveIssues: [],
        announcement: '',
    }));
    const history = () => store.getState().history;
    const describe = ({ message, values = {}, count }: Announcement): string => {
        const text = Object.fromEntries(
            Object.entries(values).map(([key, value]) => [
                key,
                typeof value === 'object'
                    ? value.map((descriptor) => translate(descriptor)).join(', ')
                    : value,
            ])
        );
        return count === undefined ? translate(message, text) : plural(message, count, text);
    };
    const session: EditorSession = {
        store,
        stash: new Map(),
        draft: () => history().present.draft,
        selection: () => history().present.selection,
        change(update, meta) {
            const current = history();
            store.setState({
                history: applyChange(current, update(current.present.draft), meta),
                saveIssues: [],
            });
        },
        run(operation, meta = {}) {
            const current = history();
            const result = operation(current.present.draft, current.present.selection);
            if (!result.ok) {
                const message = refusalMessage(result);
                store.setState({ saveIssues: [{ message }], announcement: message });
                return false;
            }
            store.setState({
                history: applyChange(current, result.draft, {
                    ...meta,
                    ...(result.selection ? { selection: result.selection } : {}),
                }),
                saveIssues: [],
                ...(result.announce ? { announcement: describe(result.announce) } : {}),
            });
            return true;
        },
        select(selection) {
            store.setState({ history: select(history(), selection) });
        },
        undo() {
            store.setState({ history: undo(history()) });
        },
        redo() {
            store.setState({ history: redo(history()) });
        },
        announce(announcement) {
            store.setState({
                announcement:
                    typeof announcement === 'string' ? announcement : describe(announcement),
            });
        },
        showIssues(issues) {
            store.setState({ saveIssues: issues });
        },
    };
    return session;
}
