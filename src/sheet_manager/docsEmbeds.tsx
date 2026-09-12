import { useMemo } from 'react';

import { reportSheetIssue } from './diagnostics';
import { DeclarativeSheetView } from './features/sheet/declarative/DeclarativeSheetView';
import {
    createStaticDocumentSource,
    DocumentSourceContext,
    useDocumentSource,
} from './hooks/useDocumentSource';
import { systemRegistry } from './systems';
import { characterDocumentFromBase } from './systems/star-wars-wod/characterDocument';
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
    // Like the old blocks: nothing to show until the reader has a compatible document.
    if (!fragment || !document || document.kind !== fragment.documentKind) return null;
    return <DeclarativeSheetView template={fragment} embedded />;
}

/** Renders part of a shipped template against a fixed document, read-only. */
export function TemplatePreview({
    document,
    ...target
}: FragmentTarget & { document: UnknownDocumentEnvelope }) {
    const source = useMemo(() => createStaticDocumentSource(document), [document]);
    const fragment = useFragment(target);
    if (!fragment) return null;
    return (
        <DocumentSourceContext.Provider value={source}>
            <DeclarativeSheetView template={fragment} embedded />
        </DocumentSourceContext.Provider>
    );
}

/** Preview document for a bundled character preset. */
export function presetCharacterDocument(character: BaseCharacter): UnknownDocumentEnvelope {
    return characterDocumentFromBase(character);
}

/** Preview document of a blank character whose health track shows the given marks. */
export function healthPreviewDocument(levels: readonly ConditionMark[]): UnknownDocumentEnvelope {
    return characterDocumentFromBase({
        id: 'health-preview',
        metadata: { name: '', type: 'sentient', template: '' },
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
