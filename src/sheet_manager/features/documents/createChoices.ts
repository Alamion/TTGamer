import { matchesSearch } from '@site/src/shared/utils/normalizeSearchText';

import { describeError, reportSheetIssue } from '../../diagnostics';
import type { SystemRegistry } from '../../systems/registry';
import type { DocumentExample } from '../../systems/types';
import { UNAVAILABLE_RULESET_KEY } from '../sheet/data/libraryPages';
import type { RulesetNode, SettingNode, TypeNode } from '../sheet/data/libraryTree';

/**
 * The create dialog's model (spec 039, D1–D2, D5): the kinds of the library tree in its order,
 * grouped by ruleset and setting, with the device's recent kinds and fold choices.
 */
export interface CreateChoice {
    /** `system/definition`, plus `/setting` inside a user setting (the option's `data-kind`). */
    key: string;
    systemId: string;
    definitionId: string;
    settingId?: string;
    name: string;
    /** The setting the kind belongs to, shown beside a kind whose section has no heading. */
    context?: string;
    /** Ruleset, then setting (none for the rules' own kinds): shown beside a recent kind. */
    path: readonly string[];
    description?: string;
    /** User kinds may share a name; the dialog shows their description (or its absence). */
    userKind: boolean;
    /** Names in the interface language and in English, matched by the search. */
    searchText: readonly string[];
    examples: readonly DocumentExample[];
}

export interface ChoiceSection {
    key: string;
    /** Absent when the section's heading is collapsed (a single kind). */
    name?: string;
    choices: CreateChoice[];
}

export interface ChoiceGroup {
    key: string;
    name: string;
    sections: ChoiceSection[];
}

export const choiceKey = (systemId: string, definitionId: string, settingId?: string) =>
    settingId ? `${systemId}/${definitionId}/${settingId}` : `${systemId}/${definitionId}`;

/** The English names of shipped labels, so either language finds a kind. */
interface EnglishNames {
    ruleset?: string;
    setting?: string;
    kind?: string;
}

function choiceOf(
    node: TypeNode,
    setting: SettingNode,
    names: { ruleset: string; english: EnglishNames },
    registry: SystemRegistry
): CreateChoice | undefined {
    if (node.unavailable || !node.systemId) return undefined;
    const { ref } = node;
    const definitionId = ref.kind === 'user' ? ref.typeId : ref.definitionId;
    const settingId =
        ref.kind === 'core'
            ? ref.settingId
            : ref.kind === 'user' && setting.ref.kind === 'user'
              ? setting.ref.settingId
              : undefined;
    const definition = registry.getDocumentDefinition(node.systemId, definitionId);
    if (!definition) return undefined;
    const english = ref.kind === 'user' ? undefined : definition.label.message;
    return {
        key: choiceKey(node.systemId, definitionId, settingId),
        systemId: node.systemId,
        definitionId,
        ...(settingId ? { settingId } : {}),
        name: node.name,
        path: setting.ref.kind === 'rules' ? [names.ruleset] : [names.ruleset, setting.name],
        ...(node.description ? { description: node.description } : {}),
        userKind: ref.kind === 'user',
        searchText: [
            node.name,
            english,
            node.description,
            setting.name,
            names.english.setting,
            names.ruleset,
            names.english.ruleset,
        ].filter((text): text is string => !!text),
        examples: definition.examples ?? [],
    };
}

function englishSettingName(setting: SettingNode, registry: SystemRegistry): string | undefined {
    const { ref } = setting;
    if (ref.kind === 'system') return registry.getSystem(ref.systemId)?.label.message;
    if (ref.kind === 'module') {
        const definition = registry
            .getSystem(ref.systemId)
            ?.documents.find(({ module }) => module?.id === ref.moduleId);
        return definition?.module?.label.message;
    }
    return undefined;
}

/**
 * Kinds from the library tree: unavailable branches and empty settings are left out; a setting
 * with one kind shows it without its own heading, named with the setting beside it (unless the
 * setting is the ruleset's own "rules only" place).
 */
export function createChoices(
    tree: readonly RulesetNode[],
    registry: SystemRegistry
): ChoiceGroup[] {
    const groups: ChoiceGroup[] = [];
    for (const ruleset of tree) {
        if (ruleset.key === UNAVAILABLE_RULESET_KEY || ruleset.unavailable) continue;
        const rulesetEnglish = registry.getSystem(ruleset.systemId)?.label.message;
        const sections: ChoiceSection[] = [];
        for (const setting of ruleset.settings) {
            if (setting.unavailable) continue;
            const english: EnglishNames = {
                ruleset: rulesetEnglish,
                setting: englishSettingName(setting, registry),
            };
            const choices = setting.types
                .map((node) =>
                    choiceOf(node, setting, { ruleset: ruleset.name, english }, registry)
                )
                .filter((choice): choice is CreateChoice => !!choice);
            if (choices.length === 0) continue;
            const headed = choices.length > 1;
            const ownPlace = setting.ref.kind === 'rules';
            sections.push({
                key: setting.key,
                ...(headed ? { name: setting.name } : {}),
                choices:
                    headed || ownPlace
                        ? choices
                        : choices.map((choice) => ({ ...choice, context: setting.name })),
            });
        }
        if (sections.length > 0) groups.push({ key: ruleset.key, name: ruleset.name, sections });
    }
    return groups;
}

