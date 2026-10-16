import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { LibraryPanel } from '../../../components/dialogs/LibraryPanel';
import { DocumentsPanel } from '../../../components/documents/DocumentsPanel';
import { registerTabKind } from './tabKeys';

/**
 * Registers the sheet page's own tools (spec 036): the documents window and the library. Returns
 * the release; the sheet registers them while it is mounted.
 */
export function registerSheetTools(): () => void {
    const releases = [
        registerTabKind('documents', {
            title: () => translate(uiMessages.sheet.documents.manager.title),
            closeLabel: () => translate(uiMessages.sheet.documents.manager.close),
            render: ({ onClose }) => <DocumentsPanel onClose={onClose} />,
        }),
        registerTabKind('library', {
            title: () => translate(uiMessages.sheet.library.title),
            closeLabel: () => translate(uiMessages.sheet.library.close),
            render: () => <LibraryPanel />,
        }),
    ];
    return () => {
        for (const release of releases) release();
    };
}
