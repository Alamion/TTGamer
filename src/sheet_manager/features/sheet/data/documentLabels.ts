import { translate } from '@docusaurus/Translate';

import { documentSettingLabel, systemRegistry } from '../../../systems';
import { isUserKind } from '../../../systems/userTypes';

function definitionsOfKind(systemId: string, kind: string) {
    return systemRegistry
        .listDefinitions()
        .filter(({ system, definition }) => system.id === systemId && definition.kind === kind);
}

/** The name of a document kind: its first definition's label, a user type's own name. */
export function kindLabel(systemId: string, kind: string): string {
    const [entry] = definitionsOfKind(systemId, kind);
    return entry ? translate(entry.definition.label) : kind;
}

/** The setting a kind belongs to (a user setting, a V5 line's module, else the system). */
export function kindSettingLabel(systemId: string, kind: string): string {
    const { types, settings } = systemRegistry.getUserDocumentTypes();
    const owner = types[kind]?.owner;
    const userSetting = owner && 'settingId' in owner ? settings[owner.settingId] : undefined;
    if (userSetting) return userSetting.name;
    const [entry] = definitionsOfKind(systemId, kind);
    if (entry) return translate(documentSettingLabel(entry.system, entry.definition));
    const system = systemRegistry.getSystem(systemId);
    return system ? translate(system.label) : systemId;
}

/** "Setting · Kind", e.g. "Hunter: the Reckoning 5e · Character". */
export function targetLabel(systemId: string, kind: string): string {
    return `${kindSettingLabel(systemId, kind)} · ${kindLabel(systemId, kind)}`;
}

export interface TemplateTarget {
    value: string;
    systemId: string;
    kind: string;
    label: string;
    userType: boolean;
}

/** Every system + kind a template can be written for, shipped kinds first, then user types. */
export function listTemplateTargets(): TemplateTarget[] {
    const seen = new Set<string>();
    return systemRegistry.listDefinitions().flatMap(({ system, definition }) => {
        const value = `${system.id}/${definition.kind}`;
        if (seen.has(value)) return [];
        seen.add(value);
        return [
            {
                value,
                systemId: system.id,
                kind: definition.kind,
                label: targetLabel(system.id, definition.kind),
                userType: isUserKind(definition.kind),
            },
        ];
    });
}

export interface SettingOption {
    value: string;
    systemId: string;
    moduleId?: string;
    label: string;
}

/** The shipped settings a user type can belong to: each system, or each module of a ruleset. */
export function listShippedSettings(): SettingOption[] {
    const seen = new Set<string>();
    const options: SettingOption[] = [];
    for (const system of systemRegistry.getSystems()) {
        for (const definition of system.documents) {
            const moduleId = definition.module?.id;
            const value = `${system.id}|${moduleId ?? ''}`;
            if (seen.has(value)) continue;
            seen.add(value);
            options.push({
                value,
                systemId: system.id,
                moduleId,
                label: translate(documentSettingLabel(system, definition)),
            });
        }
    }
    return options;
}
