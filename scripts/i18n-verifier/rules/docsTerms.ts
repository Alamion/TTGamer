import type { Finding, Rule } from '../types.ts';
import { proseLines } from './prose.ts';

function escape(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const covers = (scopes: readonly string[], page: string) =>
    scopes.some((scope) => page === scope || page.startsWith(scope + '/'));

/**
 * FR-020: the first mention of a glossary term on a Russian page reads "ru (en)". A longer term
 * that contains a shorter one ("Сила крови", "Сила") hides it: only the longer one is checked.
 */
export const docsTermsRule: Rule = {
    id: 'docs-terms',
    area: 'docs',
    run(context) {
        const findings: Finding[] = [];
        const pages = context.docs.translated.ru ?? [];
        const terms = context.glossary.map((term) => ({
            term,
            pattern: new RegExp('(?<![\\p{L}])' + escape(term.ru) + '(?![\\p{L}])', 'iu'),
            // Closing emphasis or link text may sit between the term and "(English)".
            english: new RegExp(
                '^[*_\\]]*\\s*\\(\\s*(?:[*_]*)' + escape(term.en) + '(?:[*_]*)\\s*\\)',
                'i'
            ),
        }));
        for (const page of pages) {
            const lines = proseLines(page.content);
            const used = terms.filter(({ term }) =>
                covers(context.config.glossaryDocs[term.system] ?? [], page.page)
            );
            for (const { term, pattern, english } of used) {
                const longer = used.filter(
                    (other) =>
                        other.term.ru.length > term.ru.length &&
                        other.term.ru.toLowerCase().includes(term.ru.toLowerCase())
                );
                for (const line of lines) {
                    const text = longer.reduce(
                        (masked, other) =>
                            masked.replace(new RegExp(other.pattern.source, 'giu'), (found) =>
                                '\u2007'.repeat(found.length)
                            ),
                        line.text
                    );
                    const match = pattern.exec(text);
                    if (!match) continue;
                    const after = text.slice(match.index + match[0].length);
                    if (!english.test(after)) {
                        findings.push({
                            rule: 'docs-terms',
                            level: 'error',
                            location: page.file + ':' + line.line,
                            message:
                                'first mention of "' + term.ru + '" without "(' + term.en + ')"',
                            match: term.id,
                            file: page.file,
                        });
                    }
                    break;
                }
            }
        }
        return { findings };
    },
};
