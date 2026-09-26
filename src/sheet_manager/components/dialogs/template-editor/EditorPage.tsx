import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { FlaskConical } from 'lucide-react';
import { type ReactNode, useDeferredValue, useEffect, useMemo, useRef } from 'react';

import { DeclarativeSheetView } from '../../../features/sheet/declarative/DeclarativeSheetView';
import {
    type TemplateEditorOverlay,
    TemplateEditorOverlayContext,
} from '../../../features/sheet/declarative/editorOverlay';
import {
    createScratchDocumentSource,
    DocumentSourceContext,
    type ScratchDocumentSource,
} from '../../../hooks/useDocumentSource';
import { useDocumentStore } from '../../../store/documentStore';
import type { EditorDraft } from './draft';
import { useEditorActions } from './editorActions';
import { EditorNodeFrame, InsertSlot } from './EditorNodeFrame';
import {
    blankDocument,
    definitionExamples,
    findTemplateDefinition,
    isCompatibleDocument,
    SAMPLE_DOCUMENT_ID,
} from './sampleDocuments';

const editor = uiMessages.sheet.templates.editor;

/** Clicks on these edit the sample document instead of selecting the element. */
const VALUE_CONTROLS =
    'input, select, textarea, button, a, label, [role="button"], [role="slider"]';

const overlay: TemplateEditorOverlay = {
    renderFrame: ({ node, parentId, index, column, conditionHidden, content, version }) => (
        <EditorNodeFrame
            version={version}
            node={node}
            parentId={parentId}
            index={index}
            column={column}
            conditionHidden={conditionHidden}
            content={content}
        />
    ),
    renderEndSlot: (placement) => <InsertSlot {...placement} />,
    renderEmptyColumn: (placement) => <InsertSlot {...placement} emptyColumn />,
};

/**
 * The sample document of one system and kind: a copy of the open document when it fits, else
 * the definition's first example, else a blank document. It is created once per system and
 * kind and never written back to the store.
 */
function useSampleSource(systemId: string, documentKind: string) {
    return useMemo(() => {
        const { documents, currentDocumentId } = useDocumentStore.getState();
        const open = documents.find(({ id }) => id === currentDocumentId);
        const compatible = isCompatibleDocument(open, systemId, documentKind) ? open : undefined;
        const definition = findTemplateDefinition(systemId, documentKind, compatible?.definitionId);
        if (!definition) return undefined;
        const example = definitionExamples(definition)[0]?.create();
        const initial = compatible
            ? { ...structuredClone(compatible), id: SAMPLE_DOCUMENT_ID }
            : example
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

/**
 * The page area of the editor: the draft rendered by the real sheet renderer on sample data,
 * with the editor overlay (frames, chips, insertion slots). Hover is tracked by one delegated
 * listener that marks the innermost frame, so moving the pointer re-renders nothing.
 */
export function EditorPage({ draft }: { draft: EditorDraft }) {
    const actions = useEditorActions();
    const scratch = useSampleSource(draft.systemId, draft.documentKind);
    const deferredDraft = useDeferredValue(draft);
    const hovered = useRef<Element | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    // One delegated listener: a click selects the innermost frame (keyboard users select through
    // the outline); clicks on value controls edit the sample data; empty space clears selection.
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const onClick = (event: MouseEvent) => {
            const target = event.target as Element;
            const chip = target.closest('[data-editor-chip]');
            if (!chip && target.closest(VALUE_CONTROLS)) return;
            const frame = target.closest('[data-editor-frame]');
            actions.select(frame?.getAttribute('data-node-id') ?? null, 'page');
        };
        root.addEventListener('click', onClick);
        return () => root.removeEventListener('click', onClick);
    }, [actions]);

    const setHovered = (next: Element | null) => {
        if (hovered.current === next) return;
        hovered.current?.removeAttribute('data-hover');
        next?.setAttribute('data-hover', '');
        hovered.current = next;
    };

    if (!scratch) {
        return (
            <p role="alert" className="p-4 text-sm text-textSecondary">
                {translate(editor.noSampleDocument)}
            </p>
        );
    }

    return (
        <div
            ref={rootRef}
            className="min-h-full space-y-3 p-4"
            onPointerOver={(event) =>
                setHovered((event.target as Element).closest('[data-editor-frame]'))
            }
            onPointerLeave={() => setHovered(null)}
            data-editor-page=""
        >
            <p className="flex items-center gap-2 rounded border border-dashed border-borderMoreContrast px-3 py-1.5 text-xs text-textSecondary">
                <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {translate(editor.sampleNote)}
            </p>
            <ScratchProvider scratch={scratch}>
                <TemplateEditorOverlayContext.Provider value={overlay}>
                    <DeclarativeSheetView template={deferredDraft} embedded />
                </TemplateEditorOverlayContext.Provider>
            </ScratchProvider>
        </div>
    );
}
