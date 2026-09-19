import type { Finding, Rule } from '../types.ts';

const LETTERS = /\p{L}{2,}/u;
/** Words of a message outside its `{placeholders}`. */
const hasWords = (text: string) => LETTERS.test(text.replace(/\{[\w-]+\}/g, ' '));

/** FR-006d: translated values that are copies of the English value. */
export const identicalRule: Rule = {
    id: 'identical',
    area: 'interface',
    run(context) {
        const findings: Finding[] = [];
        for (const locale of context.sources.locales.filter((item) => item !== 'en')) {
            for (const [key, entry] of Object.entries(context.ui[locale])) {
                const english = context.ui.en[key]?.message;
                if (english && entry.message.trim() === english.trim() && hasWords(english)) {
                    findings.push({
                        rule: 'identical',
                        level: 'error',
                        location: context.config.paths.sources + '/' + locale + '/ui ' + key,
                        message: 'same as English: "' + english + '"',
                        match: english,
                    });
                }
            }
            for (const [key, value] of Object.entries(context.data[locale])) {
                const english = context.data.en[key];
                if (english && value.trim() === english.trim() && hasWords(english)) {
                    findings.push({
                        rule: 'identical',
                        level: 'error',
                        location: context.config.paths.sources + '/' + locale + '/data ' + key,
                        message: 'same as English: "' + english + '"',
                        match: english,
                    });
                }
            }
        }
        return { findings };
    },
};
