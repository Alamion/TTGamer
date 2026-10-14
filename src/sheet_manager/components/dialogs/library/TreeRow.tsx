import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import {
    type SelectExtend,
    TreeRowShell,
    type TreeRowSlots,
} from '@site/src/shared/components/tree/TreeRowShell';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import clsx from 'clsx';
import { Dices, FileText, Globe2, LayoutTemplate, Star, Table2 } from 'lucide-react';
import type { KeyboardEvent } from 'react';

import type { LibraryLevel, LibraryNode } from '../../../features/sheet/data/libraryTree';

const labels = uiMessages.sheet.library;

const LEVEL_ICON: Record<LibraryLevel, typeof Dices> = {
    ruleset: Dices,
    setting: Globe2,
    type: LayoutTemplate,
    page: FileText,
    catalog: Table2,
};

const badge = 'shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide';

type PluralMessage = ReturnType<typeof usePluralMessage>;

export function libraryNodeHasChildren(node: LibraryNode): boolean {
    switch (node.level) {
        case 'ruleset':
            return node.catalogs.length + node.settings.length > 0;
        case 'setting':
            return node.catalogs.length + node.types.length > 0;
        case 'type':
            return node.pages.length > 0;
        case 'page':
        case 'catalog':
            return false;
    }
}

/** What a library row says besides its name (contracts/library-ui.md "Row content"). */
export function libraryRowSlots(node: LibraryNode, plural: PluralMessage): TreeRowSlots {
    const Icon = LEVEL_ICON[node.level];
    const count =
        node.level === 'ruleset'
            ? plural(labels.counts.settings, node.settings.length)
            : node.level === 'setting'
              ? plural(labels.counts.types, node.types.length)
              : node.level === 'type'
                ? plural(labels.counts.documents, node.documentCount)
                : node.level === 'catalog'
                  ? plural(labels.counts.entries, node.entryCount)
                  : undefined;
    const edited = node.level === 'page' && node.ref.kind === 'shipped' && node.ref.edited;
    return {
        icon: <Icon className="h-4 w-4 shrink-0 text-textSecondary" aria-hidden="true" />,
        badges: (
            <>
                {node.level === 'page' && node.isDefault && (
                    <Star
                        className="h-3.5 w-3.5 shrink-0 fill-secondary text-secondary"
                        aria-label={translate(labels.badges.default)}
                        role="img"
                    />
                )}
                {node.ownership === 'user' && node.level !== 'ruleset' && (
                    <span className={clsx(badge, 'bg-primary/10 text-primary')}>
                        {translate(labels.badges.yours)}
                    </span>
                )}
                {edited && (
                    <span className={clsx(badge, 'bg-secondary/15 text-textPrimary')}>
                        {translate(labels.badges.edited)}
                    </span>
                )}
                {node.level === 'setting' && node.ref.kind === 'rules' && (
                    <span className={clsx(badge, 'bg-bgBase text-textSecondary')}>
                        {translate(labels.badges.noSetting)}
                    </span>
                )}
                {node.unavailable && (
                    <span className={clsx(badge, 'bg-bgBase text-textSecondary')}>
                        {translate(labels.badges.unavailable)}
                    </span>
                )}
            </>
        ),
        count,
        dimmed: node.unavailable,
    };
}

export const libraryTreeLabels = {
    toggle: (name: string, expanded: boolean) =>
        translate(expanded ? labels.row.collapse : labels.row.expand, { name }),
    actions: (name: string) => translate(labels.row.actions, { name }),
};

export interface TreeRowProps extends Pick<
    TreeRowSlots,
    'checkbox' | 'trailing' | 'drag' | 'flash'
> {
    node: LibraryNode;
    depth: number;
    setSize: number;
    position: number;
    expanded: boolean;
    selected: boolean;
    tabbable: boolean;
    onSelect: (key: string, extend?: SelectExtend) => void;
    onToggle: (key: string) => void;
    onMenu: (key: string, anchor: { x: number; y: number }) => void;
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

/** One row of the library tree, drawn alone (the dev storybook shows every state this way). */
export function TreeRow({
    node,
    depth,
    expanded,
    checkbox,
    trailing,
    drag,
    flash,
    onSelect,
    ...rest
}: TreeRowProps) {
    const plural = usePluralMessage();
    return (
        <TreeRowShell
            idPrefix="library-row-"
            rowKey={node.key}
            name={node.name}
            depth={depth}
            expandable={libraryNodeHasChildren(node)}
            expanded={expanded}
            toggleLabel={libraryTreeLabels.toggle(node.name, expanded)}
            actionsLabel={libraryTreeLabels.actions(node.name)}
            {...libraryRowSlots(node, plural)}
            checkbox={checkbox}
            trailing={trailing}
            drag={drag}
            flash={flash}
            onSelect={(key, extend) => onSelect(key, extend)}
            {...rest}
        />
    );
}
