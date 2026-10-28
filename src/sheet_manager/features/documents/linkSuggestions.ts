import { plainText } from '@site/src/shared/components/markdown/MarkdownView';
import { linkName } from '@site/src/shared/markdown/links';
import { parseMarkdown } from '@site/src/shared/markdown/parse';
import type { MarkdownTopBlock } from '@site/src/shared/markdown/types';

import { readEnvelope } from '../../store/documentContent';
import type { DocumentIndexEntry } from '../../store/documentIndex';
import { useDocumentStore } from '../../store/documentStore';
import { useTemplateStore } from '../../store/templateStore';
import { systemRegistry } from '../../systems';
import { resolveEffectiveTemplate } from '../../systems/view';
import type { UnknownDocumentEnvelope } from '../../types/document';
import type { CustomTemplate } from '../../types/template';
import { TemplateMarkdownValueSchema } from '../../types/templateValues';
import { localizeTemplate } from '../sheet/declarative/localizeTemplate';
import { anchorName } from '../sheet/declarative/sectionAnchors';
import {
    folderChain,
    folderPathOf,
    type LinkBuckets,
    linkCandidates,
    linkReferenceFor,
} from './linkResolve';

/**
 * What `[[` suggests while a link is typed (spec 044, US2, design D8): documents by name, those
 * starting with the typed text first, then the nearest; after `#`, the target's sections.
 */

export const SUGGESTIONS_MAX = 20;

/** An open link before the caret: `[[name` or `[[name#section`, on one line. */
export interface LinkQuery {
    /** Where `[[` starts. */
    from: number;
    /** Where the replaced text ends: the caret, or after a `]]` right behind it. */
    to: number;
    name: string;
    section?: string;
}

const OPEN_LINK = /\[\[([^[\]|\n]*)$/;

/** The link being typed at the caret, if any. */
export function linkQueryAt(text: string, caret: number): LinkQuery | undefined {
    const lineStart = text.lastIndexOf('\n', caret - 1) + 1;
    const match = OPEN_LINK.exec(text.slice(lineStart, caret));
    if (!match) return undefined;
    const raw = match[1] ?? '';
    const hash = raw.indexOf('#');
    return {
        from: lineStart + match.index,
        to: text.startsWith(']]', caret) ? caret + 2 : caret,
        name: hash >= 0 ? raw.slice(0, hash) : raw,
        ...(hash >= 0 ? { section: raw.slice(hash + 1) } : {}),
    };
}

export interface DocumentSuggestion {
    entry: DocumentIndexEntry;
    /** What the link will name: the name, or the folder path when the name alone finds another. */
    reference: string;
    folder: string;
}

/** Documents whose name holds the typed text: prefix matches first, then the nearest. */
export function suggestDocuments(
    typed: string,
    sourceParentId: string | null | undefined,
    buckets: LinkBuckets
): DocumentSuggestion[] {
    const wanted = linkName(typed);
    const source = folderChain(sourceParentId, buckets);
    const matches: Array<{ entry: DocumentIndexEntry; prefix: boolean; depth: number }> = [];
    for (const [name, entries] of buckets.byName) {
        const at = wanted ? name.indexOf(wanted) : 0;
        if (at < 0) continue;
        for (const entry of entries) {
            const chain = folderChain(entry.parentId, buckets);
            let depth = 0;
            while (depth < source.length && source[depth] === chain[depth]) depth += 1;
            matches.push({ entry, prefix: at === 0, depth });
        }
    }
    matches.sort(
        (a, b) =>
            Number(b.prefix) - Number(a.prefix) ||
            b.depth - a.depth ||
            a.entry.name.localeCompare(b.entry.name)
    );
    return matches.slice(0, SUGGESTIONS_MAX).map(({ entry }) => ({
        entry,
        reference: linkReferenceFor(entry, sourceParentId, buckets),
        folder: folderPathOf(entry, buckets),
    }));
}

/** The document a typed name means, for its sections. */
export const suggestionTarget = (
    name: string,
    sourceParentId: string | null | undefined,
    buckets: LinkBuckets
): DocumentIndexEntry | undefined => {
    const slash = name.lastIndexOf('/');
    const target =
        slash >= 0 ? { name: name.slice(slash + 1), path: name.slice(0, slash) } : { name };
    return linkCandidates(target, sourceParentId, buckets)[0];
};

function headingsOf(tops: readonly MarkdownTopBlock[]): string[] {
    return tops.flatMap(({ block }) =>
        block.type === 'heading' ? [plainText(block.children)].filter(Boolean) : []
    );
}

/** The page a document is shown on by default, in the shown language. */
export function defaultPageOf(
    entry: Pick<DocumentIndexEntry, 'systemId' | 'definitionId' | 'templateId'>,
    locale: string
): CustomTemplate | undefined {
    const definition = systemRegistry.getDocumentDefinition(entry.systemId, entry.definitionId);
    if (!definition) return undefined;
    const view = definition.views.find(({ id }) => id === definition.defaultViewId);
    const templateId =
        entry.templateId ?? (view?.layout.type === 'declarative' ? view.layout.templateId : null);
    if (!templateId) return undefined;
    const resolved = resolveEffectiveTemplate(
        templateId,
        useTemplateStore.getState(),
        entry.systemId,
        definition.kind
    );
    return resolved ? localizeTemplate(resolved.template, locale) : undefined;
}

/** The text of a markdown section: from its heading to the next heading as high or higher. */
export function sectionText(text: string, section: string): string | undefined {
    const wanted = linkName(section);
    const tops = parseMarkdown(text);
    const start = tops.findIndex(
        ({ block }) => block.type === 'heading' && linkName(plainText(block.children)) === wanted
    );
    const heading = tops[start];
    if (!heading || heading.block.type !== 'heading') return undefined;
    const { level } = heading.block;
    const end = tops
        .slice(start + 1)
        .find(({ block }) => block.type === 'heading' && block.level <= level);
    const lines = text.split('\n');
    return lines.slice(heading.line, end ? end.line : lines.length).join('\n');
}

/** The page's titles and labels. */
function pageNames(entry: DocumentIndexEntry, locale: string): string[] {
    const page = defaultPageOf(entry, locale);
    if (!page) return [];
    const names: string[] = [];
    const visit = (nodes: CustomTemplate['children']) => {
        for (const node of nodes) {
            const name = anchorName(node);
            if (name) names.push(name);
            if ('children' in node && Array.isArray(node.children)) visit(node.children);
        }
    };
    visit(page.children);
    return names;
}

/** A document's sections: the headings of its markdown, then its page's titles and labels. */
export async function sectionsOf(entry: DocumentIndexEntry, locale: string): Promise<string[]> {
    const loaded = useDocumentStore.getState().documents.find(({ id }) => id === entry.id);
    const document: UnknownDocumentEnvelope | null =
        loaded ?? (await readEnvelope(entry.id, entry));
    const headings = Object.values(document?.templateValues ?? {}).flatMap((value) => {
        const markdown = TemplateMarkdownValueSchema.safeParse(value);
        return markdown.success ? headingsOf(parseMarkdown(markdown.data.text)) : [];
    });
    return [...new Set([...headings, ...pageNames(entry, locale)])];
}
