import { translate } from '@docusaurus/Translate';

import { systemRegistry } from '../../systems';
import type { DocumentModule } from '../../systems/types';
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

/** A document row's badge: its letters, full name, and the mark drawn instead of the letters. */
export interface DocumentBadge {
    badge: string;
    name: string;
    /** Site path of a shipped setting's mark (spec 046). */
    mark?: string;
    /** A user setting's own cleaned SVG picture, with the setting's id to report it by. */
    picture?: { svg: string; settingId: string };
}

/** A system's short badge and its full name (documents window rows, spec 045). */
function systemBadge(systemId: string): DocumentBadge {
    const system = systemRegistry.getSystem(systemId);
    if (!system) return { badge: systemId, name: systemId };
    return {
        badge: translate(system.badge ?? system.label),
        name: translate(system.label),
        ...(system.badgeMark ? { mark: system.badgeMark } : {}),
    };
}

/** The module a kind belongs to: its shipped definition's, or a user type's owner module. */
function moduleOf(systemId: string, kind: string): DocumentModule | undefined {
    const owner = systemRegistry.getUserDocumentTypes().types[kind]?.owner;
    const moduleId = owner && 'moduleId' in owner ? owner.moduleId : undefined;
    for (const { system, definition } of systemRegistry.listDefinitions()) {
        if (system.id !== systemId || !definition.module) continue;
        if (moduleId ? definition.module.id === moduleId : definition.kind === kind)
            return definition.module;
    }
    return undefined;
}

/**
 * A document row's badge, from its setting (spec 046): a user setting's (own badge, else the
 * name's initials, named "Setting · System"), else its module's (VtM, HtR), else its system's.
 */
export function documentBadge(systemId: string, kind: string, settingId?: string): DocumentBadge {
    const setting = userSettingOf(kind, settingId);
    const system = systemBadge(systemId);
    if (setting) {
        return {
            badge: setting.badge ?? initialsOf(setting.name),
            name: `${setting.name} · ${system.name}`,
            ...(setting.picture
                ? { picture: { svg: setting.picture, settingId: setting.id } }
                : {}),
        };
    }
    const module = moduleOf(systemId, kind);
    if (!module) return system;
    const name = translate(module.label);
    return {
        badge: module.badge ? translate(module.badge) : name,
        name,
        ...(module.badgeMark ? { mark: module.badgeMark } : {}),
    };
}
