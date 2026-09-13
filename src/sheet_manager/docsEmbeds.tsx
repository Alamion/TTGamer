import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useMemo } from 'react';

import { reportSheetIssue } from './diagnostics';
import { DeclarativeSheetView } from './features/sheet/declarative/DeclarativeSheetView';
import { CreateCharacterButton } from './features/sheet/shell/CreateCharacterButton';
import {
    createStaticDocumentSource,
    DocumentSourceContext,
    useDocumentSource,
} from './hooks/useDocumentSource';
import { systemRegistry } from './systems';
import { characterDocumentFromBase } from './systems/star-wars-wod/characterDocument';
import { starWarsExampleDocument, vehicleDamageDocument } from './systems/star-wars-wod/examples';
import type { BaseCharacter, ConditionMark } from './types/character';
import type { UnknownDocumentEnvelope } from './types/document';
import type { CustomTemplate, TemplateNode } from './types/template';
import { walkTemplateNodes } from './types/template';

/**
 * Public entry point for documentation embeds. Docs render parts of a system's SHIPPED
 * default template (never the reader's edited override, so prose and page stay in sync)
 * against either the reader's current document or a fixed read-only preview document.
 * Node ids referenced from MDX are guarded by `tests/sheet_manager/docs-embeds.test.ts`.
 */

interface FragmentTarget {
    /** Shipped default template id (a view id), e.g. `full-sheet`. */
    template?: string;
    /** Node id inside that template; omitted = the whole page. */
    node?: string;
    systemId?: string;
}

/** The shipped template (or its single subtree) a docs embed renders; undefined if missing. */
export function resolveDocsFragment({
    template = 'full-sheet',
    node,
    systemId = 'star-wars-wod',
}: FragmentTarget): CustomTemplate | undefined {
    const shipped = systemRegistry
        .getSystem(systemId)
        ?.defaultTemplates?.find((candidate) => candidate.id === template);
    if (!shipped) return undefined;
    if (!node) return shipped;
    let subtree: TemplateNode | undefined;
    walkTemplateNodes(shipped.children, (candidate) => {
        if (candidate.id === node) subtree = candidate;
    });
    return subtree ? { ...shipped, children: [subtree] } : undefined;
}

function useFragment(target: FragmentTarget): CustomTemplate | undefined {
    const { template, node, systemId } = target;
    const fragment = useMemo(
        () => resolveDocsFragment({ template, node, systemId }),
        [template, node, systemId]
    );
    if (!fragment) {
        reportSheetIssue({
            code: 'template-reference-invalid',
            message: 'Documentation embed references a template part that does not exist',
            details: { template, node, systemId },
        });
    }
    return fragment;
}

/** Renders part of a shipped template against the reader's current document (editable). */
export function TemplateFragment(props: FragmentTarget) {
    const { document } = useDocumentSource();
    const fragment = useFragment(props);
    if (!fragment) return null;
    if (!document || document.kind !== fragment.documentKind) {
        // No compatible document yet: offer the next step instead of an empty gap.
        return (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border bg-bgSurface p-4">
                <p className="text-sm text-textSecondary">
                    {translate(uiMessages.sheet.templates.page.embedNoDocument)}
                </p>
                {fragment.documentKind === 'character' && <CreateCharacterButton />}
            </div>
        );
    }
    return <DeclarativeSheetView template={fragment} embedded />;
}

/** Renders part of a shipped template against a fixed document, read-only. */
export function TemplatePreview({
    document,
    ...target
}: FragmentTarget & { document: UnknownDocumentEnvelope | undefined }) {
    const source = useMemo(
        () => (document ? createStaticDocumentSource(document) : undefined),
        [document]
    );
    const fragment = useFragment(target);
    if (!fragment || !source) return null;
    return (
        <DocumentSourceContext.Provider value={source}>
            <DeclarativeSheetView template={fragment} embedded />
        </DocumentSourceContext.Provider>
    );
}

export { JAX_VORN_PRESET } from './data/presets';

/** A fixed example document for documentation previews (e.g. `wampa::preset`). */
export function exampleDocument(id: string): UnknownDocumentEnvelope | undefined {
    const document = starWarsExampleDocument(id);
    if (!document) {
        reportSheetIssue({
            code: 'template-reference-invalid',
            message: 'Documentation embed references an example document that does not exist',
            details: { exampleId: id },
        });
    }
    return document;
}

/** Preview document of a vehicle whose damage track shows the given marks. */
export function vehicleDamagePreviewDocument(
    levels: readonly ConditionMark[]
): UnknownDocumentEnvelope {
    return vehicleDamageDocument(levels);
}

/** Preview document for a bundled character preset. */
export function presetCharacterDocument(character: BaseCharacter): UnknownDocumentEnvelope {
    return characterDocumentFromBase(character);
}

/** Preview document of a blank character whose health track shows the given marks. */
export function healthPreviewDocument(levels: readonly ConditionMark[]): UnknownDocumentEnvelope {
    return characterDocumentFromBase({
        id: 'health-preview',
        metadata: { name: '', type: 'sentient', template: 'standard' },
        attributes: {},
        skills: {},
        health: { levels },
        inventory: [],
        armor: [],
        weapons: [],
        implants: [],
        customTalents: [],
        customSkills: [],
        customKnowledges: [],
        backgrounds: [],
        merits: [],
        flaws: [],
        forcePowerItems: [],
        notes: '',
    });
}
