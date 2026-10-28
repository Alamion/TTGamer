import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import * as Popover from '@radix-ui/react-popover';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import {
    type MarkdownEmbed,
    MarkdownView,
    type MarkdownWikilink,
} from '@site/src/shared/components/markdown/MarkdownView';
import { linkName } from '@site/src/shared/markdown/links';
import { modalRoot } from '@site/src/shared/utils/modalRoot';
import { type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { reportSheetIssue } from '../../diagnostics';
import { DocumentSourceContext, useStoreDocumentSource } from '../../hooks/useDocumentSource';
import { useDocumentStore } from '../../store/documentStore';
import { systemRegistry } from '../../systems';
import type { UnknownDocumentEnvelope } from '../../types/document';
import type { TemplateNode } from '../../types/template';
import { TemplateMarkdownValueSchema } from '../../types/templateValues';
import { DeclarativeSheetView } from '../sheet/declarative/DeclarativeSheetView';
import { anchorName, sourceAnchorNames } from '../sheet/declarative/sectionAnchors';
import { briefViewOf } from '../sheet/panes/views';
import { DocumentEmbed } from './DocumentEmbed';
import { DocumentLink } from './DocumentLink';
import { DocumentRenderContext, PreviewDepthContext } from './documentRender';
import { defaultPageOf, sectionText } from './linkSuggestions';

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

/** The markdown texts of a document with the pictures each one stores. */
function markdownValues(
    document: UnknownDocumentEnvelope
): Array<{ text: string; images: ReadonlySet<string> }> {
    return Object.values(document.templateValues).flatMap((value) => {
        const markdown = TemplateMarkdownValueSchema.safeParse(value);
        return markdown.success
            ? [
                  {
                      text: markdown.data.text,
                      images: new Set(Object.keys(markdown.data.images ?? {})),
                  },
              ]
            : [];
    });
}

const renderNestedLink = (node: MarkdownWikilink) => <DocumentLink node={node} />;

/** Embeds inside a drawn document: its own pictures stay pictures (shown as their names). */
const nestedEmbeds = (images: ReadonlySet<string>) => (node: MarkdownEmbed) =>
    images.has(node.name) ? undefined : <DocumentEmbed node={node} />;

/** Gives a drawn document its own, read-only source. */
export function ReadOnlyDocument({
    documentId,
    children,
}: {
    documentId: string;
    children: ReactNode;
}) {
    const source = useStoreDocumentSource(documentId);
    const readOnly = useMemo(() => ({ ...source, readOnly: true }), [source]);
    return (
        <DocumentSourceContext.Provider value={readOnly}>{children}</DocumentSourceContext.Provider>
    );
}

/** One section of a document: a markdown heading's part, or a titled node of its page. */
function sectionContent(
    document: UnknownDocumentEnvelope,
    section: string,
    locale: string
): ReactNode {
    for (const { text, images } of markdownValues(document)) {
        const part = sectionText(text, section);
        if (part !== undefined) {
            return (
                <MarkdownView
                    source={part}
                    renderWikilink={renderNestedLink}
                    renderEmbed={nestedEmbeds(images)}
                    headingOffset={2}
                    className="text-sm"
                />
            );
        }
    }
    const page = defaultPageOf({ ...document, templateId: document.metadata.templateId }, locale);
    const sources =
        page &&
        sourceAnchorNames(
            defaultPageOf({ ...document, templateId: document.metadata.templateId }, 'en')
                ?.children ?? []
        );
    const wanted = linkName(section);
    const find = (nodes: readonly TemplateNode[]): TemplateNode | undefined => {
        for (const node of nodes) {
            const shown = anchorName(node);
            if (
                (shown && linkName(shown) === wanted) ||
                linkName(sources?.get(node.id) ?? '') === wanted
            ) {
                return node;
            }
            if ('children' in node && Array.isArray(node.children)) {
                const inner = find(node.children as readonly TemplateNode[]);
                if (inner) return inner;
            }
        }
        return undefined;
    };
    const node = page && find(page.children);
    if (!page || !node) return undefined;
    return <DeclarativeSheetView template={{ ...page, children: [node] }} embedded />;
}

/**
 * What a card or an embed shows of a document: its brief, or its title and first lines (`whole`:
 * all of its text); with `section`, only that part of it.
 */
export function DocumentPreviewContent({
    documentId,
    whole = false,
    section,
}: {
    documentId: string;
    whole?: boolean;
    section?: string;
}) {
    const render = useContext(DocumentRenderContext);
    const depth = useContext(PreviewDepthContext);
    const locale = useDocusaurusContext().i18n.currentLocale;
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
    const part = document && section ? sectionContent(document, section, locale) : undefined;
    const sectionMissing = Boolean(document && section && part === undefined);
    useEffect(() => {
        if (!missing || reportedMissing.has(documentId)) return;
        reportedMissing.add(documentId);
        reportSheetIssue({
            code: 'link-preview-missing',
            message: 'A preview card or embed could not show its document',
            details: { documentId },
        });
    }, [missing, documentId]);
    useEffect(() => {
        if (!sectionMissing) return;
        reportSheetIssue({
            code: 'link-section-missing',
            message: 'An embedded section is not on its document; the whole document shows',
            details: { documentId, section },
        });
    }, [sectionMissing, documentId, section]);

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
    const [first] = markdownValues(document).filter(({ text }) => text.trim());
    const text =
        first && (whole ? first.text : first.text.split('\n').slice(0, NOTE_LINES).join('\n'));
    return (
        <PreviewDepthContext.Provider value={depth + 1}>
            <ReadOnlyDocument documentId={documentId}>
                {part ??
                    (brief && render ? (
                        render(documentId, brief)
                    ) : (
                        <div className="grid gap-1">
                            <p className="m-0 font-semibold text-textPrimary">
                                {document.metadata.title}
                            </p>
                            {first && text ? (
                                <MarkdownView
                                    source={text}
                                    renderWikilink={renderNestedLink}
                                    renderEmbed={nestedEmbeds(first.images)}
                                    headingOffset={2}
                                    className="text-sm"
                                />
                            ) : (
                                <p className="m-0 text-sm text-textSecondary">
                                    {translate(messages.empty)}
                                </p>
                            )}
                        </div>
                    ))}
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
            <Popover.Portal container={modalRoot()}>
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
                    className="z-[1000] max-h-[480px] w-[360px] max-w-[calc(100vw-1rem)] overflow-auto rounded-md border border-border bg-bgSurface p-3 shadow-lg"
                >
                    <DocumentPreviewContent documentId={documentId} />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
