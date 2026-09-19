import type { Finding, Rule, TraitRowKind } from '../types.ts';

/**
 * FR-023: a glossary term whose Russian form is longer than the budget of a row kind it is
 * shown in needs an approved short form that fits.
 */
export const overflowRule: Rule = {
    id: 'overflow',
    area: 'interface',
    run(context) {
        const findings: Finding[] = [];
        const budgets = context.config.overflowBudgets;
        for (const term of context.glossary) {
            const kinds = new Set<TraitRowKind>();
            for (const ref of term.refs) {
                for (const kind of context.rowKinds.get(ref) ?? []) kinds.add(kind);
            }
            if (kinds.size === 0) continue;
            const budget = Math.min(...[...kinds].map((kind) => budgets[kind]));
            const location = context.config.paths.glossary + '/' + term.system + '.yaml#' + term.id;
            if (term.ru.length > budget && !term.ruShort) {
                findings.push({
                    rule: 'overflow',
                    level: 'error',
                    location,
                    message:
                        '"' +
                        term.ru +
                        '" (' +
                        term.ru.length +
                        ') exceeds ' +
                        budget +
                        ' characters for ' +
                        [...kinds].join('/') +
                        ' rows; add ruShort',
                    match: term.id,
                });
            } else if (term.ruShort && term.ruShort.length > budget) {
                findings.push({
                    rule: 'overflow',
                    level: 'error',
                    location,
                    message:
                        'ruShort "' + term.ruShort + '" still exceeds ' + budget + ' characters',
                    match: term.id,
                });
            }
        }
        return { findings };
    },
};
