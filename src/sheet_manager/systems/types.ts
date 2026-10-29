import type { RollResult } from '@site/src/dice_roller/dice-logic';
import type { z } from 'zod';

import type {
    DocumentDefinitionId,
    DocumentEnvelope,
    DocumentKind,
    DocumentViewId,
    SystemId,
    UnknownDocumentEnvelope,
} from '../types/document';
import type { CustomTemplate } from '../types/template';
import type { DocumentCapabilities } from './capabilities';
import type { CatalogBindingEntry } from './catalogs';
import type { PolicyId } from './policies';
import type { DocumentBindingDescriptor } from './templateBindings';

/** The view's page is the system's shipped default template with this id (and the view's kind). */
export interface DeclarativeDocumentLayout {
    type: 'declarative';
    templateId: string;
}

export type DocumentLayout = DeclarativeDocumentLayout;

export interface DocumentViewLabel {
    id: string;
    message: string;
}

export interface DocumentViewDefinition {
    id: DocumentViewId;
    label: DocumentViewLabel;
    layout: DocumentLayout;
    legacyIds?: readonly DocumentViewId[];
}

/**
 * The supernatural module a definition belongs to (constitution I layering). Several definitions
 * may share a module (a hunter character and hunter NPCs), so the id is independent of the
 * definition id.
 */
export interface DocumentModule {
    id: string;
    /** Translated setting/line name (e.g. "Hunter: the Reckoning 5e"); lists show it as the setting. */
    label: DocumentViewLabel;
    /** Policies the module's own material relies on, in addition to its system's. */
    policies?: readonly PolicyId[];
    /**
     * The module's letters in the documents window, naming the game line, not only its
     * edition ("VtM", never "5e"); the format is in `SystemPlugin.badge`.
     */
    badge?: DocumentViewLabel;
}

/** A shipped sample document (docs previews, the template editor's preview data). */
export interface DocumentExample {
    id: string;
    label: DocumentViewLabel;
    /**
     * A fresh copy of the example. Text it writes in the interface language goes through
     * `localize` (the UI passes `translate`; system code cannot import it, spec 043).
     */
    create: (localize?: (message: DocumentViewLabel) => string) => UnknownDocumentEnvelope;
    /**
     * Examples of the same system copied together with this one (a group's members, spec 040);
     * the copy's values that name them are pointed at their copies.
     */
    companions?: readonly { definitionId: string; exampleId: string }[];
}

export interface DocumentDefinition<TData = unknown> {
    id: DocumentDefinitionId;
    kind: DocumentKind;
    /** Translated name shown wherever a document type is listed. */
    label: DocumentViewLabel;
    schemaVersion: number;
    schema: z.ZodType<TData>;
    createDefault: () => TData;
    defaultViewId: DocumentViewId;
    views: readonly DocumentViewDefinition[];
    capabilities?: DocumentCapabilities;
    derive?: (data: TData) => unknown;
    migrate?: (data: unknown, fromVersion: number) => unknown;
    module?: DocumentModule;
    /** Sample documents of this definition, offered as template editor preview data. */
    examples?: readonly DocumentExample[];
    /** A file format of the kind's own, used instead of the JSON export (spec 043: markdown). */
    files?: DocumentFileFormat;
    /** A link to a name no document has offers to create a document of this kind (spec 044). */
    newFromLink?: true;
}

/** How a kind's documents leave and arrive as files of their own format (spec 043, D9). */
export interface DocumentFileFormat {
    /** Lowercase file name endings the import accepts (`.md`), and their media types. */
    extensions: readonly string[];
    mediaTypes: readonly string[];
    /** The file for a document; images stored on the device go with it. */
    write(document: UnknownDocumentEnvelope): Promise<{ name: string; blob: Blob }>;
    /** A new document from a file; throws an `Error` whose message says why it cannot be read. */
    read(file: { name: string; bytes: Uint8Array }): Promise<UnknownDocumentEnvelope>;
}

