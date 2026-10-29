import { translate } from '@docusaurus/Translate';

import { systemRegistry } from '../../systems';
import { kindLabel, kindSettingLabel, userSettingOf } from '../sheet/data/documentLabels';
import type { DocumentLabeler } from './query';
import { entryTitle } from './rows';

/** The labels the documents window searches, filters, and sorts by (the registry's names). */
export const documentLabeler: DocumentLabeler = {
    kind: kindLabel,
    setting: kindSettingLabel,
    system: (systemId) => {
        const system = systemRegistry.getSystem(systemId);
        return system ? translate(system.label) : systemId;
    },
    title: entryTitle,
};

/**
 * Up to three initials of a name, as written ("Super testing Setting" → "StS"); a single word gives
 * its first three letters.
 */
export function initialsOf(name: string): string {
    const words = name.trim().split(/\s+/u).filter(Boolean);
    if (words.length === 1) return [...words[0]!].slice(0, 3).join('');
    return words
        .slice(0, 3)
        .map((word) => [...word][0])
        .join('');
}

/** A system's short badge and its full name (documents window rows, spec 045). */
export function systemBadge(systemId: string): { badge: string; name: string } {
    const system = systemRegistry.getSystem(systemId);
    if (!system) return { badge: systemId, name: systemId };
    return { badge: translate(system.badge ?? system.label), name: translate(system.label) };
}

/**
 * A document row's badge: its user setting's (own badge, else the name's initials, named
 * "Setting · System"), else its system's.
 */
export function documentBadge(
    systemId: string,
    kind: string,
    settingId?: string
): { badge: string; name: string } {
    const setting = userSettingOf(kind, settingId);
    const system = systemBadge(systemId);
    if (!setting) return system;
    return {
        badge: setting.badge ?? initialsOf(setting.name),
        name: `${setting.name} · ${system.name}`,
    };
}
