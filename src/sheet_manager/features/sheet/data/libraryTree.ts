import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { matchesSearch } from '@site/src/shared/utils/normalizeSearchText';

import { reportSheetIssue } from '../../../diagnostics';
import { overrideKey } from '../../../store/templateStore';
import type { SystemRegistry } from '../../../systems/registry';
import type { DocumentDefinition, SystemPlugin } from '../../../systems/types';
import { isUserKind, type UserDocumentType, type UserSetting } from '../../../systems/userTypes';
import type { CustomTemplate } from '../../../types/template';
import {
    pageNodeKey,
    type PageRef,
    rulesetNodeKey,
    settingNodeKey,
    type SettingRef,
    shippedDefaultPage,
    typeNodeKey,
    type TypeRef,
    UNAVAILABLE_RULESET_KEY,
} from './libraryPages';

/**
 * The library tree (spec 013): ruleset → setting → document type → page, derived from the
 * registry and the user stores on every change; nothing about the tree is stored.
 */
export type LibraryLevel = 'ruleset' | 'setting' | 'type' | 'page';
export type Ownership = 'shipped' | 'user';

interface LibraryNodeBase {
    key: string;
    name: string;
    description?: string;
    ownership: Ownership;
    /** Documents in the subtree (for a page: documents assigned to it). */
    documentCount: number;
    /** Its ruleset (or its owner setting) is not registered: shown, read-only, never dropped. */
    unavailable?: boolean;
}

export interface RulesetNode extends LibraryNodeBase {
    level: 'ruleset';
    systemId: string;
    settings: SettingNode[];
}

export interface SettingNode extends LibraryNodeBase {
    level: 'setting';
    ref: SettingRef;
    /** The system its documents and pages use (`undefined` when unavailable). */
    systemId: string | undefined;
    types: TypeNode[];
}

export interface TypeNode extends LibraryNodeBase {
    level: 'type';
    ref: TypeRef;
    systemId: string | undefined;
    documentKind: string;
    /** Set for core characters inside a user setting. */
    settingId?: string;
    defaultPageKey?: string;
    /** What documents show while no page of the type is the default. */
    fallback?: 'stored-values' | 'rules-only';
    pages: PageNode[];
}

export interface PageNode extends LibraryNodeBase {
    level: 'page';
    ref: PageRef;
    isDefault: boolean;
    /** The page as the editor opens it: a user template, or a shipped page with its edit. */
    template: CustomTemplate;
}

export type LibraryNode = RulesetNode | SettingNode | TypeNode | PageNode;

export interface DocumentCounts {
    /** `systemId|definitionId|settingId` → count. */
    byPlace: ReadonlyMap<string, number>;
    /** definitionId → count, for user types (their documents may sit in any system). */
    byDefinition: ReadonlyMap<string, number>;
    /** templateId → documents assigned to that page. */
    byTemplate: ReadonlyMap<string, number>;
}

const placeKey = (systemId: string, definitionId: string, settingId: string | undefined) =>
    `${systemId}|${definitionId}|${settingId ?? ''}`;

const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

/** One pass over the documents (research R10). */
export function countDocuments(
    documents: ReadonlyArray<{
        systemId: string;
        definitionId: string;
        metadata: { settingId?: string; templateId?: string };
    }>
): DocumentCounts {
    const byPlace = new Map<string, number>();
    const byDefinition = new Map<string, number>();
    const byTemplate = new Map<string, number>();
    for (const document of documents) {
        bump(
            byPlace,
            placeKey(document.systemId, document.definitionId, document.metadata.settingId)
        );
        bump(byDefinition, document.definitionId);
        if (document.metadata.templateId) bump(byTemplate, document.metadata.templateId);
    }
    return { byPlace, byDefinition, byTemplate };
}

export interface LibraryInput {
    registry: SystemRegistry;
    types: Readonly<Record<string, UserDocumentType>>;
    settings: Readonly<Record<string, UserSetting>>;
    templates: readonly CustomTemplate[];
    defaultOverrides: Readonly<Record<string, CustomTemplate>>;
    defaultPages: Readonly<Record<string, string>>;
    counts: DocumentCounts;
}

