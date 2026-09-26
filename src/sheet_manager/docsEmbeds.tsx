import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useMemo } from 'react';

import { reportSheetIssue } from './diagnostics';
import { CatalogBrowser } from './features/docs/CatalogBrowser';
import { DocsLinkVariants, ElementStorybook } from './features/docs/ElementStorybook';
import { CATALOG_BINDINGS } from './features/sheet/data/catalogBindings';
import { DeclarativeSheetView } from './features/sheet/declarative/DeclarativeSheetView';
import { CreateCharacterButton } from './features/sheet/shell/CreateCharacterButton';
import { PolicyStatement } from './features/sheet/shell/PolicyNotice';
import {
    createStaticDocumentSource,
    DocumentSourceContext,
    useDocumentSource,
} from './hooks/useDocumentSource';
import { systemRegistry } from './systems';
import { characterDocumentFromBase } from './systems/star-wars-wod/characterDocument';
import { starWarsExampleDocument, vehicleDamageDocument } from './systems/star-wars-wod/examples';
import { LENA_VARGA_DOCUMENT } from './systems/v5/modules/hunter/example';
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

/** The definition whose view is the given shipped template (the embed's create target). */
function definitionForTemplate(fragment: CustomTemplate, templateId: string) {
    return systemRegistry
        .getSystem(fragment.systemId)
        ?.documents.find((definition) =>
            definition.views.some((view) => view.layout.templateId === templateId)
        );
}

/** Renders part of a shipped template against the reader's current document (editable). */
export function TemplateFragment(props: FragmentTarget) {
    const { document } = useDocumentSource();
    const fragment = useFragment(props);
    if (!fragment) return null;
    const compatible =
        document &&
        document.systemId === fragment.systemId &&
        document.kind === fragment.documentKind;
    if (!compatible) {
        const definition = definitionForTemplate(fragment, props.template ?? 'full-sheet');
        // No compatible document yet: offer the next step instead of an empty gap.
        return (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border bg-bgSurface p-4">
                <p className="text-sm text-textSecondary">
                    {translate(uiMessages.sheet.templates.page.embedNoDocument)}
                </p>
                {fragment.documentKind === 'character' && definition && (
                    <CreateCharacterButton
                        systemId={fragment.systemId}
                        definitionId={definition.id}
                    />
                )}
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
export {
    CatalogBrowser,
    CreateCharacterButton,
    DocsLinkVariants,
    ElementStorybook,
    PolicyStatement,
};

/** Read-only example hunter (Lena Varga) used across the Hunter documentation. */
export function hunterExampleDocument(): UnknownDocumentEnvelope {
    return LENA_VARGA_DOCUMENT;
}

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

type Descriptor = { id: string; message: string };

const isDescriptor = (value: unknown): value is Descriptor =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Descriptor).id === 'string' &&
    typeof (value as Descriptor).message === 'string';

/**
 * A reference table of catalog entry names with their own-words summaries (`summary`
 * descriptors on entries). `groupBy` groups rows by an entry property (heading from the
 * entry's `<groupBy>Label` descriptor); `childCatalogId` lists child entries whose
 * `childFilterKey` equals the row's id (e.g. an Edge's Perks).
 */
export function CatalogSummaryTable({
    catalogId,
    groupBy,
    childCatalogId,
    childFilterKey,
}: {
    catalogId: string;
    groupBy?: string;
    childCatalogId?: string;
    childFilterKey?: string;
}) {
    const locale = useDocusaurusContext().i18n.currentLocale;
    const catalog = CATALOG_BINDINGS.get(catalogId);
    const children = childCatalogId ? CATALOG_BINDINGS.get(childCatalogId) : undefined;
    if (!catalog || (childCatalogId && !children)) {
        reportSheetIssue({
            code: 'catalog-unavailable',
            message: 'Documentation table references a catalog that is not registered',
            details: { catalogId, childCatalogId },
        });
        return null;
    }
    const groups = new Map<
        string,
        { label: string; entries: (typeof catalog.entries)[number][] }
    >();
    for (const entry of catalog.entries) {
        const record = entry as unknown as Record<string, unknown>;
        const key = groupBy ? String(record[groupBy] ?? '') : '';
        const heading = groupBy ? record[`${groupBy}Label`] : undefined;
        const group = groups.get(key) ?? {
            label: isDescriptor(heading) ? translate(heading) : key,
            entries: [],
        };
        group.entries.push(entry);
        groups.set(key, group);
    }
    return (
        <div className="grid gap-4">
            {[...groups.entries()].map(([key, group]) => (
                <div key={key || 'all'} className="overflow-x-auto">
                    {groupBy && <h3>{group.label}</h3>}
                    <table>
                        <tbody>
                            {group.entries.map((entry) => {
                                const summary = (entry as unknown as { summary?: unknown }).summary;
                                const childNames = children?.entries
                                    .filter(
                                        (child) =>
                                            (child as unknown as Record<string, unknown>)[
                                                childFilterKey ?? ''
                                            ] === entry.id
                                    )
                                    .map((child) => children.entryLabel(child, locale));
                                return (
                                    <tr key={entry.id}>
                                        <th scope="row">{catalog.entryLabel(entry, locale)}</th>
                                        <td>
                                            {isDescriptor(summary) && translate(summary)}
                                            {childNames && childNames.length > 0 && (
                                                <div>
                                                    <em>{childNames.join(' · ')}</em>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
}
