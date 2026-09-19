import type { TermInput } from './resolveTerm';

/** The book-term part of a label: which glossary ref it stands for and how its hint behaves. */
export type TermLink = Omit<TermInput, 'text'>;

/**
 * Term link of a template node: the effective ref is `termRef ?? labelMessage`; a node that kept
 * only `termRef` was renamed by the author.
 */
export function termLinkOf(node: {
    labelMessage?: string;
    termRef?: string;
    termHint?: false;
}): TermLink {
    const termRef = node.termRef ?? node.labelMessage;
    return {
        ...(termRef ? { termRef } : {}),
        ...(node.termHint === false ? { termHint: false as const } : {}),
        ...(!node.labelMessage && node.termRef ? { renamed: true } : {}),
    };
}
