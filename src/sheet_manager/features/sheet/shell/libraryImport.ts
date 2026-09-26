import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { generateDraftId } from '../../../components/dialogs/template-editor/draft';
import { useTemplateStore } from '../../../store/templateStore';
import type { SystemRegistry } from '../../../systems/registry';
import type { DocumentDefinition } from '../../../systems/types';
import {
    isUserKind,
    newUserSettingId,
    newUserTypeId,
    type UserDocumentType,
    type UserSetting,
} from '../../../systems/userTypes';
import type { CustomTemplate } from '../../../types/template';
import { applyLibraryWrites } from '../data/libraryActions';
import type { LibraryLevel } from '../data/libraryTree';
import { type LibraryPayload, overrideRecordId } from './libraryFile';

/**
 * Import preview and installation of library files (spec 013, research R8): every file entry is
 * new, the same as installed, in conflict, or unavailable here; nothing is written before
 * `installImport`.
 */
export type ImportState = 'new' | 'same' | 'conflict' | 'unavailable';
export type ImportChoice = 'replace' | 'keep-both';
export type RecordKind = 'setting' | 'type' | 'template' | 'override';

type ReasonId = keyof typeof uiMessages.sheet.library.import.reasons;

export interface ImportEntry {
    key: string;
    level: LibraryLevel;
    name: string;
    /** `undefined`: a shipped or installed place the file attaches to (never ticked). */
    record?: { kind: RecordKind; id: string; state: ImportState; reason?: ReasonId };
    children: ImportEntry[];
}

export interface ImportInstalled {
    settings: Readonly<Record<string, UserSetting>>;
    types: Readonly<Record<string, UserDocumentType>>;
    templates: readonly CustomTemplate[];
    defaultOverrides: Readonly<Record<string, CustomTemplate>>;
}

export const recordKey = (kind: RecordKind, id: string) => `${kind}:${id}`;

function comparable(value: object): string {
    const { createdAt: _c, updatedAt: _u, ...rest } = value as Record<string, unknown>;
    void _c;
    void _u;
    return JSON.stringify(rest, Object.keys(rest).sort());
}

function compare(incoming: object, installed: object | undefined): ImportState {
    if (!installed) return 'new';
    return comparable(incoming) === comparable(installed) ? 'same' : 'conflict';
}

