import { type ReactNode, useMemo } from 'react';

import { DocsHelpLink } from '../../components/controls/DocsHelpLink';
import {
    blankDocument,
    definitionExamples,
    findTemplateDefinition,
    SAMPLE_DOCUMENT_ID,
} from '../../components/dialogs/template-editor/sampleDocuments';
import { reportSheetIssue } from '../../diagnostics';
import {
    createScratchDocumentSource,
    DocumentSourceContext,
    type ScratchDocumentSource,
} from '../../hooks/useDocumentSource';
import { type ElementStory, listElementStories } from '../../storybook/stories';
import { DeclarativeSheetView } from '../sheet/declarative/DeclarativeSheetView';

/** A story's sandbox: the definition's first example (else a blank document), never stored. */
function useStorySource(systemId: string, documentKind: string) {
    return useMemo(() => {
        const definition = findTemplateDefinition(systemId, documentKind);
        if (!definition) return undefined;
        const example = definitionExamples(definition)[0]?.create();
        const initial = example
            ? { ...structuredClone(example), id: SAMPLE_DOCUMENT_ID }
            : blankDocument(systemId, definition);
        return createScratchDocumentSource(initial, definition);
    }, [systemId, documentKind]);
}

function ScratchProvider({
    children,
    scratch,
}: {
    children: ReactNode;
    scratch: ScratchDocumentSource;
}) {
    return (
        <DocumentSourceContext.Provider value={scratch.useSource()}>
            {children}
        </DocumentSourceContext.Provider>
    );
}

function StoryView({ story }: { story: ElementStory }) {
    const scratch = useStorySource(story.template.systemId, story.template.documentKind);
    if (!scratch) {
        reportSheetIssue({
            code: 'template-reference-invalid',
            message: 'Storybook story targets a document kind that is not registered',
            details: { story: story.id },
        });
        return null;
    }
    return (
        <section className="grid gap-3" data-story={story.id}>
            <div>
                <h2 className="text-xl font-semibold text-textPrimary" id={`story-${story.id}`}>
                    {story.title}
                </h2>
                <p className="text-sm text-textSecondary">{story.note}</p>
            </div>
            <div className="rounded-lg border border-dashed border-border p-3">
                <ScratchProvider scratch={scratch}>
                    <DeclarativeSheetView template={story.template} embedded />
                </ScratchProvider>
            </div>
        </section>
    );
}

/**
 * Every storybook story on sample data (T-069). Values typed here stay in the page: each story
 * has its own sandbox document.
 */
export function ElementStorybook({ filter }: { filter?: 'handwritten' | 'bound' }) {
    const stories = listElementStories().filter(({ id }) =>
        filter === undefined ? true : (filter === 'bound') === id.startsWith('bound-')
    );
    return (
        <div className="grid gap-10">
            {stories.map((story) => (
                <StoryView key={story.id} story={story} />
            ))}
        </div>
    );
}

/** The documentation help link in its three states: site page, external page, rejected. */
export function DocsLinkVariants() {
    const variants = [
        ['Site docs page (opens in the reader’s locale)', '/docs/template-editor'],
        ['External https page', 'https://example.org/'],
        ['Rejected (javascript:) — renders nothing', 'javascript:alert(1)'],
    ] as const;
    return (
        <ul className="grid gap-2">
            {variants.map(([label, docsPath]) => (
                <li key={docsPath} className="flex items-center gap-2 text-sm text-textPrimary">
                    <DocsHelpLink docsPath={docsPath} label={label} />
                    <DocsHelpLink docsPath={docsPath} label={label} size="sm" />
                    <span>{label}</span>
                    <code className="text-xs text-textSecondary">{docsPath}</code>
                </li>
            ))}
        </ul>
    );
}
