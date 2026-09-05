import Translate, { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Plus } from 'lucide-react';

import { useDocumentStore } from '../../../store/documentStore';
import { starWarsWodSystem } from '../../../systems';

/** A compact creation action embedded in documentation examples. */
export function CreateCharacterButton() {
    const createDocument = useDocumentStore((state) => state.createDocument);

    return (
        <button
            type="button"
            onClick={() => createDocument(starWarsWodSystem.id, 'character')}
            className="inline-flex items-center justify-center gap-1.5 rounded border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
            title={translate(uiMessages.sheet.documents.toolbar.newTitle)}
        >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <Translate id="ttgamer.ui.sheet.documents.toolbar.new" />
        </button>
    );
}
