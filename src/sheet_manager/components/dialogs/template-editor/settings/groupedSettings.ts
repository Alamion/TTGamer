import type { ReactNode } from 'react';

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

const present = (node: ReactNode) => node !== undefined && node !== null && node !== false;

/** The parts' settings per group, in part order; groups no part fills are left out. */
export function mergeGroups(
    parts: readonly GroupedSettings[]
): Array<{ id: SettingsGroupId; nodes: ReactNode[] }> {
    return SETTINGS_GROUP_ORDER.map((id) => ({
        id,
        nodes: parts.map((part) => part[id]).filter(present),
    })).filter(({ nodes }) => nodes.length > 0);
}