export interface SystemPlugin {
    id: SystemId;
    /** Translated system name (create dialog headings, template library groups). */
    label: DocumentViewLabel;
    /**
     * A short name for badges (documents window rows, spec 045); the label when absent. It names the
     * game line, not only its edition. An edition is written after the line, no spaces, with "e":
     * "WoD5e", "WoD2e", a future "D&D5e"; never a bare "5e" or "V5".
     */
    badge?: DocumentViewLabel;
    /** Publisher policies of the system's ruleset/setting material (constitution VIII). */
    policies?: readonly PolicyId[];
    /** Catalogs the system's templates may suggest and copy from. */
    catalogs?: readonly CatalogBindingEntry[];
    documents: readonly DocumentDefinition[];
    /**
     * Feature 005: explicit primitive-composed default templates for this setup's views.
     * Identity = view id; absent entries fall back to legacy view derivation.
     */
    defaultTemplates?: readonly CustomTemplate[];
    /** Document data addresses templates may bind to; generic template code reads only these. */
    templateBindings?: readonly DocumentBindingDescriptor[];
    /** Dice mechanics of the ruleset (constitution I); absent → stats show no dice button. */
    dice?: SystemDiceRules;
    /**
     * Engine-only definitions (no module, no setting material) a user setting may reuse with its
     * own pages (spec 012).
     */
    coreDefinitions?: readonly DocumentDefinitionId[];
    /**
     * The ruleset this system is a setting of (spec 013): the library lists it under that
     * ruleset. Absent on rulesets themselves.
     */
    ruleset?: SystemId;
    /**
     * Library wording for a ruleset whose own types are not characters (spec 043): its intro, the
     * name and note of its own types without a setting ("Rules only" otherwise), and what its core
     * types are called (`{names}`) and say inside a user setting.
     */
    library?: {
        intro: DocumentViewLabel;
        ownTypes: DocumentViewLabel;
        ownTypesNote: DocumentViewLabel;
        coreTypes: DocumentViewLabel;
        coreTypeNote: DocumentViewLabel;
    };
}

export interface TraitPoolFlags {
    specialization: boolean | null;
    experienced: boolean | null;
    practiced: boolean | null;
}

export interface DiceOutcome {
    id: string;
    title: DocumentViewLabel;
    detail?: DocumentViewLabel;
    /** True when the outcome depends on a Difficulty that was not given. */
    conditional: boolean;
}

export interface DiceReadingLine {
    id: string;
    label: DocumentViewLabel;
}

/** How a ruleset reads its own rolls (criticals, special dice) on top of plain notation. */
export interface RollReadingRules {
    id: string;
    lines: readonly DiceReadingLine[];
    /** The line a document definition rolls with (e.g. a hunter rolls Desperation dice). */
    lineFor(definitionId: string): string | undefined;
    /**
     * Rewrites a pool for this reading (e.g. adds the critical set bonus); `null` when the
     * notation is not a pool this reading understands, so no reading applies.
     */
    prepare(
        notation: string,
        options: { criticalPairs: boolean; specialDice?: number }
    ): string | null;
    /**
     * Pool dice a document's state turns into special dice when it rolls (V5 Hunger replaces
     * regular dice, spec 037 D2); `undefined` when its line adds none.
     */
    specialDice?(definitionId: string, data: unknown): number | undefined;
    interpret(
        result: RollResult,
        options: { line: string; outcomes: boolean; difficulty: number | null }
    ): DiceOutcome[];
}

export interface SystemDiceRules {
    /** Notation for rolling one stat of `value` dots from a sheet. */
    traitPool?(value: number, flags: TraitPoolFlags): string | undefined;
    reading?: RollReadingRules;
}

export interface ParsedRegisteredDocument<TData = unknown> {
    definition: DocumentDefinition<TData>;
    envelope: DocumentEnvelope<TData>;
}
