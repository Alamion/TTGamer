import { type BookTerm, bookTerms } from '@site/src/i18n/generated/bookTerms';
import type { GameTermsMode } from '@site/src/shared/store/readerPrefsStore';
import { createContext, useContext } from 'react';

import { useTermHintSettings } from '../../../components/terms/TermHintContext';

/** What a rating needs to name its short form (a template field or a primitive node). */
export interface ShortLabelNode {
    id: string;
    shortForm?: boolean;
    shortLabel?: string;
    label?: string;
    labelMessage?: string;
    termRef?: string;
}

const DEFAULT_LENGTH = 3;

/** The first three letters of a label in capitals; a shorter label stays as it is. */
function derive(label: string, locale: string): string {
    const letters = Array.from(label.replace(/[^\p{L}\p{N}]/gu, ''));
    return letters.length < DEFAULT_LENGTH
        ? label
        : letters.slice(0, DEFAULT_LENGTH).join('').toLocaleUpperCase(locale);
}

/**
 * The short form of one rating's label: the author's own, then the glossary abbreviation of the
 * language the label is shown in (the English one while English book names are shown), then the
 * first three letters. A node that kept only `termRef` was renamed, so its text is the source.
 */
export function shortLabelFor(
    node: Pick<ShortLabelNode, 'shortLabel' | 'labelMessage' | 'termRef'>,
    label: string,
    locale: string,
    mode: GameTermsMode,
    terms: Readonly<Record<string, BookTerm>> = bookTerms
): string {
    if (node.shortLabel) return node.shortLabel;
    const renamed = !node.labelMessage && Boolean(node.termRef);
    const ref = node.termRef ?? node.labelMessage;
    const term = !renamed && ref ? terms[ref] : undefined;
    const abbreviation = locale === 'en' || mode === 'en' ? term?.abbr : term?.ruAbbr;
    return abbreviation ?? derive(label, locale);
}

/**
 * Short labels of one group's ratings, by node id. Two nodes never show the same letters: the
 * later one falls back to its full label, so a page always draws.
 */
export function shortLabelsFor(
    nodes: readonly ShortLabelNode[],
    locale: string,
    mode: GameTermsMode,
    terms: Readonly<Record<string, BookTerm>> = bookTerms
): ReadonlyMap<string, string> {
    const labels = new Map<string, string>();
    const taken = new Set<string>();
    for (const node of nodes) {
        if (!node.shortForm || node.label === undefined) continue;
        const short = shortLabelFor(node, node.label, locale, mode, terms);
        const key = short.toLocaleUpperCase(locale);
        if (taken.has(key)) {
            labels.set(node.id, node.label);
        } else {
            taken.add(key);
            labels.set(node.id, short);
        }
    }
    return labels;
}

/** The short labels of the group being drawn; `null` outside a group that computes them. */
export const ShortLabelContext = createContext<ReadonlyMap<string, string> | null>(null);

/**
 * The short label a rating draws, or `undefined` for its regular compact form: the group's map
 * first (clashes already resolved there), else computed alone for a rating outside a group.
 */
export function useShortLabel(node: ShortLabelNode, label: string): string | undefined {
    const group = useContext(ShortLabelContext);
    const settings = useTermHintSettings();
    if (!node.shortForm) return undefined;
    const short =
        group?.get(node.id) ??
        shortLabelFor(node, label, settings?.locale ?? 'en', settings?.mode ?? 'ru');
    return short === label ? undefined : short;
}
