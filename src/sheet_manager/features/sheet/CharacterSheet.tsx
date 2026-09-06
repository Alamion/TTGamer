import Translate, { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { AlertTriangle } from 'lucide-react';

import { useDocumentStore } from '../../store/documentStore';
import { useTemplateStore } from '../../store/templateStore';
import {
    resolveCustomTemplate,
    resolveDocumentView,
    resolveEffectiveTemplate,
    systemRegistry,
} from '../../systems';
import { DeclarativeSheetView } from './declarative/DeclarativeSheetView';
import { getBuiltInSheetBlock } from './registry/builtInBlockRegistry';
import { SheetWorkspace } from './shell/SheetWorkspace';

const page = uiMessages.sheet.templates.page;

function FallbackNotice() {
    return (
        <div
            role="alert"
            className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-border bg-bgSurface p-4 lg:mx-6"
        >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
            <div>
                <p className="text-sm font-semibold text-textPrimary">
                    <Translate id="ttgamer.ui.sheet.templates.page.fallbackTitle" />
                </p>
                <p className="mt-1 text-xs text-textSecondary">
                    {translate(page.fallbackDescription)}
                </p>
            </div>
        </div>
    );
}

function CurrentDocumentSheet() {
    const { currentDocumentId, documents } = useDocumentStore();
    const { templates, defaultOverrides } = useTemplateStore();
    const document = documents.find(({ id }) => id === currentDocumentId);
    if (!document) return null;
    const definition = systemRegistry.getDocumentDefinition(
        document.systemId,
        document.definitionId
    );
    if (!definition) return null;

    const resolved = resolveCustomTemplate(document.metadata.templateId, templates, document.kind);

    if (resolved && !('reason' in resolved)) {
        return <DeclarativeSheetView template={resolved} />;
    }

    // Feature 004: the selected view IS a default template — render it declaratively with its
    // persisted override applied (no migration, no special-case mapping).
    const viewId =
        document.metadata.preferredViewId ??
        resolveDocumentView(definition, document.metadata.preferredViewId)?.id;
    if (viewId) {
        const effective = resolveEffectiveTemplate(
            viewId,
            { templates, defaultOverrides },
            document.systemId,
            document.kind
        );
        if (effective) {
            return (
                <>
                    {resolved && 'reason' in resolved && <FallbackNotice />}
                    <DeclarativeSheetView template={effective.template} />
                </>
            );
        }
    }

    const view = resolveDocumentView(definition, document.metadata.preferredViewId);
    if (!view) return null;

    const content =
        view.layout.type === 'built-in' ? (
            <div className="mx-auto max-w-7xl space-y-8 p-4 lg:p-6">
                {view.layout.blocks.map((block) => {
                    const Block = getBuiltInSheetBlock(block.id);
                    if (!Block) throw new Error(`Unknown built-in sheet block: ${block.id}`);
                    return <Block key={block.id} accentColor={block.accentColor} />;
                })}
            </div>
        ) : null;

    if (!resolved) return content;

    return (
        <>
            <FallbackNotice />
            {content}
        </>
    );
}

export function CharacterSheet() {
    return (
        <SheetWorkspace>
            <CurrentDocumentSheet />
        </SheetWorkspace>
    );
}
