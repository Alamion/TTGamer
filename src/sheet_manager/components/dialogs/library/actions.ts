import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import {
    ArrowRightLeft,
    Copy,
    Download,
    FolderPlus,
    Pencil,
    Plus,
    RotateCcw,
    SquarePen,
    Star,
    Trash2,
} from 'lucide-react';

import { acceptsNewTypes } from '../../../features/sheet/data/libraryActions';
import { hasUserContent, type LibraryNode } from '../../../features/sheet/data/libraryTree';

export type LibraryActionId =
    | 'newSetting'
    | 'newType'
    | 'newPage'
    | 'open'
    | 'duplicate'
    | 'makeDefault'
    | 'edit'
    | 'move'
    | 'export'
    | 'reset'
    | 'delete';

const actions = uiMessages.sheet.library.actions;

export const ACTION_UI: Record<
    LibraryActionId,
    { label: { id: string; message: string }; icon: typeof Plus; danger?: boolean }
> = {
    newSetting: { label: actions.newSetting, icon: FolderPlus },
    newType: { label: actions.newType, icon: Plus },
    newPage: { label: actions.newPage, icon: Plus },
    open: { label: actions.open, icon: SquarePen },
    duplicate: { label: actions.duplicate, icon: Copy },
    makeDefault: { label: actions.makeDefault, icon: Star },
    edit: { label: actions.edit, icon: Pencil },
    move: { label: actions.move, icon: ArrowRightLeft },
    export: { label: actions.export, icon: Download },
    reset: { label: actions.reset, icon: RotateCcw },
    delete: { label: actions.delete, icon: Trash2, danger: true },
};

/**
 * The actions of a node's level, in the order the details pane and the context menu show them
 * (contracts/library-ui.md "Details by level"). Moving and exporting are added by their stories.
 */
export function availableActions(
    node: LibraryNode,
    options: { canMove: boolean; canExport: boolean }
): LibraryActionId[] {
    const user = node.ownership === 'user';
    if (node.unavailable) return user && node.level !== 'ruleset' ? ['delete'] : [];
    const list: LibraryActionId[] = [];
    switch (node.level) {
        case 'ruleset':
            list.push('newSetting');
            break;
        case 'setting':
            if (acceptsNewTypes(node)) list.push('newType');
            if (user) list.push('edit');
            break;
        case 'type':
            list.push('newPage');
            if (user) list.push('edit');
            break;
        case 'page':
            list.push('open', 'duplicate');
            if (!node.isDefault) list.push('makeDefault');
            if (user) list.push('edit');
            break;
    }
    if (options.canMove) list.push('move');
    if (options.canExport && hasUserContent(node)) list.push('export');
    if (node.level === 'page' && node.ref.kind === 'shipped' && node.ref.edited) list.push('reset');
    if (user) list.push('delete');
    return list;
}
