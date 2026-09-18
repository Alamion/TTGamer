import type { Finding, Rule } from '../types.ts';
import { isEnglishProse, proseLines } from './prose.ts';

/** FR-006f/g: every English page has a translation, and translations hold no English prose. */
export const docsRule: Rule = {
    id: 'docs',
    area: 'docs',
    run(context) {
        const findings: Finding[] = [];
        let covered = 0;
        let missing = 0;
        for (const [locale, pages] of Object.entries(context.docs.translated)) {
            const translated = new Map(pages.map((page) => [page.page, page]));
            for (const source of context.docs.en) {
                const page = translated.get(source.page);
                if (!page) {
                    missing++;
                    findings.push({
                        rule: 'docs',
                        level: 'error',
                        location: source.file,
                        message: 'no ' + locale + ' translation of ' + source.page,
                        match: source.page,
                        file: source.file,
                    });
                    continue;
                }
                let english = 0;
                for (const line of proseLines(page.content)) {
                    if (isEnglishProse(line.text)) {
                        english++;
                        findings.push({
                            rule: 'docs',
                            level: 'error',
                            location: page.file + ':' + line.line,
                            message: 'English prose: "' + line.text.slice(0, 80) + '"',
                            match: line.text,
                            file: page.file,
                        });
                    }
                }
                if (english === 0) covered++;
                else missing++;
            }
        }
        return { findings, coverage: { docs: { covered, missing } } };
    },
};
