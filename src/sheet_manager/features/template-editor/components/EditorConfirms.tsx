import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { ConfirmDialog } from '../../../components/dialogs/ConfirmDialog';
import { switchKind } from '../operations/switches';
import { useEditorSession } from '../session/context';
import type { DropColumnsRequest } from '../session/useNodeEdits';
import type { SaveConfirmation } from '../session/useTemplateSave';

const editor = uiMessages.sheet.templates.editor;

/** The editor's confirmations: a save that hides values, dropping columns, discarding edits. */
export function EditorConfirms({
    discardOpen,
    dropColumns,
    onClose,
    onDiscardOpenChange,
    onDropColumnsDone,
    save,
}: {
    discardOpen: boolean;
    dropColumns: DropColumnsRequest | null;
    onClose: () => void;
    onDiscardOpenChange: (open: boolean) => void;
    onDropColumnsDone: () => void;
    save: SaveConfirmation | null;
}) {
    const session = useEditorSession();
    return (
        <>
            <ConfirmDialog
                open={save !== null}
                onOpenChange={(open) => {
                    if (!open) save?.cancel();
                }}
                onConfirm={() => save?.confirm()}
                title={save?.title ?? ''}
                description={save?.description ?? ''}
                confirmLabel={save?.confirmLabel ?? ''}
                cancelLabel={translate(editor.cancel)}
            />
            <ConfirmDialog
                open={dropColumns !== null}
                onOpenChange={(open) => {
                    if (!open) onDropColumnsDone();
                }}
                onConfirm={() => {
                    if (dropColumns) {
                        session.run(
                            switchKind(dropColumns.nodeId, dropColumns.kind, session.stash)
                        );
                    }
                    onDropColumnsDone();
                }}
                title={translate(editor.dropColumnsTitle)}
                description={translate(editor.dropColumnsConfirm, {
                    columns: (dropColumns?.columns ?? []).map((label) => `“${label}”`).join(', '),
                })}
                confirmLabel={translate(editor.dropColumnsButton)}
                cancelLabel={translate(editor.cancel)}
                variant="danger"
            />
            <ConfirmDialog
                open={discardOpen}
                onOpenChange={onDiscardOpenChange}
                onConfirm={() => {
                    onDiscardOpenChange(false);
                    onClose();
                }}
                title={translate(editor.removeConfirmTitle)}
                description={translate(editor.removeConfirmDescription)}
                confirmLabel={translate(editor.discard)}
                cancelLabel={translate(editor.cancel)}
                variant="danger"
            />
        </>
    );
}
