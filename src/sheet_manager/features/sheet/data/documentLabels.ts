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

/** Where a template belongs: a system's document kind, in a user setting for core definitions. */
export interface TemplateTargetRef {
    systemId: string;
    documentKind: string;
    settingId?: string;
}

export interface TemplateTargetOption extends TemplateTargetRef {
    value: string;
    label: string;
}

export interface TemplateTargetGroup {
    key: string;
    label: string;
    options: TemplateTargetOption[];
}

/** `system/kind`, plus `/setting` for a user setting's core definition page. */
export function templateTargetValue({ systemId, documentKind, settingId }: TemplateTargetRef) {
    return settingId ? `${systemId}/${documentKind}/${settingId}` : `${systemId}/${documentKind}`;
}

export function parseTemplateTargetValue(value: string): TemplateTargetRef | undefined {
    const [systemId, documentKind, settingId] = value.split('/');
    if (!systemId || !documentKind) return undefined;
    return settingId ? { systemId, documentKind, settingId } : { systemId, documentKind };
}

/**
 * Every place a template can live, grouped by setting: shipped settings with the user types
 * they own, then each user setting with its ruleset's core definitions and its own types.
 */
export function listTemplateTargetGroups(): TemplateTargetGroup[] {
    const { types, settings } = systemRegistry.getUserDocumentTypes();
    const settingOf = (kind: string) => {
        const owner = types[kind]?.owner;
        return owner && 'settingId' in owner ? owner.settingId : undefined;
    };
    const groups: TemplateTargetGroup[] = [];
    const seen = new Set<string>();
    const add = (key: string, label: string, ref: TemplateTargetRef) => {
        const value = templateTargetValue(ref);
        if (seen.has(value)) return;
        seen.add(value);
        const option = { ...ref, value, label: kindLabel(ref.systemId, ref.documentKind) };
        const group = groups.find((candidate) => candidate.key === key);
        if (group) group.options.push(option);
        else groups.push({ key, label, options: [option] });
    };

    const all = systemRegistry.listDefinitions();
    for (const { system, definition } of all) {
        if (settingOf(definition.kind)) continue;
        const label = documentSettingLabel(system, definition);
        add(`${system.id}|${label.id}`, translate(label), {
            systemId: system.id,
            documentKind: definition.kind,
        });
    }
    for (const setting of Object.values(settings)) {
        const system = systemRegistry.getSystem(setting.systemId);
        if (!system) continue;
        for (const definitionId of system.coreDefinitions ?? []) {
            const definition = systemRegistry.getDocumentDefinition(system.id, definitionId);
            if (!definition) continue;
            add(setting.id, setting.name, {
                systemId: system.id,
                documentKind: definition.kind,
                settingId: setting.id,
            });
        }
        for (const { definition } of all) {
            if (settingOf(definition.kind) !== setting.id) continue;
            add(setting.id, setting.name, { systemId: system.id, documentKind: definition.kind });
        }
    }
    return groups;
}