const labels = uiMessages.sheet.library;

function sum(nodes: readonly LibraryNodeBase[]): number {
    return nodes.reduce((total, node) => total + node.documentCount, 0);
}

function userPageNode(template: CustomTemplate, isDefault: boolean, input: LibraryInput) {
    return {
        key: pageNodeKey({ kind: 'user', templateId: template.id }),
        level: 'page',
        name: template.name,
        ...(template.description ? { description: template.description } : {}),
        ownership: 'user',
        documentCount: input.counts.byTemplate.get(template.id) ?? 0,
        ref: { kind: 'user', templateId: template.id },
        isDefault,
        template,
    } satisfies PageNode;
}

/** Shipped type: its shipped pages (with edits) and the user's pages for it. */
function shippedTypeNode(
    system: SystemPlugin,
    definition: DocumentDefinition,
    userPages: readonly CustomTemplate[],
    input: LibraryInput
): TypeNode {
    const ref: TypeRef = { kind: 'shipped', systemId: system.id, definitionId: definition.id };
    const chosen =
        shippedDefaultPage(input.registry, system.id, definition.id, input) ??
        definition.defaultViewId;
    const viewIds = new Set(definition.views.map(({ id }) => id));
    const shipped = (system.defaultTemplates ?? [])
        .filter(({ id }) => viewIds.has(id as never))
        .map((template): PageNode => {
            const edit = input.defaultOverrides[overrideKey(system.id, template.id)];
            return {
                key: pageNodeKey({
                    kind: 'shipped',
                    systemId: system.id,
                    viewId: template.id,
                    edited: false,
                }),
                level: 'page',
                name: edit?.name ?? template.name,
                ownership: 'shipped',
                documentCount: 0,
                ref: {
                    kind: 'shipped',
                    systemId: system.id,
                    viewId: template.id,
                    edited: edit !== undefined,
                },
                isDefault: template.id === chosen,
                template: edit ?? template,
            };
        });
    const pages = [
        ...shipped,
        ...userPages.map((template) => userPageNode(template, template.id === chosen, input)),
    ];
    const defaultPage = pages.find(({ isDefault }) => isDefault);
    return {
        key: typeNodeKey(ref),
        level: 'type',
        name: translate(definition.label),
        ownership: 'shipped',
        documentCount: input.counts.byPlace.get(placeKey(system.id, definition.id, undefined)) ?? 0,
        ref,
        systemId: system.id,
        documentKind: definition.kind,
        ...(defaultPage ? { defaultPageKey: defaultPage.key } : {}),
        pages,
    };
}

function userTypeNode(
    type: UserDocumentType,
    systemId: string | undefined,
    input: LibraryInput,
    unavailable = false
): TypeNode {
    const own = input.templates.filter(({ documentKind }) => documentKind === type.id);
    const defaultId = own.some(({ id }) => id === type.defaultTemplateId)
        ? type.defaultTemplateId
        : own[0]?.id;
    const pages = own.map((template) => userPageNode(template, template.id === defaultId, input));
    const ref: TypeRef = { kind: 'user', typeId: type.id };
    const defaultPage = pages.find(({ isDefault }) => isDefault);
    return {
        key: typeNodeKey(ref),
        level: 'type',
        name: type.name,
        ...(type.description ? { description: type.description } : {}),
        ownership: 'user',
        documentCount: input.counts.byDefinition.get(type.id) ?? 0,
        ...(unavailable ? { unavailable } : {}),
        ref,
        systemId,
        documentKind: type.id,
        ...(defaultPage ? { defaultPageKey: defaultPage.key } : { fallback: 'stored-values' }),
        pages,
    };
}

