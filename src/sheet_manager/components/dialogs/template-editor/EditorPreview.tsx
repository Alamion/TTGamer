import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useMemo, useState } from 'react';

import { DeclarativeSheetView } from '../../../features/sheet/declarative/DeclarativeSheetView';
import {
    createStaticDocumentSource,
    DocumentSourceContext,
} from '../../../hooks/useDocumentSource';
import { useDocumentStore } from '../../../store/documentStore';
import type { UnknownDocumentEnvelope } from '../../../types/document';
import type { EditorDraft } from './draft';
import {
    blankDocument,
    definitionExamples,
    findTemplateDefinition,
    isCompatibleDocument,
} from './sampleDocuments';

const editor = uiMessages.sheet.templates.editor;

interface PreviewOption {
    key: string;
    label: string;
    create: () => UnknownDocumentEnvelope | undefined;
}

/**
 * The quick preview: the page exactly as a reader sees it — no editor marks, conditions applied
 * — on a chosen read-only document: the open one (when it fits), a shipped example, or a blank
 * document. Mounted only while the preview is shown.
 */
export function EditorPreview({ draft }: { draft: EditorDraft }) {
    const documents = useDocumentStore((state) => state.documents);
    const currentDocumentId = useDocumentStore((state) => state.currentDocumentId);
    const open = documents.find(({ id }) => id === currentDocumentId);
    const compatibleOpen = isCompatibleDocument(open, draft.systemId, draft.documentKind)
        ? open
        : undefined;
    const { systemId, documentKind } = draft;
    const definition = findTemplateDefinition(systemId, documentKind, compatibleOpen?.definitionId);

    const options = useMemo<PreviewOption[]>(() => {
        if (!definition) return [];
        const list: PreviewOption[] = [];
        if (compatibleOpen) {
            const openId = compatibleOpen.id;
            list.push({
                key: 'open',
                label: translate(editor.previewOpenDocument, {
                    title: compatibleOpen.metadata.title || translate(editor.untitledName),
                }),
                create: () => useDocumentStore.getState().documents.find(({ id }) => id === openId),
            });
        }
        for (const example of definitionExamples(definition)) {
            list.push({
                key: `example:${example.id}`,
                label: translate(example.label),
                create: example.create,
            });
        }
        list.push({
            key: 'blank',
            label: translate(editor.previewBlank),
            create: () => blankDocument(systemId, definition),
        });
        return list;
    }, [compatibleOpen, definition, systemId]);

    const [chosenKey, setChosenKey] = useState(() => options[0]?.key ?? 'blank');
    const chosen = options.find(({ key }) => key === chosenKey);
    // Options rebuild when the store changes, so a deleted open document falls back to blank.
    const chosenDocument = useMemo(() => chosen?.create(), [chosen]);
    const fellBack = chosen === undefined || chosenDocument === undefined;
    const document =
        chosenDocument ?? (definition ? blankDocument(systemId, definition) : undefined);
    const source = useMemo(
        () => (document ? createStaticDocumentSource(document) : undefined),
        [document]
    );

    if (!source) {
        return (
            <p role="alert" className="p-4 text-sm text-textSecondary">
                {translate(editor.noSampleDocument)}
            </p>
        );
    }

    return (
        <div className="space-y-3 p-4" data-editor-preview="">
            <label className="flex flex-wrap items-center gap-2 text-sm text-textSecondary">
                {translate(editor.previewData)}
                <select
                    value={fellBack ? 'blank' : chosenKey}
                    onChange={(event) => setChosenKey(event.target.value)}
                    className="rounded border border-border bg-bgSurface px-2 py-1 text-sm text-textPrimary"
                >
                    {options.map((option) => (
                        <option key={option.key} value={option.key}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
            {fellBack && chosenKey !== 'blank' && (
                <p role="status" className="text-xs text-textSecondary">
                    {translate(editor.previewFallback)}
                </p>
            )}
            <DocumentSourceContext.Provider value={source}>
                <DeclarativeSheetView template={draft} embedded />
            </DocumentSourceContext.Provider>
        </div>
    );
}
