import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import {
    MARKDOWN_LINK_CLASSES,
    type MarkdownWikilink,
} from '@site/src/shared/components/markdown/MarkdownView';
import { splitLinkTarget } from '@site/src/shared/markdown/links';
import { type MouseEvent, useEffect, useMemo, useState } from 'react';

import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog';
import { reportSheetIssue } from '../../diagnostics';
import { useDocumentSource } from '../../hooks/useDocumentSource';
import { useDocumentStore } from '../../store/documentStore';
import { DocumentPreviewTrigger } from './DocumentPreviewCard';
import { createLinkedDocument, linkNoteKind, useFollowDocument } from './followLink';
import { linkBuckets, resolveLink } from './linkResolve';

const messages = uiMessages.sheet.links;

/** Unresolved links already reported, so a page re-render does not report them again. */
const reported = new Set<string>();

/** The document a link in the shown document means, and the folder that document sits in. */
export function useLinkTarget(raw: string) {
    const { document: source } = useDocumentSource();
    const entries = useDocumentStore((state) => state.entries);
    const folders = useDocumentStore((state) => state.folders);
    return useMemo(() => {
        const buckets = linkBuckets(entries, folders);
        const target = splitLinkTarget(raw);
        const sourceParentId = source ? buckets.byId.get(source.id)?.parentId : undefined;
        return {
            target,
            sourceId: source?.id,
            sourceParentId,
            entry: resolveLink(target, sourceParentId, buckets),
        };
    }, [raw, source, entries, folders]);
}

/** A `[[link]]` in markdown (spec 044, US1): follows its document, or offers to create it. */
export function DocumentLink({ node }: { node: MarkdownWikilink }) {
    const { preview } = useDocumentSource();
    const { target, sourceId, sourceParentId, entry } = useLinkTarget(node.target);
    const follow = useFollowDocument();
    const [asking, setAsking] = useState(false);
    const text = node.alias ?? node.target;

    useEffect(() => {
        if (entry || preview) return;
        const key = `${sourceId ?? ''}\u0000${target.reference}`;
        if (reported.has(key)) return;
        reported.add(key);
        reportSheetIssue({
            code: 'link-unresolved',
            message: 'A link names no document; it shows as unresolved',
            details: { documentId: sourceId, link: target.reference },
        });
    }, [entry, preview, sourceId, target.reference]);

    if (entry) {
        const open = (event: MouseEvent, newTab: boolean) => {
            event.preventDefault();
            follow(entry.id, { newTab, ...(target.section ? { section: target.section } : {}) });
        };
        return (
            <DocumentPreviewTrigger documentId={entry.id} name={entry.name}>
                <a
                    href={`?doc=${encodeURIComponent(entry.id)}`}
                    className={MARKDOWN_LINK_CLASSES}
                    title={translate(messages.link.openInNewTab, { name: entry.name })}
                    onClick={(event) => open(event, event.ctrlKey || event.metaKey)}
                    onAuxClick={(event) => {
                        if (event.button === 1) open(event, true);
                    }}
                >
                    {text}
                </a>
            </DocumentPreviewTrigger>
        );
    }

    const canCreate = !preview && linkNoteKind() !== undefined;
    const unresolvedTitle = translate(messages.link.unresolved, { name: target.name });
    if (!canCreate) {
        return (
            <span
                className="text-textSecondary underline decoration-dashed underline-offset-2"
                title={unresolvedTitle}
            >
                {text}
            </span>
        );
    }
    return (
        <>
            <button
                type="button"
                className="cursor-pointer text-textSecondary underline decoration-dashed underline-offset-2 hover:text-primary"
                title={unresolvedTitle}
                onClick={() => setAsking(true)}
            >
                {text}
            </button>
            <ConfirmDialog
                open={asking}
                onOpenChange={setAsking}
                title={translate(messages.createPrompt.title, { name: target.name })}
                description={translate(messages.createPrompt.body, { name: target.name })}
                confirmLabel={translate(messages.createPrompt.confirm)}
                cancelLabel={translate(messages.createPrompt.cancel)}
                onConfirm={() => {
                    const id = createLinkedDocument(target.name, sourceParentId ?? null);
                    if (id) follow(id);
                }}
            />
        </>
    );
}