function coreTypeNode(
    system: SystemPlugin,
    definition: DocumentDefinition,
    setting: UserSetting,
    input: LibraryInput
): TypeNode {
    const own = input.templates.filter(
        (template) =>
            template.settingId === setting.id &&
            template.systemId === system.id &&
            template.documentKind === definition.kind
    );
    const chosen = setting.pages[definition.id];
    const pages = own.map((template) => userPageNode(template, template.id === chosen, input));
    const ref: TypeRef = {
        kind: 'core',
        systemId: system.id,
        definitionId: definition.id,
        settingId: setting.id,
    };
    const defaultPage = pages.find(({ isDefault }) => isDefault);
    return {
        key: typeNodeKey(ref),
        level: 'type',
        name: translate(definition.label),
        ownership: 'shipped',
        documentCount:
            input.counts.byPlace.get(placeKey(system.id, definition.id, setting.id)) ?? 0,
        ref,
        systemId: system.id,
        documentKind: definition.kind,
        settingId: setting.id,
        ...(defaultPage ? { defaultPageKey: defaultPage.key } : { fallback: 'rules-only' }),
        pages,
    };
}

function settingNode(
    ref: SettingRef,
    name: string,
    systemId: string | undefined,
    types: TypeNode[],
    extra: Partial<Pick<SettingNode, 'description' | 'ownership' | 'unavailable'>> = {}
): SettingNode {
    return {
        key: settingNodeKey(ref),
        level: 'setting',
        name,
        ownership: 'shipped',
        documentCount: sum(types),
        ref,
        systemId,
        types,
        ...extra,
    };
}

/**
 * Builds the four-level tree (data-model "Placement rules"). Items whose references cannot be
 * placed land in a final read-only "Unavailable" group and are reported, never dropped.
 */
