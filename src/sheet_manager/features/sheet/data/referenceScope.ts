import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { SystemRegistry } from '../../../systems';
import { catalogScopeOf } from '../../../systems/userCatalogs';
import { isUserKind, ownerSystemId } from '../../../systems/userTypes';
import { kindLabel, kindSettingLabel, targetLabel } from './documentLabels';

/** The template a reference belongs to: the owner of its setting scope (spec 017, R1). */
export interface ReferenceTemplateRef {
    systemId: string;
    documentKind: string;
    settingId?: string;
}

/** A document type a reference may target in its template's setting. */
export interface ReferenceTarget {
    kind: string;
    label: string;
}

/** What a document must match to be offered by a reference (R3). */
export interface ReferenceScope {
    systemId: string;
    settingId: string | undefined;
    kinds: ReadonlySet<string>;
}

interface ScopedKind {
    systemId: string;
    kind: string;
    userName?: string;
}

type TemplateSetting = { settingId: string } | { systemId: string; moduleId?: string };

/** The template's setting (R1); a template never belongs to a ruleset-level catalog owner. */
function settingOf(registry: SystemRegistry, template: ReferenceTemplateRef): TemplateSetting {
    const { setting } = catalogScopeOf(registry, template);
    return 'rulesetId' in setting ? { systemId: template.systemId } : setting;
}

/**
 * The kinds of the template's setting (R2): a user setting reuses its ruleset's core kinds and
 * owns its user types; a shipped line adds its module's kinds to the core kinds and ruleset-level
 * user types; a shipped system without a module offers its module-less kinds and user types.
 */
function scopedKinds(registry: SystemRegistry, template: ReferenceTemplateRef): ScopedKind[] {
    const setting = settingOf(registry, template);
    const { types, settings } = registry.getUserDocumentTypes();
    const systemId = referenceScopeSystemId(registry, template);
    const system = registry.getSystem(systemId);
    if (!system) return [];
    const core = new Set<string>(system.coreDefinitions ?? []);
    const shipped = system.documents.filter((definition) => {
        if ('settingId' in setting) return core.has(definition.id);
        if (setting.moduleId) {
            return definition.module?.id === setting.moduleId || core.has(definition.id);
        }
        return !definition.module;
    });
    const owned = Object.values(types).filter(({ owner }) => {
        if ('settingId' in setting)
            return 'settingId' in owner && owner.settingId === setting.settingId;
        if ('settingId' in owner || owner.systemId !== systemId) return false;
        return !owner.moduleId || owner.moduleId === setting.moduleId;
    });
    return [
        ...shipped.map(({ kind }) => ({ systemId, kind: String(kind) })),
        ...owned
            .filter((type) => ownerSystemId(type, settings) === systemId)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((type) => ({ systemId, kind: type.id, userName: type.name })),
    ];
}

/** The system a reference's documents must belong to: a user setting's ruleset, else the template's. */
export function referenceScopeSystemId(
    registry: SystemRegistry,
    template: ReferenceTemplateRef
): string {
    const setting = settingOf(registry, template);
    if ('settingId' in setting) {
        return (
            registry.getUserDocumentTypes().settings[setting.settingId]?.systemId ??
            template.systemId
        );
    }
    return setting.systemId;
}

/** The document types a reference in this template may target, one per kind (R2, R6). */
export function referenceTargetsOf(
    registry: SystemRegistry,
    template: ReferenceTemplateRef
): ReferenceTarget[] {
    const seen = new Set<string>();
    const targets: Array<ReferenceTarget & { systemId: string; own: boolean }> = [];
    for (const { systemId, kind, userName } of scopedKinds(registry, template)) {
        if (seen.has(kind)) continue;
        seen.add(kind);
        const own = userName !== undefined;
        targets.push({ systemId, kind, own, label: userName ?? kindLabel(systemId, kind) });
    }
    // Names that read the same gain their setting; within one setting, the user's own type is
    // marked instead (FR-004).
    const withSetting = relabelDuplicates(targets, (target) =>
        target.own
            ? `${kindSettingLabel(target.systemId, target.kind)} · ${target.label}`
            : targetLabel(target.systemId, target.kind)
    );
    return relabelDuplicates(withSetting, (target) =>
        target.own
            ? translate(uiMessages.sheet.templates.editor.referenceKindOwn, { type: target.label })
            : target.label
    ).map(({ kind, label }) => ({ kind, label }));
}

function relabelDuplicates<T extends ReferenceTarget>(
    targets: T[],
    relabel: (target: T) => string
): T[] {
    const counts = new Map<string, number>();
    for (const { label } of targets) counts.set(label, (counts.get(label) ?? 0) + 1);
    return targets.map((target) =>
        (counts.get(target.label) ?? 0) > 1 ? { ...target, label: relabel(target) } : target
    );
}

/** The scope documents are matched against on the sheet (R3). */
export function referenceScopeOf(
    registry: SystemRegistry,
    template: ReferenceTemplateRef
): ReferenceScope {
    const setting = settingOf(registry, template);
    return {
        systemId: referenceScopeSystemId(registry, template),
        settingId: 'settingId' in setting ? setting.settingId : undefined,
        kinds: new Set(referenceTargetsOf(registry, template).map(({ kind }) => kind)),
    };
}

export function isDocumentInReferenceScope(
    scope: ReferenceScope,
    document: { systemId: string; kind: string; metadata: { settingId?: string } }
): boolean {
    return (
        document.systemId === scope.systemId &&
        (document.metadata.settingId ?? undefined) === scope.settingId &&
        scope.kinds.has(document.kind)
    );
}

/** The best known name of a kind outside the scope: any system's definition, else its id. */
export function referenceKindName(registry: SystemRegistry, kind: string): string {
    if (isUserKind(kind)) {
        const type = registry.getUserDocumentTypes().types[kind];
        if (type) return type.name;
    }
    const entry = registry.listDefinitions().find(({ definition }) => definition.kind === kind);
    return entry ? targetLabel(entry.system.id, kind) : kind;
}
