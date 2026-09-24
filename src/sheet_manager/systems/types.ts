import type { RollResult } from '@site/src/dice_roller/dice-logic';
import type { z } from 'zod';

import type {
    DocumentDefinitionId,
    DocumentEnvelope,
    DocumentKind,
    DocumentViewId,
    SystemId,
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
}

export interface SystemPlugin {
    id: SystemId;
    /** Translated system name (create dialog headings, template library groups). */
    label: DocumentViewLabel;
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
    prepare(notation: string, options: { criticalPairs: boolean }): string | null;
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
