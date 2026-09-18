import type { Finding, Rule } from '../types.ts';
import { collectMessageReferences, isReferenced } from './references.ts';

/** FR-009: translation keys nothing references (warning only). */
export const unusedRule: Rule = {
    id: 'unused',
    area: 'interface',
    run(context) {
        const references = collectMessageReferences(context, true);
        const findings: Finding[] = Object.keys(context.ui.en)
            .filter((key) => !isReferenced(key, references))
            .map((key) => ({
                rule: 'unused',
                level: 'warning',
                location: context.config.paths.sources + '/en/ui',
                message: 'ttgamer.ui.' + key + ' is not referenced',
                match: 'ttgamer.ui.' + key,
            }));
        return { findings };
    },
};
