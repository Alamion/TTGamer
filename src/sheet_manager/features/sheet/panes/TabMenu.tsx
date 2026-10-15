import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import {
    TreeContextMenu,
    type TreeMenuItem,
} from '@site/src/shared/components/tree/TreeContextMenu';
import {
    ChevronLeft,
    ChevronRight,
    Columns2,
    Maximize2,
    Minimize2,
    MoveRight,
    Rows2,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { groupOf, groupsInOrder, type LayoutState, type SplitSide } from './layoutTree';
import {
    closeTab,
    moveTabBy,
    moveToNextGroup,
    splitWith,
    toggleMaximized,
    usePaneStore,
} from './paneStore';

const labels = uiMessages.sheet.documents.panes;

/**
 * A tab's menu (spec 036, FR-005): every move, split, maximize, and close without a pointer. Splits
 * that would make a seventh group, or a group under its minimum size, stay listed but disabled, and
 * choosing one says why.
 */
export function TabMenu({
    anchor,
    canSplit,
    layout,
    onClose,
    onDone,
    tabKey,
    titleOf,
}: {
    anchor: { x: number; y: number };
    canSplit: (groupId: string, side: SplitSide, key: string) => boolean;
    layout: LayoutState;
    onClose: () => void;
    /** A move or split happened: what to announce. */
    onDone: (announcement: string) => void;
    tabKey: string;
    titleOf: (key: string) => string;
}) {
    const group = groupOf(layout.root, tabKey);
    if (!group) return null;
    const groups = groupsInOrder(layout.root);
    const index = group.tabs.indexOf(tabKey);
    const name = titleOf(tabKey);
    const maximized = layout.maximized === group.id;
    // Read after the action: the props still hold the layout from before it.
    const groupNumber = () =>
        groupsInOrder(usePaneStore.getState().root).findIndex((candidate) =>
            candidate.tabs.includes(tabKey)
        ) + 1;
    const actions: TreeMenuItem[] = [
        { id: 'left', label: translate(labels.moveLeft), icon: ChevronLeft, disabled: index === 0 },
        {
            id: 'right',
            label: translate(labels.moveRight),
            icon: ChevronRight,
            disabled: index === group.tabs.length - 1,
        },
        {
            id: 'next',
            label: translate(labels.moveToNextGroup),
            icon: MoveRight,
            disabled: groups.length < 2,
        },
        {
            id: 'splitRight',
            label: translate(labels.splitRight),
            icon: Columns2,
            disabled: !canSplit(group.id, 'right', tabKey),
        },
        {
            id: 'splitDown',
            label: translate(labels.splitDown),
            icon: Rows2,
            disabled: !canSplit(group.id, 'bottom', tabKey),
        },
        ...(groups.length > 1
            ? [
                  {
                      id: 'maximize',
                      label: maximized
                          ? translate(labels.restore)
                          : translate(labels.maximize, { name }),
                      icon: maximized ? Minimize2 : Maximize2,
                  },
              ]
            : []),
        { id: 'close', label: translate(labels.close, { name }), icon: X, danger: true },
    ];
    const moved = () => onDone(translate(labels.moved, { name, number: String(groupNumber()) }));
    return (
        <TreeContextMenu
            label={translate(labels.actions, { name })}
            container={null}
            anchor={anchor}
            actions={actions}
            onClose={onClose}
            onDisabled={(id) => {
                if (id === 'splitRight' || id === 'splitDown') toast(translate(labels.groupLimit));
            }}
            onAction={(id) => {
                if (id === 'left' || id === 'right') {
                    moveTabBy(tabKey, id === 'left' ? -1 : 1);
                    moved();
                } else if (id === 'next') {
                    moveToNextGroup(tabKey);
                    moved();
                } else if (id === 'splitRight' || id === 'splitDown') {
                    if (splitWith(tabKey, group.id, id === 'splitRight' ? 'right' : 'bottom')) {
                        onDone(translate(labels.split, { name }));
                    }
                } else if (id === 'maximize') toggleMaximized(group.id);
                else if (id === 'close') closeTab(tabKey);
            }}
        />
    );
}