export function buildLibraryTree(input: LibraryInput): RulesetNode[] {
    const { registry, types, settings, templates } = input;
    const placedTemplates = new Set<string>();
    const placedTypes = new Set<string>();
    const userTypesOwnedBy = (predicate: (type: UserDocumentType) => boolean) =>
        Object.values(types).filter(predicate);

    /**
     * User pages of a shipped definition, outside any user setting. Definitions may share a kind
     * (a Star Wars droid is a character): a page is listed once, under the first of them.
     */
    const userPagesOf = (systemId: string, definition: DocumentDefinition) =>
        templates.filter(
            (template) =>
                template.systemId === systemId &&
                template.documentKind === definition.kind &&
                !template.settingId &&
                !isUserKind(template.documentKind) &&
                !placedTemplates.has(template.id)
        );

    const shippedTypes = (system: SystemPlugin, definitions: readonly DocumentDefinition[]) =>
        definitions.map((definition) => {
            const pages = userPagesOf(system.id, definition);
            for (const { id } of pages) placedTemplates.add(id);
            return shippedTypeNode(system, definition, pages, input);
        });

    const userTypes = (owned: readonly UserDocumentType[], systemId: string | undefined) =>
        owned.map((type) => {
            placedTypes.add(type.id);
            const node = userTypeNode(type, systemId, input);
            for (const page of node.pages) placedTemplates.add(page.template.id);
            return node;
        });

    const rulesets = registry.listRulesets().map((ruleset): RulesetNode => {
        const plain = ruleset.documents.filter(({ module }) => !module);
        const rulesOnly = settingNode(
            { kind: 'rules', systemId: ruleset.id },
            translate(labels.rulesOnly),
            ruleset.id,
            [
                ...shippedTypes(ruleset, plain),
                ...userTypes(
                    userTypesOwnedBy(
                        ({ owner }) =>
                            'systemId' in owner && owner.systemId === ruleset.id && !owner.moduleId
                    ),
                    ruleset.id
                ),
            ]
        );

        const modules = new Map<string, DocumentDefinition[]>();
        for (const definition of ruleset.documents) {
            if (!definition.module) continue;
            modules.set(definition.module.id, [
                ...(modules.get(definition.module.id) ?? []),
                definition,
            ]);
        }
        const moduleSettings = [...modules.entries()].map(([moduleId, definitions]) =>
            settingNode(
                { kind: 'module', systemId: ruleset.id, moduleId },
                translate(definitions[0]!.module!.label),
                ruleset.id,
                [
                    ...shippedTypes(ruleset, definitions),
                    ...userTypes(
                        userTypesOwnedBy(
                            ({ owner }) =>
                                'systemId' in owner &&
                                owner.systemId === ruleset.id &&
                                owner.moduleId === moduleId
                        ),
                        ruleset.id
                    ),
                ]
            )
        );

        const settingSystems = registry.settingSystemsOf(ruleset.id).map((system) =>
            settingNode(
                { kind: 'system', systemId: system.id },
                translate(system.label),
                system.id,
                [
                    ...shippedTypes(system, system.documents),
                    ...userTypes(
                        userTypesOwnedBy(
                            ({ owner }) => 'systemId' in owner && owner.systemId === system.id
                        ),
                        system.id
                    ),
                ]
            )
        );

        const own = Object.values(settings)
            .filter(({ systemId }) => systemId === ruleset.id)
            .map((setting) => {
                const core = (ruleset.coreDefinitions ?? [])
                    .map((id) => registry.getDocumentDefinition(ruleset.id, id))
                    .filter((definition): definition is DocumentDefinition => !!definition)
                    .map((definition) => {
                        const node = coreTypeNode(ruleset, definition, setting, input);
                        for (const page of node.pages) placedTemplates.add(page.template.id);
                        return node;
                    });
                return settingNode(
                    { kind: 'user', settingId: setting.id },
                    setting.name,
                    ruleset.id,
                    [
                        ...core,
                        ...userTypes(
                            userTypesOwnedBy(
                                ({ owner }) =>
                                    'settingId' in owner && owner.settingId === setting.id
                            ),
                            ruleset.id
                        ),
                    ],
                    {
                        ownership: 'user',
                        ...(setting.description ? { description: setting.description } : {}),
                    }
                );
            });

        const settingNodes = [rulesOnly, ...moduleSettings, ...settingSystems, ...own];
        return {
            key: rulesetNodeKey(ruleset.id),
            level: 'ruleset',
            name: translate(ruleset.label),
            ownership: 'shipped',
            documentCount: sum(settingNodes),
            systemId: ruleset.id,
            settings: settingNodes,
        };
    });

    // Whatever the rulesets did not claim: settings on unknown rulesets, types whose owner is gone.
    const unavailable: SettingNode[] = [];
    const orphanSettings = Object.values(settings).filter(
        ({ systemId }) => !registry.listRulesets().some(({ id }) => id === systemId)
    );
    for (const setting of orphanSettings) {
        const owned = userTypesOwnedBy(
            ({ owner }) => 'settingId' in owner && owner.settingId === setting.id
        );
        unavailable.push(
            settingNode(
                { kind: 'user', settingId: setting.id },
                setting.name,
                undefined,
                owned.map((type) => {
                    placedTypes.add(type.id);
                    return userTypeNode(type, undefined, input, true);
                }),
                { ownership: 'user', unavailable: true }
            )
        );
    }
    const strays = Object.values(types).filter(({ id }) => !placedTypes.has(id));
    if (strays.length > 0) {
        reportSheetIssue({
            code: 'library-placement',
            message: 'User document types whose owner is not available are listed as unavailable',
            details: { typeIds: strays.map(({ id }) => id) },
        });
        unavailable.push(
            settingNode(
                { kind: 'user', settingId: 'unavailable' },
                translate(labels.unavailable),
                undefined,
                strays.map((type) => userTypeNode(type, undefined, input, true)),
                { ownership: 'user', unavailable: true }
            )
        );
        for (const type of strays) {
            for (const template of templates) {
                if (template.documentKind === type.id) placedTemplates.add(template.id);
            }
        }
    }
    const unplaced = templates.filter(({ id }) => !placedTemplates.has(id));
    if (unplaced.length > 0) {
        reportSheetIssue({
            code: 'library-placement',
            message: 'Pages that fit no type of the library are not listed in the tree',
            details: { templateIds: unplaced.map(({ id }) => id) },
        });
    }
    if (unavailable.length === 0) return rulesets;
    return [
        ...rulesets,
        {
            key: UNAVAILABLE_RULESET_KEY,
            level: 'ruleset',
            name: translate(labels.unavailable),
            ownership: 'shipped',
            documentCount: sum(unavailable),
            unavailable: true,
            systemId: '',
            settings: unavailable,
        },
    ];
}

