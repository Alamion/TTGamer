import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { linkName, splitLinkTarget } from '@site/src/shared/markdown/links';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';

import { reportSheetIssue } from '../../../diagnostics';
import { useDocumentSource } from '../../../hooks/useDocumentSource';
import type { DocumentIndexEntry } from '../../../store/documentIndex';
import { useDocumentStore } from '../../../store/documentStore';
import { linksOf, sourcesNaming, useLinkIndex } from '../../../store/linkIndexStore';
import type { TemplateField } from '../../../types/template';
import { DocumentPreviewTrigger } from '../../documents/DocumentPreviewCard';
import { useFollowDocument } from '../../documents/followLink';
import { documentLabeler } from '../../documents/labeler';
import { type LinkBuckets, linkBuckets, resolveLink } from '../../documents/linkResolve';
import { useBriefPage } from './areaLayout';
import type { TemplateFieldControlProps } from './fieldControls';

const messages = uiMessages.sheet.links.mentions;

/** At most this many linking documents are listed (constitution VII). */
export const MENTIONS_SOURCES_MAX = 200;

type MentionsField = Extract<TemplateField, { type: 'mentions' }>;

interface Mention {
    source: DocumentIndexEntry;
    line: number;
    context: string;
}

/** The links of other documents that mean `target`, in source order, and whether some were left out. */
export function mentionsOf(
    target: DocumentIndexEntry,
    buckets: LinkBuckets
): { mentions: Mention[]; truncated: boolean } {
    const wanted = linkName(target.name);
    const sources = sourcesNaming(target.name)
        .flatMap((id) => {
            const source = buckets.byId.get(id);
            return source && source.id !== target.id ? [source] : [];
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    const mentions: Mention[] = [];
    for (const source of sources.slice(0, MENTIONS_SOURCES_MAX)) {
        for (const row of linksOf(source.id)) {
            const link = splitLinkTarget(row.reference);
            if (linkName(link.name) !== wanted) continue;
            if (resolveLink(link, source.parentId, buckets)?.id !== target.id) continue;
            mentions.push({ source, line: row.line, context: row.context });
        }
    }
    return { mentions, truncated: sources.length > MENTIONS_SOURCES_MAX };
}

/**
 * "Mentioned in" (spec 044, US5): the documents whose markdown links to the shown one, each line
 * around a link opening its document at that line. It stores nothing.
 */
export function MentionsFieldControl({ field }: TemplateFieldControlProps) {
    const own = field as MentionsField;
    const brief = useBriefPage();
    const { document } = useDocumentSource();
    const entries = useDocumentStore((state) => state.entries);
    const folders = useDocumentStore((state) => state.folders);
    const ready = useLinkIndex((state) => state.ready);
    // Moves with every saved link record, so the list follows edits elsewhere.
    useLinkIndex((state) => state.version);
    const follow = useFollowDocument();
    const [all, setAll] = useState(false);

    const buckets = linkBuckets(entries, folders);
    const target = document ? buckets.byId.get(document.id) : undefined;
    const { mentions, truncated } = target
        ? mentionsOf(target, buckets)
        : { mentions: [], truncated: false };

    useEffect(() => {
        if (!truncated || !target) return;
        reportSheetIssue({
            code: 'mentions-truncated',
            message: 'More documents mention this one than "Mentioned in" reads',
            details: { documentId: target.id, read: MENTIONS_SOURCES_MAX },
        });
    }, [truncated, target]);

    if (!ready) {
        return (
            <p role="status" className="m-0 text-sm text-textSecondary">
                {translate(messages.loading)}
            </p>
        );
    }
    if (mentions.length === 0) {
        return <p className="m-0 text-sm text-textSecondary">{translate(messages.empty)}</p>;
    }
    const shown = all ? mentions : mentions.slice(0, own.maxShown);
    return (
        <div className={clsx('grid', brief ? 'gap-0.5' : 'gap-1')}>
            <ul className="m-0 grid list-none gap-1 p-0" aria-label={own.label}>
                {shown.map(({ source, line, context }, index) => (
                    <li key={`${source.id}:${String(line)}:${String(index)}`} className="min-w-0">
                        <DocumentPreviewTrigger
                            documentId={source.id}
                            name={source.name}
                            onFollow={(newTab) => follow(source.id, { newTab, line })}
                        >
                            <button
                                type="button"
                                onClick={() => follow(source.id, { line })}
                                title={translate(messages.open, { name: source.name })}
                                className="grid w-full min-w-0 gap-0 rounded-sm px-1 py-0.5 text-left hover:bg-bgBase"
                            >
                                <span className="truncate text-sm text-textPrimary">
                                    {source.name}
                                    <span className="text-xs text-textSecondary">
                                        {' · '}
                                        {documentLabeler.kind(source.systemId, source.kind)}
                                    </span>
                                </span>
                                {!brief && (
                                    <span className="truncate text-xs text-textSecondary">
                                        {context}
                                    </span>
                                )}
                            </button>
                        </DocumentPreviewTrigger>
                    </li>
                ))}
            </ul>
            {mentions.length > own.maxShown && (
                <button
                    type="button"
                    aria-expanded={all}
                    onClick={() => setAll(!all)}
                    className="justify-self-start rounded-sm px-1 text-xs text-primary hover:underline"
                >
                    {all
                        ? translate(messages.showFewer)
                        : translate(messages.showAll, { count: mentions.length })}
                </button>
            )}
            {truncated && (
                <p className="m-0 text-xs text-textSecondary">
                    {translate(messages.truncated, { count: MENTIONS_SOURCES_MAX })}
                </p>
            )}
        </div>
    );
}
