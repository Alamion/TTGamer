import type { Finding, Rule, VerifierContext } from '../types.ts';

/** Text shown for a glossary ref in a locale, or `undefined` when the ref does not resolve. */
export function refText(context: VerifierContext, ref: string, locale: string): string | undefined {
    if (ref.startsWith('ttgamer.ui.')) {
        return context.ui[locale]?.[ref.slice('ttgamer.ui.'.length)]?.message;
    }
    const match = /^catalog:([\w-]+)\/([\w.-]+)$/.exec(ref);
    return match ? context.data[locale]?.[match[1] + '.' + match[2] + '.name'] : undefined;
}

/** FR-006i, FR-025: glossary refs resolve, and every source uses the glossary forms. */
export const glossaryRule: Rule = {
    id: 'glossary',
    area: 'catalog',
    run(context) {
        const findings: Finding[] = [];
        for (const term of context.glossary) {
            const location = context.config.paths.glossary + '/' + term.system + '.yaml#' + term.id;
            const push = (message: string, match = term.id) =>
                findings.push({ rule: 'glossary', level: 'error', location, message, match });
            if (term.ruShort && term.ruShort.length >= term.ru.length) {
                push('ruShort "' + term.ruShort + '" is not shorter than "' + term.ru + '"');
            }
            for (const ref of term.refs) {
                const english = refText(context, ref, 'en');
                if (english === undefined) {
                    push('ref ' + ref + ' does not resolve', ref);
                    continue;
                }
                if (english !== term.en) {
                    push(
                        'English text at ' +
                            ref +
                            ' is "' +
                            english +
                            '", glossary says "' +
                            term.en +
                            '"',
                        ref
                    );
                }
                const russian = refText(context, ref, 'ru');
                if (russian !== undefined && russian !== term.ru && russian !== term.ruShort) {
                    push(
                        'Russian text at ' +
                            ref +
                            ' is "' +
                            russian +
                            '", glossary says "' +
                            term.ru +
                            '"',
                        ref
                    );
                }
            }
        }
        return { findings };
    },
};
