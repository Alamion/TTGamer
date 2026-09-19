import type { Finding, Rule } from '../types.ts';
import { collectMessageReferences } from './references.ts';

/** FR-006b/c: referenced keys missing in a locale, and keys present in one locale only. */
export const keysRule: Rule = {
    id: 'keys',
    area: 'interface',
    run(context) {
        const findings: Finding[] = [];
        const references = collectMessageReferences(context);
        const locales = context.sources.locales;
        for (const [key, location] of references.exact) {
            for (const locale of locales) {
                if (!(key in context.ui[locale])) {
                    findings.push({
                        rule: 'keys',
                        level: 'error',
                        location,
                        message: 'ttgamer.ui.' + key + ' is missing in ' + locale,
                        match: 'ttgamer.ui.' + key,
                        file: location.split(':')[0],
                    });
                }
            }
        }
        for (const unknown of references.unknown) {
            findings.push({
                rule: 'keys',
                level: 'error',
                location: unknown.location,
                message: 'uiMessages.' + unknown.path + ' does not exist',
                match: 'uiMessages.' + unknown.path,
                file: unknown.file,
            });
        }
        const allKeys = new Set(locales.flatMap((locale) => Object.keys(context.ui[locale])));
        for (const key of allKeys) {
            const present = locales.filter((locale) => key in context.ui[locale]);
            if (present.length !== locales.length) {
                const missing = locales.filter((locale) => !present.includes(locale));
                findings.push({
                    rule: 'keys',
                    level: 'error',
                    location: context.config.paths.sources + '/' + missing.join(',') + '/ui',
                    message: 'ttgamer.ui.' + key + ' exists only in ' + present.join(', '),
                    match: 'ttgamer.ui.' + key,
                });
            }
        }
        const covered = Object.keys(context.ui.en).filter((key) =>
            locales.every((locale) => key in context.ui[locale])
        ).length;
        return {
            findings,
            coverage: { interface: { covered, missing: 0 } },
        };
    },
};