export function childrenOf(node: LibraryNode): readonly LibraryNode[] {
    switch (node.level) {
        case 'ruleset':
            return node.settings;
        case 'setting':
            return node.types;
        case 'type':
            return node.pages;
        case 'page':
            return [];
    }
}

/** Whether a node or anything below it is the user's (export and the "yours" filter). */
export function hasUserContent(node: LibraryNode): boolean {
    if (node.ownership === 'user') return true;
    if (node.level === 'page') return node.ref.kind === 'shipped' && node.ref.edited;
    return childrenOf(node).some(hasUserContent);
}

export type LibraryFilter = 'all' | 'yours' | 'edited';

function isEditedPage(node: LibraryNode): boolean {
    return node.level === 'page' && node.ref.kind === 'shipped' && node.ref.edited;
}

function matchesFilter(node: LibraryNode, filter: LibraryFilter): boolean {
    if (filter === 'yours') return node.ownership === 'user' || isEditedPage(node);
    if (filter === 'edited') return isEditedPage(node);
    return true;
}

/**
 * Keeps the nodes matching the query and filter with the branches leading to them (FR-005). A
 * matching container keeps its whole subtree for a query, only its matches for a filter.
 */
export function filterTree(
    tree: readonly RulesetNode[],
    { query, filter }: { query: string; filter: LibraryFilter }
): RulesetNode[] {
    const trimmed = query.trim();
    if (!trimmed && filter === 'all') return [...tree];
    const keep = <T extends LibraryNode>(node: T): T | undefined => {
        const hit =
            (!trimmed || matchesSearch(trimmed, node.name, node.description)) &&
            matchesFilter(node, filter);
        const children = childrenOf(node)
            .map((child) => keep(child))
            .filter((child): child is LibraryNode => child !== undefined);
        if (!hit && children.length === 0) return undefined;
        const kept = hit && filter === 'all' ? childrenOf(node) : children;
        switch (node.level) {
            case 'ruleset':
                return { ...node, settings: kept as SettingNode[] };
            case 'setting':
                return { ...node, types: kept as TypeNode[] };
            case 'type':
                return { ...node, pages: kept as PageNode[] };
            default:
                return node;
        }
    };
    return tree.map((node) => keep(node)).filter((node): node is RulesetNode => !!node);
}

export interface VisibleRow {
    node: LibraryNode;
    depth: number;
    parentKey: string | undefined;
}

/** Rows in display order: only expanded branches contribute children (keyboard navigation). */
export function flattenVisible(
    tree: readonly LibraryNode[],
    expanded: ReadonlySet<string>
): VisibleRow[] {
    const rows: VisibleRow[] = [];
    const walk = (nodes: readonly LibraryNode[], depth: number, parentKey?: string) => {
        for (const node of nodes) {
            rows.push({ node, depth, parentKey });
            if (expanded.has(node.key)) walk(childrenOf(node), depth + 1, node.key);
        }
    };
    walk(tree, 1);
    return rows;
}

export interface FoundNode {
    node: LibraryNode;
    /** Outermost first: ruleset, setting, type. */
    ancestors: LibraryNode[];
}

export function findNode(tree: readonly LibraryNode[], key: string): FoundNode | undefined {
    const search = (
        nodes: readonly LibraryNode[],
        ancestors: LibraryNode[]
    ): FoundNode | undefined => {
        for (const node of nodes) {
            if (node.key === key) return { node, ancestors };
            const found = search(childrenOf(node), [...ancestors, node]);
            if (found) return found;
        }
        return undefined;
    };
    return search(tree, []);
}

/** Keys of every container, for "expand all" while searching or filtering. */
export function containerKeys(tree: readonly LibraryNode[]): string[] {
    const keys: string[] = [];
    const walk = (nodes: readonly LibraryNode[]) => {
        for (const node of nodes) {
            if (node.level === 'page') continue;
            keys.push(node.key);
            walk(childrenOf(node));
        }
    };
    walk(tree);
    return keys;
}
