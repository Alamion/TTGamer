import type { GateLevel, RuleId, TraitRowKind } from './types.ts';

export interface VerifierConfig {
    /** Gate per rule: `report` while its area is being migrated, `error` once it is done. */
    levels: Record<Exclude<RuleId, 'unused' | 'exceptions'>, GateLevel>;
    /** Repository-relative roots. */
    paths: {
        sources: string;
        glossary: string;
        exceptions: string;
        docs: string;
        translatedDocs: Record<string, string>;
    };
    /** Documentation trees and top-level pages that must be mirrored. */
    docRoots: readonly string[];
    rootDocuments: readonly string[];
    /** Source files scanned for literals (globs, relative to the root). */
    scan: { include: readonly string[]; exclude: readonly string[] };
    /** JSX attributes whose string values are shown to users. */
    userFacingProps: readonly string[];
    /** Calls whose first argument is shown to users. */
    sinks: readonly string[];
    /** Object properties shown to users, and the files where they are checked. */
    objectProps: readonly string[];
    objectPropFiles: readonly string[];
    /** Files where catalog option lists and search filters are built. */
    pickerFiles: readonly string[];
    /** Glossary file → documentation trees whose pages use its terms (docs-terms rule). */
    glossaryDocs: Readonly<Record<string, readonly string[]>>;
    /** Plural form count per locale. */
    pluralForms: Readonly<Record<string, number>>;
    /** Minimum share of Russian short descriptions per catalog (FR-024). */
    shortDescriptionCoverage: number;
    /**
     * Longest label (characters) that fits each row kind on one line without squeezing the
     * specialization input below 8 characters. Measured in the Russian build (spec 009 T087):
     * specialty rows 294 px wide at a 360 px viewport leave ~118 px for the label (14 chars at
     * 8.25 px); plain trait rows ~170 px (20); compact rows in a desktop brief column ~160 px
     * at 6.94 px (22). Narrower desktop columns move the specialization input to its own line.
     */
    overflowBudgets: Readonly<Record<TraitRowKind, number>>;
}

export const DEFAULT_CONFIG: VerifierConfig = {
    levels: {
        interface: 'error',
        keys: 'error',
        identical: 'error',
        plural: 'error',
        catalog: 'report',
        pickers: 'error',
        docs: 'error',
        'docs-terms': 'error',
        glossary: 'report',
        overflow: 'error',
    },
    paths: {
        sources: 'translations/source',
        glossary: 'translations/glossary',
        exceptions: 'translations/i18n-exceptions.yaml',
        docs: 'docs',
        translatedDocs: { ru: 'i18n/ru/docusaurus-plugin-content-docs/current' },
    },
    docRoots: ['star-wars-wod-2e', 'wod-v5'],
    rootDocuments: ['index.mdx'],
    scan: {
        include: ['src/**/*.ts', 'src/**/*.tsx'],
        exclude: ['src/i18n/generated/**', '**/*.test.ts', '**/*.test.tsx', '**/*.d.ts'],
    },
    userFacingProps: [
        'aria-label',
        'aria-description',
        'aria-placeholder',
        'aria-roledescription',
        'title',
        'placeholder',
        'alt',
        'label',
        'description',
        'emptyText',
        'searchPlaceholder',
        'header',
        'tooltip',
        'confirmText',
        'cancelText',
        'confirmLabel',
        'cancelLabel',
    ],
    sinks: [
        'toast',
        'toast.success',
        'toast.error',
        'toast.loading',
        'alert',
        'window.alert',
        'confirm',
        'window.confirm',
        'prompt',
        'window.prompt',
    ],
    objectProps: ['label', 'title', 'header', 'description', 'placeholder', 'shortDescription'],
    objectPropFiles: [
        'src/**/components/**',
        'src/**/features/**',
        'src/pages/**',
        'src/data/*Config.tsx',
    ],
    pickerFiles: [
        'src/sheet_manager/**',
        'src/shared/components/**',
        'src/data/*Config.tsx',
        'src/dice_roller/components/**',
    ],
    glossaryDocs: {
        'star-wars-wod': ['star-wars-wod-2e'],
        v5: ['wod-v5'],
        'v5-hunter': ['wod-v5'],
    },
    pluralForms: { en: 2, ru: 3 },
    shortDescriptionCoverage: 0.9,
    overflowBudgets: { compact: 22, trait: 20, traitWithSpecialty: 14 },
};

/** Converts a glob (`**`, `*`, `?`) to an anchored regular expression. */
export function globToRegExp(glob: string): RegExp {
    let pattern = '';
    for (let index = 0; index < glob.length; index++) {
        const char = glob[index];
        if (char === '*' && glob[index + 1] === '*') {
            const slash = glob[index + 2] === '/';
            pattern += slash ? '(?:.*/)?' : '.*';
            index += slash ? 2 : 1;
        } else if (char === '*') {
            pattern += '[^/]*';
        } else if (char === '?') {
            pattern += '[^/]';
        } else {
            pattern += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        }
    }
    return new RegExp('^' + pattern + '$');
}

export function matchesAny(file: string, globs: readonly string[]): boolean {
    return globs.some((glob) => globToRegExp(glob).test(file));
}
