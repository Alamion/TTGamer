import { type BookTerm, bookTerms } from '@site/src/i18n/generated/bookTerms';
import type { GameTermsMode } from '@site/src/shared/store/readerPrefsStore';

export interface TermInput {
    /** Label already localized for the current locale (or the author's own text). */
    text: string;
    /** Effective book-term ref: `termRef ?? labelMessage`. */
    termRef?: string;
    /** `false` when the author turned the hint off. */
    termHint?: false;
    /** The author renamed the label: its text is kept even in the English terms mode. */
    renamed?: boolean;
}

export interface ResolvedTerm {
    ref: string;
    /** Text shown in the row. */
    display: string;
    /** Short form swapped in by the container query on narrow rows. */
    short?: string;
    /** Hint heading (the other-language name); absent when hints are off. */
    hint?: string;
    /** Extra hint line: the full name when the row shows the short form. */
    detail?: string;
}

/**
 * Spec 009 hint truth table (contracts/term-hint.md): `null` for English and for labels that are
 * not glossary book terms; otherwise what the label shows and what its hint says.
 */
export function resolveTerm(
    input: TermInput,
    locale: string,
    mode: GameTermsMode,
    terms: Readonly<Record<string, BookTerm>> = bookTerms
): ResolvedTerm | null {
    if (locale === 'en' || !input.termRef) return null;
    const term = terms[input.termRef];
    if (!term) return null;
    const hintsOn = input.termHint !== false && mode !== 'ru-plain';
    if (mode === 'en') {
        const display = input.renamed ? input.text : term.en;
        const other = input.renamed ? term.en : input.text;
        return {
            ref: input.termRef,
            display,
            ...(hintsOn && other !== display ? { hint: other } : {}),
        };
    }
    const short =
        !input.renamed && term.ruShort && term.ruShort !== input.text ? term.ruShort : undefined;
    return {
        ref: input.termRef,
        display: input.text,
        ...(short ? { short } : {}),
        ...(hintsOn ? { hint: term.en, ...(short ? { detail: input.text } : {}) } : {}),
    };
}
