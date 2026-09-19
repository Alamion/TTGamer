import type { Finding, Rule } from '../types.ts';

/**
 * FR-004: plural form counts per locale and `(s)` in English messages. Placeholder parity of
 * the whole message is checked by validate-translations.
 */
export const pluralRule: Rule = {
    id: 'plural',
    area: 'interface',
    run(context) {
        const findings: Finding[] = [];
        const sourceRoot = context.config.paths.sources;
        for (const [key, entry] of Object.entries(context.ui.en)) {
            if (/\w\(s\)/.test(entry.message)) {
                findings.push({
                    rule: 'plural',
                    level: 'error',
                    location: sourceRoot + '/en/ui ' + key,
                    message: '"(s)" plural; use a plural message: "' + entry.message + '"',
                    match: entry.message,
                });
            }
        }
        for (const locale of context.sources.locales) {
            const expected = context.config.pluralForms[locale];
            for (const [key, entry] of Object.entries(context.ui[locale])) {
                if (!entry.plural && !context.ui.en[key]?.plural) continue;
                const forms = entry.message.split('|');
                const location = sourceRoot + '/' + locale + '/ui ' + key;
                if (!entry.plural) {
                    findings.push({
                        rule: 'plural',
                        level: 'error',
                        location,
                        message: 'English marks this message plural; set plural: true',
                        match: key,
                    });
                }
                if (expected !== undefined && forms.length !== expected) {
                    findings.push({
                        rule: 'plural',
                        level: 'error',
                        location,
                        message: forms.length + ' plural forms; ' + locale + ' needs ' + expected,
                        match: key,
                    });
                }
            }
        }
        return { findings };
    },
};
