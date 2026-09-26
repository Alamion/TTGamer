import Translate, { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Plus } from 'lucide-react';

import { useDocumentStore } from '../../../store/documentStore';
import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import { useTemplateStore } from '../../../store/templateStore';
import { systemRegistry } from '../../../systems';
import { newDocumentPage } from '../data/libraryPages';

interface CreateCharacterButtonProps {
    /** System of the created document (defaults to the Star Wars character for existing docs). */
    systemId?: string;
    definitionId?: string;
}

/** A compact creation action embedded in documentation examples. */
export function CreateCharacterButton({
    systemId = 'star-wars-wod',
    definitionId = 'character',
}: CreateCharacterButtonProps) {
    const createDocument = useDocumentStore((state) => state.createDocument);

    return (
        <button
            type="button"
            onClick={() =>
                createDocument(
                    systemId,
                    definitionId,
                    newDocumentPage(systemRegistry, systemId, definitionId, undefined, {
                        templates: useTemplateStore.getState().templates,
                        defaultPages: useDocumentTypeStore.getState().defaultPages,
                    })
                )
            }
            className="inline-flex items-center justify-center gap-1.5 rounded border border-transparent bg-primary-muted px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            title={translate(uiMessages.sheet.documents.toolbar.newTitle)}
        >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <Translate id="ttgamer.ui.sheet.documents.toolbar.new" />
        </button>
    );
}
