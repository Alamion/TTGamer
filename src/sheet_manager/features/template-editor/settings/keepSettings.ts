import type { TemplateNode } from '../../../types/template';
import { SETTING_ENTRIES, settingApplies, settingDescription, type SettingKey } from './registry';

/**
 * Settings an element had before a switch and lost because the new element lacks them, kept per
 * element for the editor session so that switching back restores them (never stored).
 */
export type SwitchStash = Map<string, Record<string, unknown>>;

const CARRIED = SETTING_ENTRIES.filter(([, description]) => description.carry).map(([key]) => key);

type Bag = Record<string, unknown>;

/** A value worth keeping: set, and not the value that means unset. */
const meaningful = (key: SettingKey, value: unknown) =>
    value !== undefined && value !== settingDescription(key)?.unset;

/**
 * The new element with every carried setting of the old one that it can have (spec 025, FR-001).
 * `except` names settings the new element decides itself.
 */
export function keepSettings<T extends TemplateNode>(
    from: TemplateNode,
    to: T,
    except: readonly SettingKey[] = []
): T {
    const source = from as unknown as Bag;
    const next = { ...to } as unknown as Bag;
    for (const key of CARRIED) {
        if (except.includes(key) || source[key] === undefined) continue;
        if (settingApplies(key, to)) next[key] = source[key];
    }
    return next as unknown as T;
}

/** Carried settings of the old element that the new one cannot have, in registry order. */
export function droppedSettings(from: TemplateNode, to: TemplateNode): SettingKey[] {
    const source = from as unknown as Bag;
    return CARRIED.filter((key) => meaningful(key, source[key]) && !settingApplies(key, to));
}

/**
 * A switch from one element to another (source or kind): carried settings are kept, settings
 * the new element lacks wait in the stash, and stashed ones it has come back (FR-002).
 */
export function switchElement(
    from: TemplateNode,
    to: TemplateNode,
    stash: SwitchStash
): { node: TemplateNode; dropped: SettingKey[] } {
    const dropped = droppedSettings(from, to);
    const source = from as unknown as Bag;
    const waiting = { ...stash.get(from.id) };
    for (const key of dropped) waiting[key] = source[key];
    const next = keepSettings(from, to) as unknown as Bag;
    for (const key of CARRIED) {
        if (waiting[key] === undefined || !settingApplies(key, to)) continue;
        if (next[key] === undefined) next[key] = waiting[key];
        delete waiting[key];
    }
    stash.set(from.id, waiting);
    return { node: next as unknown as TemplateNode, dropped };
}
