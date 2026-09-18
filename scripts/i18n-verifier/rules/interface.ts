import { userFacingLiterals } from '../positions.ts';
import type { Finding, Rule } from '../types.ts';

const POSITION_LABEL = {
    'jsx-text': 'JSX text',
    'jsx-attribute': 'attribute',
    'jsx-expression': 'JSX expression',
    sink: 'message',
    object: 'property',
} as const;

/** FR-001/002/006a: user-facing literals that bypass the translation sources. */
export const interfaceRule: Rule = {
    id: 'interface',
    area: 'interface',
    run(context) {
        const findings: Finding[] = [];
        for (const file of context.files) {
            for (const literal of userFacingLiterals(file.source, file.path, context.config)) {
                const where = literal.name
                    ? POSITION_LABEL[literal.position] + ' ' + literal.name
                    : POSITION_LABEL[literal.position];
                findings.push({
                    rule: 'interface',
                    level: 'error',
                    location: file.path + ':' + literal.line,
                    message: where + ' "' + literal.text + '"',
                    match: literal.text,
                    file: file.path,
                });
            }
        }
        return { findings };
    },
};