/** Builds the preview tree: ruleset → setting → type → page, file entries placed like the library. */
export function buildImportPreview(
    payload: LibraryPayload,
    installed: ImportInstalled,
    registry: SystemRegistry
): ImportEntry[] {
    const roots: ImportEntry[] = [];
    const byKey = new Map<string, ImportEntry>();
    const rulesetIds = new Set(registry.listRulesets().map(({ id }) => id));
    const fileSettings = new Map(payload.settings.map((setting) => [setting.id, setting]));
    const fileTypes = new Map(payload.types.map((type) => [type.id, type]));

    const node = (
        parent: ImportEntry[] | ImportEntry,
        key: string,
        level: LibraryLevel,
        name: string,
        record?: ImportEntry['record']
    ): ImportEntry => {
        const existing = byKey.get(key);
        if (existing) {
            if (record && !existing.record) existing.record = record;
            return existing;
        }
        const entry: ImportEntry = {
            key,
            level,
            name,
            ...(record ? { record } : {}),
            children: [],
        };
        byKey.set(key, entry);
        (Array.isArray(parent) ? parent : parent.children).push(entry);
        return entry;
    };

    const unavailableRoot = () =>
        node(roots, 'r:unavailable', 'ruleset', translate(uiMessages.sheet.library.unavailable));

    const rulesetEntry = (systemId: string) => {
        const system = registry.getSystem(systemId);
        return system && rulesetIds.has(system.id)
            ? node(roots, `r:${systemId}`, 'ruleset', translate(system.label))
            : unavailableRoot();
    };

    /** The shipped setting a definition (or an owner) of a system lives in. */
    const shippedSetting = (systemId: string, moduleId?: string): ImportEntry | undefined => {
        const system = registry.getSystem(systemId);
        if (!system) return undefined;
        if (system.ruleset) {
            return node(
                rulesetEntry(system.ruleset),
                `s:system:${systemId}`,
                'setting',
                translate(system.label)
            );
        }
        if (moduleId) {
            const module = system.documents.find((d) => d.module?.id === moduleId)?.module;
            if (!module) return undefined;
            return node(
                rulesetEntry(systemId),
                `s:module:${systemId}:${moduleId}`,
                'setting',
                translate(module.label)
            );
        }
        return node(
            rulesetEntry(systemId),
            `s:rules:${systemId}`,
            'setting',
            translate(uiMessages.sheet.library.rulesOnly)
        );
    };

    const settingEntry = (settingId: string): ImportEntry | undefined => {
        const incoming = fileSettings.get(settingId);
        const current = installed.settings[settingId];
        const setting = incoming ?? current;
        if (!setting) return undefined;
        const available = rulesetIds.has(setting.systemId);
        return node(
            rulesetEntry(setting.systemId),
            `s:user:${settingId}`,
            'setting',
            setting.name,
            incoming
                ? {
                      kind: 'setting',
                      id: settingId,
                      state: available ? compare(incoming, current) : 'unavailable',
                      ...(available ? {} : { reason: 'rules' as const }),
                  }
                : undefined
        );
    };

    const definitionByKind = (systemId: string, kind: string): DocumentDefinition | undefined =>
        registry.getSystem(systemId)?.documents.find((definition) => definition.kind === kind);

    const typeEntry = (typeId: string): ImportEntry | undefined => {
        const incoming = fileTypes.get(typeId);
        const current = installed.types[typeId];
        const type = incoming ?? current;
        if (!type) return undefined;
        let parent: ImportEntry | undefined;
        if ('settingId' in type.owner) parent = settingEntry(type.owner.settingId);
        else parent = shippedSetting(type.owner.systemId, type.owner.moduleId);
        const parentUnavailable = !parent || parent.record?.state === 'unavailable';
        const state: ImportState = parentUnavailable
            ? 'unavailable'
            : compare(incoming ?? type, current);
        return node(
            parent ?? unavailableRoot(),
            `t:user:${typeId}`,
            'type',
            type.name,
            incoming
                ? {
                      kind: 'type',
                      id: typeId,
                      state,
                      ...(parentUnavailable ? { reason: 'owner' as const } : {}),
                  }
                : undefined
        );
    };

    for (const setting of payload.settings) settingEntry(setting.id);
    for (const type of payload.types) typeEntry(type.id);

    const pageParent = (template: CustomTemplate): ImportEntry | undefined => {
        if (isUserKind(template.documentKind)) return typeEntry(template.documentKind);
        const definition = definitionByKind(template.systemId, template.documentKind);
        if (!definition) return undefined;
        if (template.settingId) {
            const setting = settingEntry(template.settingId);
            if (!setting) return undefined;
            return node(
                setting,
                `t:core:${template.settingId}:${definition.id}`,
                'type',
                translate(definition.label)
            );
        }
        const setting = shippedSetting(template.systemId, definition.module?.id);
        return setting
            ? node(
                  setting,
                  `t:${template.systemId}:${definition.id}`,
                  'type',
                  translate(definition.label)
              )
            : undefined;
    };

    for (const template of payload.templates) {
        const parent = pageParent(template);
        const current = installed.templates.find(({ id }) => id === template.id);
        // An installed template of another kind is unrelated: the incoming one gets a new id.
        const related =
            current &&
            current.documentKind === template.documentKind &&
            current.systemId === template.systemId
                ? current
                : undefined;
        const unavailable = !parent || parent.record?.state === 'unavailable';
        node(parent ?? unavailableRoot(), `p:user:${template.id}`, 'page', template.name, {
            kind: 'template',
            id: template.id,
            state: unavailable ? 'unavailable' : compare(template, related),
            ...(unavailable ? { reason: 'place' as const } : {}),
        });
    }

    for (const override of payload.overrides) {
        const definition = registry
            .getSystem(override.systemId)
            ?.documents.find((d) => d.views.some(({ id }) => id === override.id));
        const parent = definition
            ? pageParent({ ...override, documentKind: definition.kind })
            : undefined;
        const current = installed.defaultOverrides[overrideRecordId(override)];
        node(
            parent ?? unavailableRoot(),
            `p:${override.systemId}:${override.id}`,
            'page',
            override.name,
            {
                kind: 'override',
                id: overrideRecordId(override),
                state: parent ? compare(override, current) : 'unavailable',
                ...(parent ? {} : { reason: 'shippedPage' as const }),
            }
        );
    }

    // Available rulesets first, in registry order; the unavailable group last.
    const order = [...rulesetIds].map((id) => `r:${id}`);
    return roots.sort(
        (a, b) =>
            (order.indexOf(a.key) + 1 || order.length + 1) -
            (order.indexOf(b.key) + 1 || order.length + 1)
    );
}

