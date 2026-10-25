import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useNoteRollCode } from '@site/src/integrations/sheet-dice/noteRolls';
import {
    type MarkdownIssue,
    MarkdownView,
} from '@site/src/shared/components/markdown/MarkdownView';
import { toggleTaskLine } from '@site/src/shared/markdown/parse';
import { clsx } from 'clsx';
import {
    Bold,
    Check,
    ChevronRight,
    Italic,
    Link,
    ListChecks,
    MessageSquareDashed,
    MessageSquareQuote,
    Pencil,
} from 'lucide-react';
import {
    type KeyboardEvent,
    type ReactNode,
    useCallback,
    useDeferredValue,
    useEffect,
    useId,
    useRef,
    useState,
} from 'react';

import { Splitter } from '../../../../shared/components/Splitter';
import { reportSheetIssue } from '../../../diagnostics';
import { useDocumentSource } from '../../../hooks/useDocumentSource';
import type { TemplateField } from '../../../types/template';
import { TEMPLATE_VALUES_LIMITS, type TemplateMarkdownValue } from '../../../types/templateValues';
import { claimNewDocumentFocus } from '../../documents/newDocumentFocus';
import { useBriefPage } from './areaLayout';
import type { TemplateFieldControlProps } from './fieldControls';
import {
    applyEdit,
    insertCallout,
    linkSelection,
    type MarkdownEdit,
    toggleChecklist,
    wrapSelection,
} from './markdownEdits';

const messages = uiMessages.shared.markdown.editor;
type MarkdownField = Extract<TemplateField, { type: 'markdown' }>;

/** Wide enough for source and result side by side (design D7). */
const SPLIT_MIN_WIDTH = 720;
const PANE_MIN = 240;

function readValue(value: unknown): TemplateMarkdownValue {
    if (typeof value === 'object' && value !== null && 'text' in value) {
        return value as TemplateMarkdownValue;
    }
    return { text: '' };
}

/** The browser's own insert keeps an edit in its undo history; it is missing in some engines. */
function insertUndoably(insert: string): boolean {
    try {
        return document.execCommand('insertText', false, insert);
    } catch {
        return false;
    }
}

function reportIssue(issue: MarkdownIssue) {
    reportSheetIssue({
        code: 'markdown-render-issue',
        message:
            issue.code === 'unknown-callout'
                ? 'A callout type has no color of its own; it shows as a neutral callout'
                : 'An image address is not HTTPS; it shows as a link',
        details: issue.code === 'unknown-callout' ? { kind: issue.kind } : { src: issue.src },
    });
}

