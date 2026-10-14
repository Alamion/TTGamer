import { translate } from '@docusaurus/Translate';
import { TreeContextMenu } from '@site/src/shared/components/tree/TreeContextMenu';

import { ACTION_UI, type LibraryActionId } from './actions';

export interface ContextMenuProps {
    label: string;
    /**
     * The dialog content: the menu renders inside it, so the dialog's focus trap keeps it, and
     * the anchor is placed relative to it (the dialog is transformed, fixed children follow it).
     */
    container: HTMLElement | null;
    anchor: { x: number; y: number };
    actions: readonly LibraryActionId[];
    onAction: (id: LibraryActionId) => void;
    onClose: () => void;
}

/** The library row's menu: its action ids with their labels and icons (shared menu below). */
export function ContextMenu({ actions, onAction, ...rest }: ContextMenuProps) {
    return (
        <TreeContextMenu
            {...rest}
            actions={actions.map((id) => ({
                id,
                label: translate(ACTION_UI[id].label),
                icon: ACTION_UI[id].icon,
                danger: ACTION_UI[id].danger,
            }))}
            onAction={(id) => onAction(id as LibraryActionId)}
        />
    );
}