// --- Selection ---------------------------------------------------------------------------------

export interface ImportChoiceState {
    picked: boolean;
    choice: ImportChoice;
}
export type ImportChoices = Record<string, ImportChoiceState>;

function walk(
    entries: readonly ImportEntry[],
    visit: (entry: ImportEntry, parents: ImportEntry[]) => void
) {
    const go = (list: readonly ImportEntry[], parents: ImportEntry[]) => {
        for (const entry of list) {
            visit(entry, parents);
            go(entry.children, [...parents, entry]);
        }
    };
    go(entries, []);
}

const pickable = (entry: ImportEntry) =>
    entry.record !== undefined &&
    (entry.record.state === 'new' || entry.record.state === 'conflict');

/** New and conflicting entries start picked, conflicts as Replace (FR-019). */
export function initialChoices(preview: readonly ImportEntry[]): ImportChoices {
    const choices: ImportChoices = {};
    walk(preview, (entry) => {
        if (!entry.record) return;
        choices[recordKey(entry.record.kind, entry.record.id)] = {
            picked: pickable(entry),
            choice: 'replace',
        };
    });
    return choices;
}

/** Ticks or unticks an entry and its pickable descendants. */
export function togglePick(entry: ImportEntry, choices: ImportChoices): ImportChoices {
    const next = { ...choices };
    const keys: string[] = [];
    walk([entry], (item) => {
        if (pickable(item)) keys.push(recordKey(item.record!.kind, item.record!.id));
    });
    if (keys.length === 0) return choices;
    const allPicked = keys.every((key) => next[key]?.picked);
    for (const key of keys) {
        next[key] = { choice: next[key]?.choice ?? 'replace', picked: !allPicked };
    }
    return next;
}

export function setChoice(
    choices: ImportChoices,
    key: string,
    choice: ImportChoice
): ImportChoices {
    return { ...choices, [key]: { picked: choices[key]?.picked ?? true, choice } };
}

export interface EffectivePicks {
    picked: Set<string>;
    /** New parents a picked child cannot be installed without (tertiary in the preview). */
    auto: Set<string>;
    /** Keep-both entries, including picked descendants of a keep-both parent. */
    keepBoth: Set<string>;
}

export function effectivePicks(
    preview: readonly ImportEntry[],
    choices: ImportChoices
): EffectivePicks {
    const picked = new Set<string>();
    const auto = new Set<string>();
    const keepBoth = new Set<string>();
    walk(preview, (entry, parents) => {
        if (!entry.record) return;
        const key = recordKey(entry.record.kind, entry.record.id);
        const state = choices[key];
        if (!state?.picked || !pickable(entry)) return;
        picked.add(key);
        const parentKeepsBoth = parents.some(
            (parent) =>
                parent.record && keepBoth.has(recordKey(parent.record.kind, parent.record.id))
        );
        if (
            (entry.record.state === 'conflict' && state.choice === 'keep-both') ||
            parentKeepsBoth
        ) {
            keepBoth.add(key);
        }
        for (const parent of parents) {
            if (!parent.record || parent.record.state !== 'new') continue;
            const parentKey = recordKey(parent.record.kind, parent.record.id);
            if (!choices[parentKey]?.picked) auto.add(parentKey);
        }
    });
    return { picked, auto, keepBoth };
}

// --- Installation --------------------------------------------------------------------------------

export interface ImportSummary {
    settings: number;
    types: number;
    pages: number;
}

function withSuffix(name: string): string {
    const suffixed = `${name} ${translate(uiMessages.sheet.library.import.suffix)}`;
    return suffixed.slice(0, 80);
}

