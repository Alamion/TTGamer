import { createContext, useContext } from 'react';

/**
 * The `data-setting` keys whose value differs across the selected elements (spec 023, US3): the
 * settings building blocks mark them "Mixed". Empty outside the several-elements panel.
 */
export const MixedSettingsContext = createContext<ReadonlySet<string>>(new Set());

export function useMixedSetting(setting: string | undefined): boolean {
    const mixed = useContext(MixedSettingsContext);
    return setting !== undefined && mixed.has(setting);
}
