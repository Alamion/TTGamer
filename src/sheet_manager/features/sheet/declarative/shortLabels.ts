import { type BookTerm, bookTerms } from '@site/src/i18n/generated/bookTerms';
import type { GameTermsMode } from '@site/src/shared/store/readerPrefsStore';
import { createContext, useContext } from 'react';

import { useTermHintSettings } from '../../../components/terms/TermHintContext';
import { useBriefPage } from './areaLayout';

/** What a rating needs to name its short form (a template field or a primitive node). */
export interface ShortLabelNode {
    id: string;
    /** On a brief (spec 041): keep the full name instead of the short label. */
    fullLabel?: true;
    shortLabel?: string;
    label?: string;
    labelMessage?: string;
    termRef?: string;
}

const DEFAULT_LENGTH = 3;
/** The longest short label (the editor's limit for the author's own). */
const MAX_LENGTH = 4;

/** The first letters of a label in capitals; a label shorter than three stays as it is. */
function derive(label: string, locale: string, length = DEFAULT_LENGTH): string {
    const letters = Array.from(label.replace(/[^\p{L}\p{N}]/gu, ''));
    return letters.length < DEFAULT_LENGTH
        ? label
        : letters.slice(0, length).join('').toLocaleUpperCase(locale);
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
 * later one takes a fourth derived letter (BRA, BRAC), else a number (FIE, FIE2), so a
 * rating keeps the brief look whatever its name.
 */
export function shortLabelsFor(
    nodes: readonly ShortLabelNode[],
    locale: string,
    mode: GameTermsMode,
    terms: Readonly<Record<string, BookTerm>> = bookTerms
): ReadonlyMap<string, string> {
    const labels = new Map<string, string>();
    const taken = new Set<string>();
    const names = new Set<string>();
    for (const node of nodes) {
        if (node.fullLabel || node.label === undefined) continue;
        const short = shortLabelFor(node, node.label, locale, mode, terms);
        const free = (candidate: string) => !taken.has(candidate.toLocaleUpperCase(locale));
        let chosen = short;
        if (!free(chosen)) {
            const longer = derive(node.label, locale, MAX_LENGTH);
            // A fourth letter tells different names apart; the same name only takes a number.
            const derived = short === derive(node.label, locale);
            const repeated = names.has(node.label.toLocaleLowerCase(locale));
            if (derived && !repeated && free(longer)) {
                chosen = longer;
            } else {
                const stem = Array.from(short)
                    .slice(0, MAX_LENGTH - 1)
                    .join('');
                for (let count = 2; !free(chosen); count++) chosen = `${stem}${count}`;
            }
        }
        taken.add(chosen.toLocaleUpperCase(locale));
        names.add(node.label.toLocaleLowerCase(locale));
        labels.set(node.id, chosen);
    }
    return labels;
}

/** The short labels of the group being drawn; `null` outside a group that computes them. */
export const ShortLabelContext = createContext<ReadonlyMap<string, string> | null>(null);

/**
 * The short label a rating draws on a brief, or `undefined` for its full name: the group's map
 * first (clashes already resolved there), else computed alone for a rating outside a group. A
 * full page always shows the name (spec 041).
 */
export function useShortLabel(node: ShortLabelNode, label: string): string | undefined {
    const group = useContext(ShortLabelContext);
    const settings = useTermHintSettings();
    const brief = useBriefPage();
    if (!brief || node.fullLabel) return undefined;
    return (
        group?.get(node.id) ??
        shortLabelFor(node, label, settings?.locale ?? 'en', settings?.mode ?? 'ru')
    );
}
