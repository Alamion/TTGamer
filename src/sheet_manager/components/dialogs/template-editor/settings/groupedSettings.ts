import { Children, Fragment, isValidElement, type ReactNode } from 'react';

/** The settings groups of every element kind, in display order (spec 022, FR-002). */
export const SETTINGS_GROUP_ORDER = ['content', 'value', 'limits', 'look', 'visibility'] as const;

export type SettingsGroupId = (typeof SETTINGS_GROUP_ORDER)[number];

/** What one settings part contributes to each group; absent groups contribute nothing. */
export type GroupedSettings = Partial<Record<SettingsGroupId, ReactNode>>;

/** Where an issue sends the author: the group to open and the control's `data-setting`. */
export interface SettingRef {
    group: SettingsGroupId;
    key: string;
}

/** A part's group is empty when it is nothing, or a fragment whose children are all nothing. */
function present(node: ReactNode): boolean {
    if (node === undefined || node === null || typeof node === 'boolean') return false;
    if (isValidElement<{ children?: ReactNode }>(node) && node.type === Fragment) {
        return Children.toArray(node.props.children).length > 0;
    }
    return true;
}

/** The parts' settings per group, in part order; groups no part fills are left out. */
export function mergeGroups(
    parts: readonly GroupedSettings[]
): Array<{ id: SettingsGroupId; nodes: ReactNode[] }> {
    return SETTINGS_GROUP_ORDER.map((id) => ({
        id,
        nodes: parts.map((part) => part[id]).filter(present),
    })).filter(({ nodes }) => nodes.length > 0);
}