/** Kinds matching the query (every word somewhere in their names), keeping their headings. */
export function filterChoices(groups: readonly ChoiceGroup[], query: string): ChoiceGroup[] {
    if (!query.trim()) return [...groups];
    return groups
        .map((group) => ({
            ...group,
            sections: group.sections
                .map((section) => ({
                    ...section,
                    choices: section.choices.filter((choice) =>
                        matchesSearch(query, ...choice.searchText)
                    ),
                }))
                .filter(({ choices }) => choices.length > 0),
        }))
        .filter(({ sections }) => sections.length > 0);
}

/** Whether a heading is open: rulesets by default, the settings inside them only when opened. */
export const isOpenHeading = (
    toggled: ReadonlySet<string>,
    key: string,
    level: 'group' | 'section'
): boolean => toggled.has(key) !== (level === 'group');

export const listChoices = (groups: readonly ChoiceGroup[]): CreateChoice[] =>
    groups.flatMap(({ sections }) => sections.flatMap(({ choices }) => choices));

export const CREATE_DIALOG_STORAGE_KEY = 'ttgamer:create-dialog:v1';
export const RECENT_LIMIT = 5;
const STORED_KEYS_LIMIT = 200;

export interface CreatePreferences {
    /** Choice keys, newest first. */
    recent: string[];
    /**
     * Headings the player turned from their default: rulesets start open, the settings inside
     * them start folded.
     */
    toggled: string[];
}

const keyList = (value: unknown, limit: number): string[] | undefined =>
    Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length <= 300)
        ? (value as string[]).slice(0, limit)
        : undefined;

function storage(): Storage | undefined {
    try {
        return typeof window === 'undefined' ? undefined : window.localStorage;
    } catch {
        return undefined;
    }
}

/** The device's preferences; anything unreadable is dropped and reported. */
export function readCreatePreferences(): CreatePreferences {
    const empty: CreatePreferences = { recent: [], toggled: [] };
    let raw: string | null | undefined;
    try {
        raw = storage()?.getItem(CREATE_DIALOG_STORAGE_KEY);
    } catch {
        return empty;
    }
    if (!raw) return empty;
    try {
        const parsed: unknown = JSON.parse(raw);
        const record =
            parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
        const recent = keyList(record.recent, RECENT_LIMIT);
        const toggled = keyList(record.toggled, STORED_KEYS_LIMIT);
        if (!recent || !toggled) throw new Error('unexpected shape');
        return { recent, toggled };
    } catch (error) {
        reportSheetIssue({
            code: 'create-preferences-invalid',
            message: 'The stored create-dialog preferences are unreadable; they start over',
            details: { error: describeError(error) },
        });
        writeCreatePreferences(empty);
        return empty;
    }
}

export function writeCreatePreferences(preferences: CreatePreferences): void {
    try {
        storage()?.setItem(CREATE_DIALOG_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
        // Private windows may refuse storage: the dialog simply forgets.
    }
}

/** Records a created kind as the newest recent one. */
export function rememberRecent(key: string): void {
    const preferences = readCreatePreferences();
    writeCreatePreferences({
        ...preferences,
        recent: [key, ...preferences.recent.filter((other) => other !== key)].slice(
            0,
            RECENT_LIMIT
        ),
    });
}

/**
 * The recent kinds still installed, newest first. Kinds that are gone are dropped from the device
 * and reported once.
 */
export function recentChoices(
    groups: readonly ChoiceGroup[],
    preferences: CreatePreferences
): CreateChoice[] {
    const byKey = new Map(listChoices(groups).map((choice) => [choice.key, choice]));
    const found = preferences.recent.flatMap((key) => {
        const choice = byKey.get(key);
        return choice ? [choice] : [];
    });
    if (found.length < preferences.recent.length) {
        const missing = preferences.recent.filter((key) => !byKey.has(key));
        reportSheetIssue({
            code: 'create-recent-missing',
            message: 'Recent document kinds that are no longer installed were dropped',
            details: { keys: missing },
        });
        writeCreatePreferences({ ...preferences, recent: found.map(({ key }) => key) });
    }
    return found;
}