/** Writes the picked entries (settings, types, templates, then overrides) in one batch per store. */
export function installImport(
    payload: LibraryPayload,
    preview: readonly ImportEntry[],
    choices: ImportChoices,
    installed: ImportInstalled,
    registry: SystemRegistry
): ImportSummary {
    const { picked, auto, keepBoth } = effectivePicks(preview, choices);
    const take = (kind: RecordKind, id: string) =>
        picked.has(recordKey(kind, id)) || auto.has(recordKey(kind, id));
    const fresh = (kind: RecordKind, id: string) => keepBoth.has(recordKey(kind, id));

    const settingIds = new Map<string, string>();
    const typeIds = new Map<string, string>();
    const templateIds = new Map<string, string>();
    for (const setting of payload.settings) {
        if (take('setting', setting.id) && fresh('setting', setting.id)) {
            settingIds.set(setting.id, newUserSettingId());
        }
    }
    for (const type of payload.types) {
        if (take('type', type.id) && fresh('type', type.id)) typeIds.set(type.id, newUserTypeId());
    }
    const shippedViewIds = new Set(
        registry
            .getSystems()
            .flatMap((system) =>
                system.documents.flatMap((definition) =>
                    definition.views.map(({ id }) => String(id))
                )
            )
    );
    for (const template of payload.templates) {
        if (!take('template', template.id)) continue;
        const current = installed.templates.find(({ id }) => id === template.id);
        const unrelated =
            current &&
            (current.documentKind !== template.documentKind ||
                current.systemId !== template.systemId);
        if (fresh('template', template.id) || unrelated || shippedViewIds.has(template.id)) {
            templateIds.set(template.id, generateDraftId('tpl'));
        }
    }
    const setting = (id: string) => settingIds.get(id) ?? id;
    const type = (id: string) => typeIds.get(id) ?? id;
    const page = (id: string) => templateIds.get(id) ?? id;

    const settings = payload.settings
        .filter(({ id }) => take('setting', id))
        .map((entry) => ({
            ...entry,
            id: setting(entry.id),
            ...(settingIds.has(entry.id) ? { name: withSuffix(entry.name) } : {}),
            pages: Object.fromEntries(
                Object.entries(entry.pages).map(([key, id]) => [key, page(id)])
            ),
        }));
    const types = payload.types
        .filter(({ id }) => take('type', id))
        .map((entry) => ({
            ...entry,
            id: type(entry.id),
            ...(typeIds.has(entry.id) ? { name: withSuffix(entry.name) } : {}),
            owner:
                'settingId' in entry.owner
                    ? { settingId: setting(entry.owner.settingId) }
                    : entry.owner,
            ...(entry.defaultTemplateId
                ? { defaultTemplateId: page(entry.defaultTemplateId) }
                : {}),
        }));
    const templates = payload.templates
        .filter(({ id }) => take('template', id))
        .map((entry) => ({
            ...entry,
            id: page(entry.id),
            ...(fresh('template', entry.id) ? { name: withSuffix(entry.name) } : {}),
            documentKind: (isUserKind(entry.documentKind)
                ? type(entry.documentKind)
                : entry.documentKind) as CustomTemplate['documentKind'],
            ...(entry.settingId ? { settingId: setting(entry.settingId) } : {}),
        }));
    const overrides = payload.overrides.filter((entry) =>
        take('override', overrideRecordId(entry))
    );
    // "Keep both" for an edited shipped page installs it as the user's own page of that type.
    const keptOverrides = overrides
        .filter((entry) => fresh('override', overrideRecordId(entry)))
        .map((entry) => ({ ...entry, id: generateDraftId('tpl'), name: withSuffix(entry.name) }));
    const replacedOverrides = overrides.filter(
        (entry) => !fresh('override', overrideRecordId(entry))
    );

    applyLibraryWrites({
        saveSettings: settings,
        saveTypes: types,
        saveTemplates: [...templates, ...keptOverrides],
    });
    if (replacedOverrides.length > 0) {
        const { setDefaultOverride } = useTemplateStore.getState();
        for (const override of replacedOverrides) setDefaultOverride(override);
    }
    return {
        settings: settings.length,
        types: types.length,
        pages: templates.length + overrides.length,
    };
}
