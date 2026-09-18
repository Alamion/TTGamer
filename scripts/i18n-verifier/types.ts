import type ts from 'typescript';

import type {
    GlossaryTerm,
    I18nException,
    TranslationSources,
    UiMessage,
} from '../translation-source.ts';
import type { VerifierConfig } from './config.ts';

export type Area = 'interface' | 'catalog' | 'docs';

export type RuleId =
    | 'interface'
    | 'keys'
    | 'unused'
    | 'identical'
    | 'plural'
    | 'catalog'
    | 'pickers'
    | 'docs'
    | 'docs-terms'
    | 'glossary'
    | 'overflow'
    | 'exceptions';

/** `error`: must be fixed once the rule is gated; `warning`: never fails the run. */
export type FindingLevel = 'error' | 'warning';

/** Whether a rule's error findings fail the run (`error`) or are only listed (`report`). */
export type GateLevel = 'error' | 'report';

export interface Finding {
    rule: RuleId;
    level: FindingLevel;
    /** `file:line`, `catalog/entry.field`, a docs page, or a glossary term. */
    location: string;
    message: string;
    /** Text compared with exception `match` (the literal, value, or key). */
    match: string;
    /** Repository-relative file used for exception `file` globs. */
    file?: string;
}

export interface AreaSummary {
    area: Area;
    covered: number;
    missing: number;
    excepted: number;
}

export interface Coverage {
    covered: number;
    missing: number;
}

export interface RuleResult {
    findings: Finding[];
    coverage?: Partial<Record<Area, Coverage>>;
}

export interface ParsedSourceFile {
    /** Repository-relative path with forward slashes. */
    path: string;
    source: ts.SourceFile;
}

export interface DocsPage {
    /** Path relative to the docs root (e.g. `wod-v5/index.mdx`). */
    page: string;
    /** Repository-relative file path. */
    file: string;
    content: string;
}

export type TraitRowKind = 'compact' | 'trait' | 'traitWithSpecialty';

export interface VerifierContext {
    root: string;
    config: VerifierConfig;
    sources: TranslationSources;
    /** Locale → flattened UI key (without `ttgamer.ui.`) → message. */
    ui: Record<string, Record<string, UiMessage>>;
    /** Locale → flattened `catalog.entry.field[.index]` → text. */
    data: Record<string, Record<string, string>>;
    glossary: GlossaryTerm[];
    exceptions: I18nException[];
    files: ParsedSourceFile[];
    docs: { en: DocsPage[]; translated: Record<string, DocsPage[]> };
    /** Catalog ids that must have translation sources. */
    catalogIds: readonly string[];
    /** Glossary ref → row kinds where shipped templates display it. */
    rowKinds: ReadonlyMap<string, ReadonlySet<TraitRowKind>>;
}

export interface Rule {
    id: RuleId;
    area: Area;
    run(context: VerifierContext): RuleResult;
}
