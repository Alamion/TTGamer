import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { SettingsGroupId } from './groupedSettings';

export type GroupOpenState = Record<SettingsGroupId, boolean>;

/** Content, value, and limits start open; look and visibility start closed (data-model.md). */
export const DEFAULT_GROUP_OPEN: GroupOpenState = {
    content: true,
    value: true,
    limits: true,
    look: false,
    visibility: false,
};

export interface SettingsGroupState {
    open: GroupOpenState;
    setOpen: (id: SettingsGroupId, open: boolean) => void;
}

/** The open groups of one editor session, shared by every element kind (not persisted). */
export const SettingsGroupStateContext = createContext<SettingsGroupState | null>(null);

export function useSettingsGroupSession(): SettingsGroupState {
    const [open, setState] = useState<GroupOpenState>(DEFAULT_GROUP_OPEN);
    const setOpen = useCallback(
        (id: SettingsGroupId, next: boolean) =>
            setState((current) => (current[id] === next ? current : { ...current, [id]: next })),
        []
    );
    return useMemo(() => ({ open, setOpen }), [open, setOpen]);
}

/** The dialog's session state, or a local one where settings render on their own. */
export function useSettingsGroupState(): SettingsGroupState {
    const local = useSettingsGroupSession();
    return useContext(SettingsGroupStateContext) ?? local;
}

/** Issue counts per element and group, for the badges of collapsed groups. */
export type IssueGroupCounts = ReadonlyMap<string, Partial<Record<SettingsGroupId, number>>>;

export const IssueGroupCountsContext = createContext<IssueGroupCounts>(new Map());

export function useIssueGroupCounts(): IssueGroupCounts {
    return useContext(IssueGroupCountsContext);
}
