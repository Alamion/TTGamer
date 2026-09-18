import type { Rule } from '../types.ts';
import { catalogRule } from './catalog.ts';
import { docsRule } from './docs.ts';
import { docsTermsRule } from './docsTerms.ts';
import { glossaryRule } from './glossary.ts';
import { identicalRule } from './identical.ts';
import { interfaceRule } from './interface.ts';
import { keysRule } from './keys.ts';
import { overflowRule } from './overflow.ts';
import { pickersRule } from './pickers.ts';
import { pluralRule } from './plural.ts';
import { unusedRule } from './unused.ts';

export const RULES: readonly Rule[] = [
    interfaceRule,
    keysRule,
    unusedRule,
    identicalRule,
    pluralRule,
    pickersRule,
    overflowRule,
    catalogRule,
    glossaryRule,
    docsRule,
    docsTermsRule,
];
