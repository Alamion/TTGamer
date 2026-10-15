import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { FloatingWindow } from '@site/src/shared/components/FloatingWindow';
import { LibraryPanel } from '@site/src/sheet_manager/components/dialogs/LibraryPanel';
import { DocumentsPanel } from '@site/src/sheet_manager/components/documents/DocumentsPanel';

interface ToolWindowProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * The documents tool in a floating window, as the layout floats it (spec 036): the window's
 * title and close button come from the tool, the content is the documents panel.
 */
export function DocumentsWindow({ open, onOpenChange }: ToolWindowProps) {
    return (
        <FloatingWindow
            open={open}
            id="t:documents"
            title={translate(uiMessages.sheet.documents.manager.title)}
            closeLabel={translate(uiMessages.sheet.documents.manager.close)}
            onClose={() => onOpenChange(false)}
        >
            {open && <DocumentsPanel onClose={() => onOpenChange(false)} />}
        </FloatingWindow>
    );
}

/** The library tool in a floating window, as the layout floats it (spec 036). */
export function LibraryWindow({ open, onOpenChange }: ToolWindowProps) {
    return (
        <FloatingWindow
            open={open}
            id="t:library"
            title={translate(uiMessages.sheet.library.title)}
            closeLabel={translate(uiMessages.sheet.library.close)}
            onClose={() => onOpenChange(false)}
            initialWidth={1024}
            initialHeight={736}
        >
            {open && <LibraryPanel />}
        </FloatingWindow>
    );
}
