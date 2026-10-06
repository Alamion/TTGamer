import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useEffect } from 'react';

import { reportSheetIssue } from '../../../diagnostics';
import {
    copySelection,
    parseCopied,
    pasteCopied,
    rememberCopied,
    rememberedCopy,
    serializeCopied,
} from '../clipboard';
import { isTypingTarget } from '../commands/keys';
import { clipboardKey } from '../commands/list';
import { removeNodes } from '../operations/multi';
import { selectOnly } from '../selection';
import { revealNode } from './actions';
import type { EditorSession } from './store';

const editor = uiMessages.sheet.templates.editor;

export type ClipboardAction = 'copy' | 'cut' | 'paste';

/**
 * Copy, cut, and paste of elements (spec 023, research R2). Returns false when there is nothing
 * for the editor to do, so the browser keeps its own behavior.
 */
export function clipboardAction(
    session: EditorSession,
    action: ClipboardAction,
    data: DataTransfer | null
): boolean {
    const present = session.draft();
    const chosen = session.selection();
    if (action !== 'paste') {
        const copied = copySelection(present, chosen.ids);
        if (!copied) return false;
        rememberCopied(copied);
        const text = serializeCopied(copied);
        if (data) data.setData('text/plain', text);
        else void navigator.clipboard?.writeText(text).catch(() => undefined);
        if (action === 'cut') {
            session.run((draft) => {
                const removed = removeNodes(draft, chosen.ids);
                return {
                    ok: true,
                    draft: removed.draft,
                    selection: selectOnly(removed.next),
                    announce: {
                        message: editor.cutDone,
                        count: removed.count,
                        values: { count: removed.count },
                    },
                };
            });
        }
        return true;
    }
    const text = data?.getData('text/plain') ?? '';
    let copied = text ? undefined : rememberedCopy();
    if (text) {
        const parsed = parseCopied(text, present);
        if (!parsed.ok) {
            if (parsed.stage === 'ignored') return false;
            const message = translate(
                parsed.stage === 'version' ? editor.clipboardNewer : editor.clipboardUnreadable
            );
            reportSheetIssue({
                code: 'template-clipboard-invalid',
                message: 'Pasted elements were refused',
                details: { stage: parsed.stage, error: parsed.error },
            });
            session.showIssues([{ message }]);
            session.announce(message);
            return true;
        }
        copied = parsed.copied;
    }
    if (!copied) return false;
    const pasted = copied;
    let first: string | undefined;
    session.run((draft, selection) => {
        const result = pasteCopied(draft, pasted, selection.ids);
        if (!result.ok) return result;
        first = result.ids[0];
        const count = result.ids.length;
        return {
            ok: true,
            draft: result.draft,
            selection: { ids: result.ids, anchor: result.ids[count - 1]! },
            announce: { message: editor.pasted, count, values: { count } },
        };
    });
    if (first) revealNode(session, first);
    return true;
}

/**
 * The page's clipboard events and the Ctrl/⌘+C, X, V fallback for Safari, which sends no
 * clipboard events without a text selection.
 */
export function useClipboardEvents(element: HTMLElement | null, session: EditorSession) {
    useEffect(() => {
        if (!element) return;
        const textSelected = () => {
            const selected = window.getSelection?.();
            return Boolean(selected && !selected.isCollapsed && selected.toString());
        };
        let pending: ClipboardAction | null = null;
        const onKeyDown = (event: KeyboardEvent) => {
            const action = clipboardKey(event);
            if (!action || isTypingTarget(event.target) || textSelected()) return;
            pending = action;
            setTimeout(() => {
                if (pending !== action) return;
                pending = null;
                clipboardAction(session, action, null);
            }, 0);
        };
        const onClipboard = (event: ClipboardEvent) => {
            pending = null;
            if (isTypingTarget(event.target) || textSelected()) return;
            const action = event.type as ClipboardAction;
            if (clipboardAction(session, action, event.clipboardData)) event.preventDefault();
        };
        element.addEventListener('keydown', onKeyDown);
        for (const type of ['copy', 'cut', 'paste']) {
            element.addEventListener(type, onClipboard as EventListener);
        }
        return () => {
            element.removeEventListener('keydown', onKeyDown);
            for (const type of ['copy', 'cut', 'paste']) {
                element.removeEventListener(type, onClipboard as EventListener);
            }
        };
    }, [element, session]);
}
