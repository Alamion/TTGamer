import type { Finding, Rule } from '../types.ts';
import { proseLines } from './prose.ts';

function escape(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** FR-020: the first mention of a glossary term on a Russian page reads "ru (en)". */
export const docsTermsRule: Rule = {
    id: 'docs-terms',
    area: 'docs',
    run(context) {
        const findings: Finding[] = [];
        const pages = context.docs.translated.ru ?? [];
        const terms = context.glossary.map((term) => ({
            term,
            pattern: new RegExp('(?<![\\p{L}])' + escape(term.ru) + '(?![\\p{L}])', 'iu'),
            english: new RegExp('^\\s*\\(\\s*' + escape(term.en) + '\\s*\\)', 'i'),
        }));
        for (const page of pages) {
            const lines = proseLines(page.content);
            for (const { term, pattern, english } of terms) {
                for (const line of lines) {
                    const match = pattern.exec(line.text);
                    if (!match) continue;
                    const after = line.text.slice(match.index + match[0].length);
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
