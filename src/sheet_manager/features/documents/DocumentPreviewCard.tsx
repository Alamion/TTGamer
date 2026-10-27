import { translate } from '@docusaurus/Translate';
import * as Popover from '@radix-ui/react-popover';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { MarkdownView } from '@site/src/shared/components/markdown/MarkdownView';
import { type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { reportSheetIssue } from '../../diagnostics';
import { DocumentSourceContext, useStoreDocumentSource } from '../../hooks/useDocumentSource';
import { useDocumentStore } from '../../store/documentStore';
import { systemRegistry } from '../../systems';
import type { UnknownDocumentEnvelope } from '../../types/document';
import { TemplateMarkdownValueSchema } from '../../types/templateValues';
import { briefViewOf } from '../sheet/panes/views';
import { DocumentLink } from './DocumentLink';
import { DocumentRenderContext, PreviewDepthContext } from './documentRender';

/**
 * A linked document without leaving the page (spec 044, US3, design D9): its brief, or for a
 * kind without one its title and first lines. One card for markdown links and reference fields.
 */

const messages = uiMessages.sheet.links.preview;

const OPEN_DELAY_MS = 400;
const CLOSE_DELAY_MS = 200;
const LONG_PRESS_MS = 500;
/** Lines of a note shown when its kind has no brief. */
const NOTE_LINES = 12;

const reportedMissing = new Set<string>();

/** The first markdown text of a document, cut to its first lines. */
function openingLines(document: UnknownDocumentEnvelope): string {
    for (const value of Object.values(document.templateValues)) {
        const markdown = TemplateMarkdownValueSchema.safeParse(value);
        if (markdown.success && markdown.data.text.trim()) {
            return markdown.data.text.split('\n').slice(0, NOTE_LINES).join('\n');
        }
    }
    return '';
}

const renderNestedLink = (node: Parameters<typeof DocumentLink>[0]['node']) => (
    <DocumentLink node={node} />
);

/** Gives a drawn document its own, read-only source. */
function ReadOnlyDocument({ documentId, children }: { documentId: string; children: ReactNode }) {
    const source = useStoreDocumentSource(documentId);
    const readOnly = useMemo(() => ({ ...source, readOnly: true }), [source]);
    return (
        <DocumentSourceContext.Provider value={readOnly}>{children}</DocumentSourceContext.Provider>
    );
}

/** What a card or an embed shows of a document: its brief, or its title and first lines. */
export function DocumentPreviewContent({ documentId }: { documentId: string }) {
    const render = useContext(DocumentRenderContext);
    const depth = useContext(PreviewDepthContext);
    const entry = useDocumentStore((state) => state.entries.find(({ id }) => id === documentId));
    const document = useDocumentStore((state) =>
        state.documents.find(({ id }) => id === documentId)
    );
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (document || !entry) return;
        let current = true;
        void useDocumentStore
            .getState()
            .loadIntoCache([documentId])
            .then(() => {
                const loaded = useDocumentStore
                    .getState()
                    .documents.some(({ id }) => id === documentId);
                if (current && !loaded) setFailed(true);
            });
        return () => {
            current = false;
        };
    }, [document, entry, documentId]);

    const missing = !entry || failed;
    useEffect(() => {
        if (!missing || reportedMissing.has(documentId)) return;
        reportedMissing.add(documentId);
        reportSheetIssue({
            code: 'link-preview-missing',
            message: 'A preview card or embed could not show its document',
            details: { documentId },
        });
    }, [missing, documentId]);

    if (missing) {
        return <p className="m-0 text-sm text-textSecondary">{translate(messages.missing)}</p>;
    }
    if (!document) {
        return (
            <p role="status" className="m-0 text-sm text-textSecondary">
                {translate(messages.loading)}
            </p>
        );
    }
    const definition = systemRegistry.getDocumentDefinition(
        document.systemId,
        document.definitionId
    );
    const brief = definition ? briefViewOf(definition) : undefined;
    return (
        <PreviewDepthContext.Provider value={depth + 1}>
            <ReadOnlyDocument documentId={documentId}>
                {brief && render ? (
                    render(documentId, brief)
                ) : (
                    <div className="grid gap-1">
                        <p className="m-0 font-semibold text-textPrimary">
                            {document.metadata.title}
                        </p>
                        {openingLines(document) ? (
                            <MarkdownView
                                source={openingLines(document)}
                                renderWikilink={renderNestedLink}
                                headingOffset={2}
                                className="text-sm"
                            />
                        ) : (
                            <p className="m-0 text-sm text-textSecondary">
                                {translate(messages.empty)}
                            </p>
                        )}
                    </div>
                )}
            </ReadOnlyDocument>
        </PreviewDepthContext.Provider>
    );
}

/**
 * Wraps a link to a document: its card opens after a pause on hover or keyboard focus, or on a
 * long press, and closes a moment after the pointer leaves link and card, or on Esc. Inside a card
 * the link is left as it is: cards do not open cards.
 */
export function DocumentPreviewTrigger({
    documentId,
    name,
    children,
}: {
    documentId: string;
    name: string;
    children: ReactNode;
}) {
    const depth = useContext(PreviewDepthContext);
    const [open, setOpen] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const pressed = useRef(false);

    useEffect(() => () => clearTimeout(timer.current), []);

    if (depth > 0) return children;

    const later = (next: boolean, delay: number) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setOpen(next), delay);
    };
    const cancel = () => clearTimeout(timer.current);

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Anchor asChild>
                <span
                    className="inline"
                    onPointerEnter={(event) => {
                        if (event.pointerType === 'mouse') later(true, OPEN_DELAY_MS);
                    }}
                    onPointerLeave={(event) => {
                        if (event.pointerType === 'mouse') later(false, CLOSE_DELAY_MS);
                    }}
                    onPointerDown={(event) => {
                        if (event.pointerType !== 'touch') return;
                        pressed.current = false;
                        clearTimeout(timer.current);
                        timer.current = setTimeout(() => {
                            pressed.current = true;
                            setOpen(true);
                        }, LONG_PRESS_MS);
                    }}
                    onPointerUp={(event) => {
                        if (event.pointerType === 'touch' && !pressed.current) cancel();
                    }}
                    onClickCapture={(event) => {
                        // The click that ends a long press only opened the card.
                        if (!pressed.current) return;
                        pressed.current = false;
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                    onFocus={() => later(true, OPEN_DELAY_MS)}
                    onBlur={() => later(false, CLOSE_DELAY_MS)}
                >
                    {children}
                </span>
            </Popover.Anchor>
            <Popover.Portal>
                <Popover.Content
                    data-preview-card=""
                    aria-label={translate(messages.label, { name })}
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    collisionPadding={8}
                    // Hover and focus show the card; they never move focus into it.
                    onOpenAutoFocus={(event) => event.preventDefault()}
                    onCloseAutoFocus={(event) => event.preventDefault()}
                    onPointerEnter={cancel}
                    onPointerLeave={() => later(false, CLOSE_DELAY_MS)}
                    className="z-50 max-h-[480px] w-[360px] max-w-[calc(100vw-1rem)] overflow-auto rounded-md border border-border bg-bgSurface p-3 shadow-lg"
                >
                    <DocumentPreviewContent documentId={documentId} />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