/** The width of an element, followed as it changes. */
function useWidth(ref: React.RefObject<HTMLElement | null>): number {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const element = ref.current;
        if (!element || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(([entry]) => {
            if (entry) setWidth(entry.contentRect.width);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref]);
    return width;
}

const toolButton =
    'inline-flex h-8 w-8 items-center justify-center rounded-sm text-textSecondary hover:bg-bgBase hover:text-textPrimary focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50';
const modeButton =
    'inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs font-bold text-textSecondary hover:border-primary hover:text-primary focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary';

/** The brief look: the text behind a fold, read-only except its checklist (spec 043, US5). */
function BriefMarkdown({
    label,
    text,
    renderCode,
    onToggleTask,
}: {
    label: string;
    text: string;
    renderCode: (code: string) => ReactNode;
    onToggleTask?: (line: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const bodyId = useId();
    const view = uiMessages.shared.markdown.view;
    return (
        <div className="flex min-w-0 flex-col gap-1">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={bodyId}
                onClick={() => setOpen((current) => !current)}
                className={clsx(modeButton, 'self-start')}
            >
                <ChevronRight
                    aria-hidden
                    className={clsx('h-3.5 w-3.5 transition-transform', open && 'rotate-90')}
                />
                {translate(open ? view.fold : view.unfold, { title: label })}
            </button>
            {open && (
                <div id={bodyId} className="text-sm">
                    {text === '' ? (
                        <p className="text-textSecondary">{translate(messages.empty)}</p>
                    ) : (
                        <MarkdownView
                            source={text}
                            renderCode={renderCode}
                            onToggleTask={onToggleTask}
                            onIssue={reportIssue}
                            headingOffset={2}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

/** A markdown field (spec 043): rendered text to read, a plain text field with help to write. */
export function MarkdownFieldControl({
    disabled,
    field,
    onChange,
    value,
}: TemplateFieldControlProps) {
    const own = field as MarkdownField;
    const current = readValue(value);
    const text = current.text;
    // A brief only shows the text, folded (spec 043, US5): it is edited on the full page.
    const brief = useBriefPage();
    const readOnly = disabled || brief;
    const [mode, setMode] = useState<'read' | 'edit'>(() =>
        text === '' && !readOnly ? 'edit' : 'read'
    );
    const [narrowView, setNarrowView] = useState<'source' | 'result'>('source');
    const [sourceWidth, setSourceWidth] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const editButtonRef = useRef<HTMLButtonElement>(null);
    const width = useWidth(containerRef);
    const deferredText = useDeferredValue(text);
    const renderCode = useNoteRollCode();
    const editing = mode === 'edit' && !readOnly;
    const documentId = useDocumentSource().document?.id;
    // An empty text starts in edit mode; a document just created gives it the cursor (T015).
    const [startedEmpty] = useState(text === '');
    useEffect(() => {
        if (!startedEmpty || readOnly || !documentId) return;
        return claimNewDocumentFocus(documentId, () => textareaRef.current?.focus());
    }, [startedEmpty, readOnly, documentId]);
    const split = width >= SPLIT_MIN_WIDTH;
    const full = text.length >= TEMPLATE_VALUES_LIMITS.markdownMaxLength;

    const writeText = useCallback(
        (next: string) => onChange({ ...current, text: next }),
        [current, onChange]
    );

    const toggleTask = useCallback(
        (line: number) => writeText(toggleTaskLine(text, line)),
        [text, writeText]
    );

    const applyMarkup = (
        build: (text: string, selection: { start: number; end: number }) => MarkdownEdit
    ) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const edit = build(textarea.value, {
            start: textarea.selectionStart,
            end: textarea.selectionEnd,
        });
        textarea.focus();
        textarea.setSelectionRange(edit.from, edit.to);
        if (!insertUndoably(edit.insert)) writeText(applyEdit(textarea.value, edit));
        requestAnimationFrame(() => textarea.setSelectionRange(edit.selectFrom, edit.selectTo));
    };

    const setReading = () => {
        setMode('read');
        requestAnimationFrame(() => editButtonRef.current?.focus());
    };
    const setEditing = () => {
        setMode('edit');
        requestAnimationFrame(() => textareaRef.current?.focus());
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (readOnly) return;
        const command = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();
        if (command && !event.shiftKey && !event.altKey && key === 'e') {
            event.preventDefault();
            if (editing) setReading();
            else setEditing();
            return;
        }
        if (!editing) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            setReading();
            return;
        }
        if (!command || event.shiftKey || event.altKey) return;
        const placeholder = translate(messages.linkText);
        const markup: Record<
            string,
            (value: string, selection: { start: number; end: number }) => MarkdownEdit
        > = {
            b: (value, selection) => wrapSelection(value, selection, '**', placeholder),
            i: (value, selection) => wrapSelection(value, selection, '*', placeholder),
            k: (value, selection) => linkSelection(value, selection, placeholder),
            l: toggleChecklist,
        };
        const build = markup[key];
        if (build) {
            event.preventDefault();
            applyMarkup(build);
        }
    };

    const tools: ReadonlyArray<{
        label: { id: string; message: string };
        icon: typeof Bold;
        build: (value: string, selection: { start: number; end: number }) => MarkdownEdit;
    }> = [
        {
            label: messages.bold,
            icon: Bold,
            build: (v, s) => wrapSelection(v, s, '**', translate(messages.linkText)),
        },
        {
            label: messages.italic,
            icon: Italic,
            build: (v, s) => wrapSelection(v, s, '*', translate(messages.linkText)),
        },
        {
            label: messages.link,
            icon: Link,
            build: (v, s) => linkSelection(v, s, translate(messages.linkText)),
        },
        { label: messages.checklist, icon: ListChecks, build: toggleChecklist },
        {
            label: messages.callout,
            icon: MessageSquareQuote,
            build: (v, s) => insertCallout(v, s, translate(messages.calloutTitle), false),
        },
        {
            label: messages.foldedCallout,
            icon: MessageSquareDashed,
            build: (v, s) => insertCallout(v, s, translate(messages.calloutTitle), true),
        },
    ];

    const preview = (
        <MarkdownView
            source={editing ? deferredText : text}
            renderCode={renderCode}
            onToggleTask={disabled ? undefined : toggleTask}
            onIssue={reportIssue}
        />
    );

    const source = (
        <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => writeText(event.target.value)}
            maxLength={TEMPLATE_VALUES_LIMITS.markdownMaxLength}
            rows={own.rows}
            aria-label={own.label}
            spellCheck
            className="w-full resize-y rounded-sm border border-border bg-bgSurface p-2 font-mono text-sm text-textPrimary focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
    );

    const splitWidth = Math.min(
        Math.max(sourceWidth ?? Math.round(width / 2), PANE_MIN),
        Math.max(PANE_MIN, width - PANE_MIN)
    );

    if (brief) {
        return (
            <BriefMarkdown
                label={own.label}
                text={text}
                renderCode={renderCode}
                onToggleTask={disabled ? undefined : toggleTask}
            />
        );
    }

    return (
        // Ctrl+E and Esc work wherever focus is inside the field: its buttons or the text.
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
            ref={containerRef}
            className="flex min-w-0 flex-col gap-2"
            onKeyDown={onKeyDown}
            data-markdown-mode={editing ? 'edit' : 'read'}
        >
            {!disabled && (
                <div className="flex flex-wrap items-center gap-1">
                    {editing ? (
                        <>
                            <div
                                role="toolbar"
                                aria-label={translate(messages.toolbar)}
                                className="flex flex-wrap items-center gap-0.5"
                            >
                                {tools.map(({ label, icon: Icon, build }) => (
                                    <button
                                        key={label.id}
                                        type="button"
                                        className={toolButton}
                                        aria-label={translate(label)}
                                        title={translate(label)}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => applyMarkup(build)}
                                    >
                                        <Icon className="h-4 w-4" aria-hidden />
                                    </button>
                                ))}
                            </div>
                            {!split && (
                                <div className="flex items-center gap-1" role="group">
                                    {(['source', 'result'] as const).map((view) => (
                                        <button
                                            key={view}
                                            type="button"
                                            aria-pressed={narrowView === view}
                                            onClick={() => setNarrowView(view)}
                                            className={clsx(
                                                modeButton,
                                                narrowView === view && 'border-primary text-primary'
                                            )}
                                        >
                                            {translate(
                                                view === 'source'
                                                    ? messages.source
                                                    : messages.preview
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button
                                type="button"
                                className={clsx(modeButton, 'ml-auto')}
                                title={translate(messages.doneTitle)}
                                onClick={setReading}
                            >
                                <Check className="h-3.5 w-3.5" aria-hidden />
                                {translate(messages.done)}
                            </button>
                        </>
                    ) : (
                        <button
                            ref={editButtonRef}
                            type="button"
                            className={clsx(modeButton, 'ml-auto')}
                            title={translate(messages.editTitle)}
                            onClick={setEditing}
                        >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            {translate(messages.edit)}
                        </button>
                    )}
                </div>
            )}
            {editing ? (
                split ? (
                    <div className="flex min-w-0 items-stretch gap-2">
                        <div className="min-w-0 shrink-0" style={{ width: splitWidth }}>
                            {source}
                        </div>
                        <Splitter
                            label={translate(messages.split)}
                            value={splitWidth}
                            min={PANE_MIN}
                            max={Math.max(PANE_MIN, width - PANE_MIN)}
                            clamp={(next) =>
                                Math.min(
                                    Math.max(next, PANE_MIN),
                                    Math.max(PANE_MIN, width - PANE_MIN)
                                )
                            }
                            onPreview={setSourceWidth}
                            onChange={setSourceWidth}
                            onReset={() => setSourceWidth(null)}
                        />
                        <div className="min-w-0 flex-1 overflow-auto rounded-sm border border-border p-2">
                            {preview}
                        </div>
                    </div>
                ) : narrowView === 'source' ? (
                    source
                ) : (
                    <div className="rounded-sm border border-border p-2">{preview}</div>
                )
            ) : text === '' ? (
                <p className="text-sm text-textSecondary">{translate(messages.empty)}</p>
            ) : (
                preview
            )}
            {editing && full && (
                <p role="status" className="text-xs text-warning">
                    {translate(messages.full, {
                        max: TEMPLATE_VALUES_LIMITS.markdownMaxLength.toLocaleString(),
                    })}
                </p>
            )}
        </div>
    );
}
