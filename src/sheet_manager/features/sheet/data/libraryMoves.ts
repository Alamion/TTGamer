import { translate } from '@docusaurus/Translate';

import type { SystemRegistry } from '../../../systems/registry';
import {
    type CatalogOwnerRef,
    catalogScopeOf,
    isInCatalogScope,
} from '../../../systems/userCatalogs';
import type { CustomTemplate } from '../../../types/template';
import { catalogUsage } from './catalogEdit';
import {
    catalogOwnerFor,
    catalogsOfOwner,
    type LibraryState,
    type LibraryWrites,
    mergeWrites,
    ownerForSetting,
    pageDepartureWrites,
} from './libraryActions';
import {
    findNode,
    type LibraryNode,
    type RulesetNode,
    type SettingNode,
    type TypeNode,
} from './libraryTree';
import { planTemplateRetarget } from './templateRetarget';

/**
 * Moving the user's pages, types, and settings (spec 013, research R6). Planners are pure: they
 * return every write, and nothing changes before the caller applies them.
 */
const PARENT_LEVEL = { page: 'type', type: 'setting', setting: 'ruleset' } as const;

/** Catalogs (spec 015) go to any ruleset or setting: both can own them. */
const CATALOG_PARENTS = new Set(['ruleset', 'setting']);

export interface MoveTarget {
    node: LibraryNode;
    /** Its ancestors' names, to tell same-named places apart. */
    path: string;
    crossesSystem: boolean;
}

export interface MovePlan {
    subject: LibraryNode;
    target: LibraryNode;
    /** The item's system changes: bindings may break, so the move needs confirmation (FR-014). */
    crossesSystem: boolean;
    /** The system names the warning mentions. */
    fromName: string;
    toName: string;
    documentsMoving: number;
    /** FR-015a: documents of the old rules character, pinned to the page they used. */
    documentsStaying: number;
    pagesStaying: number;
    /**
     * Templates that bind a catalog they will no longer see (spec 015): the moved catalog, or the
     * old ruleset's catalogs for a setting moving to other rules. They fall back to manual choice.
     */
    lostBy: CustomTemplate[];
    /** Catalogs that travel with a moved setting. */
    catalogsMoving: number;
    writes: LibraryWrites;
}

/** Only the user's own pages, types, and settings move; shipped and core items stay (FR-013). */
export function isMovable(node: LibraryNode): node is Exclude<LibraryNode, RulesetNode> {
    return node.level !== 'ruleset' && node.ownership === 'user' && !node.unavailable;
}

function subjectSystem(node: LibraryNode): string | undefined {
    switch (node.level) {
        case 'page':
            return node.template.systemId;
        case 'type':
        case 'setting':
        case 'ruleset':
            return node.systemId;
        case 'catalog':
            return undefined;
    }
}

function eachNode(tree: readonly LibraryNode[], visit: (node: LibraryNode) => void) {
    for (const node of tree) {
        visit(node);
        if (node.level === 'ruleset') eachNode([...node.catalogs, ...node.settings], visit);
        if (node.level === 'setting') eachNode([...node.catalogs, ...node.types], visit);
        if (node.level === 'type') eachNode(node.pages, visit);
    }
}

/** Where a node may go: every place of its parent level except its current parent. */
export function moveTargets(subjectKey: string, tree: readonly RulesetNode[]): MoveTarget[] {
    const found = findNode(tree, subjectKey);
    if (!found || !isMovable(found.node)) return [];
    const subject = found.node;
    const parent = found.ancestors.at(-1);
    const isCatalog = subject.level === 'catalog';
    const fits = (node: LibraryNode) =>
        isCatalog ? CATALOG_PARENTS.has(node.level) : node.level === PARENT_LEVEL[subject.level];
    const targets: MoveTarget[] = [];
    eachNode(tree, (node) => {
        if (!fits(node) || node.key === parent?.key || node.unavailable) return;
        // "Rules only" takes no new types, but it may own catalogs.
        if (!isCatalog && node.level === 'setting' && node.ref.kind === 'rules') return;
        const path = (findNode(tree, node.key)?.ancestors ?? []).map(({ name }) => name);
        targets.push({
            node,
            path: path.join(' › '),
            crossesSystem: isCatalog
                ? subjectSystem(parent ?? node) !== subjectSystem(node)
                : subjectSystem(subject) !== subjectSystem(node),
        });
    });
    return targets;
}

export function canMove(subjectKey: string, targetKey: string, tree: readonly RulesetNode[]) {
    return moveTargets(subjectKey, tree).some(({ node }) => node.key === targetKey);
}

function systemName(registry: SystemRegistry, systemId: string | undefined): string {
    const system = systemId ? registry.getSystem(systemId) : undefined;
    return system ? translate(system.label) : (systemId ?? '');
}

function withoutSetting(template: CustomTemplate): CustomTemplate {
    const { settingId: _gone, ...rest } = template;
    void _gone;
    return rest;
}

/** Templates bound to a catalog that would not see it under `owner` (spec 015, R7). */
function templatesLosing(
    catalogId: string,
    owner: CatalogOwnerRef,
    state: LibraryState,
    registry: SystemRegistry,
    among: readonly CustomTemplate[] = state.templates
): CustomTemplate[] {
    return catalogUsage(catalogId, among).templates.filter(
        (template) => !isInCatalogScope(owner, catalogScopeOf(registry, template))
    );
}

/** A user catalog to another ruleset or setting: only its owner changes. */
function planCatalogMove(
    catalog: LibraryNode,
    target: LibraryNode,
    state: LibraryState,
    registry: SystemRegistry
) {
    if (catalog.level !== 'catalog' || catalog.ref.kind !== 'user') return undefined;
    const existing = state.catalogs[catalog.ref.catalogId];
    const owner = catalogOwnerFor(target);
    if (!existing || !owner) return undefined;
    const lostBy = templatesLosing(existing.id, owner, state, registry);
    return {
        crossesSystem: lostBy.length > 0,
        lostBy,
        writes: {
            saveCatalogs: [{ ...existing, owner, updatedAt: new Date().toISOString() }],
        } satisfies LibraryWrites,
    };
}

/** A page to another type: the T-070 retarget rules for documents and setting pages. */
function planPageMove(page: LibraryNode, target: TypeNode, state: LibraryState): LibraryWrites {
    if (page.level !== 'page' || page.ref.kind !== 'user') return {};
    const templateId = page.ref.templateId;
    const current = state.templates.find(({ id }) => id === templateId);
    if (!current || !target.systemId) return {};
    const base = withoutSetting(current);
    const after: CustomTemplate = {
        ...base,
        systemId: target.systemId as CustomTemplate['systemId'],
        documentKind: target.documentKind as CustomTemplate['documentKind'],
        ...(target.settingId ? { settingId: target.settingId } : {}),
    };
    const retarget = planTemplateRetarget(after, state);
    const leaving = pageDepartureWrites(templateId, state, { releaseDocuments: false });
    return mergeWrites(
        // Only the choices of shipped types: setting pages and type defaults come from the retarget.
        { defaultPages: leaving.defaultPages },
        {
            saveTemplates: [after],
            saveSettings: retarget.settings,
            saveTypes: retarget.types,
            documents: retarget.documentIds.map((id) => ({ id, templateId: null })),
        }
    );
}

/** A user type to another setting: its pages and documents follow it (FR-015). */
function planTypeMove(type: LibraryNode, target: SettingNode, state: LibraryState) {
    if (type.level !== 'type' || type.ref.kind !== 'user' || !target.systemId) return undefined;
    const typeId = type.ref.typeId;
    const existing = state.types[typeId];
    const owner = ownerForSetting(target.ref);
    if (!existing || !owner) return undefined;
    const settingId = target.ref.kind === 'user' ? target.ref.settingId : undefined;
    const systemId = target.systemId;
    const documents = state.documents.filter(({ definitionId }) => definitionId === typeId);
    const writes: LibraryWrites = {
        saveTypes: [{ ...existing, owner, updatedAt: new Date().toISOString() }],
        saveTemplates: state.templates
            .filter(({ documentKind }) => documentKind === typeId)
            .map((template) => {
                const moved = {
                    ...withoutSetting(template),
                    systemId: systemId as CustomTemplate['systemId'],
                };
                return template.settingId && settingId ? { ...moved, settingId } : moved;
            }),
        documents: documents.map(({ id }) => ({ id, systemId, settingId: settingId ?? null })),
    };
    return { writes, documentsMoving: documents.length };
}

/**
 * A user setting to other rules: its own types follow it; the old rules character's documents and
 * pages stay on the old ruleset among its "Rules only" items (FR-015a, research R6).
 */
function planSettingMove(
    setting: LibraryNode,
    target: RulesetNode,
    state: LibraryState,
    registry: SystemRegistry
) {
    if (setting.level !== 'setting' || setting.ref.kind !== 'user') return undefined;
    const settingId = setting.ref.settingId;
    const existing = state.settings[settingId];
    if (!existing) return undefined;
    const oldSystem = registry.getSystem(existing.systemId);
    const coreIds = new Set<string>(oldSystem?.coreDefinitions ?? []);
    const coreKinds = new Set(
        [...coreIds]
            .map((id) => registry.getDocumentDefinition(existing.systemId, id)?.kind)
            .filter((kind): kind is NonNullable<typeof kind> => kind !== undefined)
    );
    const ownTypes = new Set(
        Object.values(state.types)
            .filter(({ owner }) => 'settingId' in owner && owner.settingId === settingId)
            .map(({ id }) => id)
    );
    const systemId = target.systemId;

    const corePages = state.templates.filter(
        (template) =>
            template.settingId === settingId &&
            template.systemId === existing.systemId &&
            coreKinds.has(template.documentKind)
    );
    const staying = state.documents.filter(
        ({ definitionId, metadata }) =>
            metadata.settingId === settingId && coreIds.has(definitionId)
    );
    const moving = state.documents.filter(({ definitionId }) => ownTypes.has(definitionId));
    // The setting's own catalogs travel with it; its pages lose the old ruleset's catalogs.
    const settingTemplates = state.templates.filter(
        (template) => template.settingId === settingId || ownTypes.has(template.documentKind)
    );
    const lostBy = [
        ...new Set(
            catalogsOfOwner({ rulesetId: existing.systemId }, state).flatMap(
                ({ id }) => catalogUsage(id, settingTemplates).templates
            )
        ),
    ];

    const writes: LibraryWrites = {
        saveSettings: [
            {
                ...existing,
                systemId: systemId as typeof existing.systemId,
                // The new rules character starts without a page of its own.
                pages: Object.fromEntries(
                    Object.entries(existing.pages).filter(
                        ([definitionId]) => !coreIds.has(definitionId)
                    )
                ),
                updatedAt: new Date().toISOString(),
            },
        ],
        saveTemplates: [
            ...corePages.map(withoutSetting),
            ...state.templates
                .filter(({ documentKind }) => ownTypes.has(documentKind))
                .map((template) => ({
                    ...template,
                    systemId: systemId as CustomTemplate['systemId'],
                })),
        ],
        documents: [
            ...staying.map(({ id, definitionId, metadata }) => {
                // A document that followed the setting's page is pinned to it: it looks the same.
                const pinned = metadata.templateId ?? existing.pages[definitionId];
                return { id, settingId: null, ...(pinned ? { templateId: pinned } : {}) };
            }),
            ...moving.map(({ id }) => ({ id, systemId })),
        ],
    };
    return {
        writes,
        documentsMoving: moving.length,
        documentsStaying: staying.length,
        pagesStaying: corePages.length,
        lostBy,
        catalogsMoving: catalogsOfOwner({ settingId }, state).length,
    };
}

export function planMove(
    subjectKey: string,
    targetKey: string,
    tree: readonly RulesetNode[],
    state: LibraryState,
    registry: SystemRegistry
): MovePlan | undefined {
    if (!canMove(subjectKey, targetKey, tree)) return undefined;
    const subject = findNode(tree, subjectKey)!.node;
    const target = findNode(tree, targetKey)!.node;
    const from = subjectSystem(subject);
    const to = subjectSystem(target);
    const base = {
        subject,
        target,
        crossesSystem: from !== to,
        fromName: systemName(registry, from),
        toName: systemName(registry, to),
        documentsMoving: 0,
        documentsStaying: 0,
        pagesStaying: 0,
        lostBy: [] as CustomTemplate[],
        catalogsMoving: 0,
    };
    if (subject.level === 'catalog') {
        const plan = planCatalogMove(subject, target, state, registry);
        return plan && { ...base, ...plan };
    }
    if (subject.level === 'page' && target.level === 'type') {
        return { ...base, writes: planPageMove(subject, target, state) };
    }
    if (subject.level === 'type' && target.level === 'setting') {
        const plan = planTypeMove(subject, target, state);
        return plan && { ...base, ...plan };
    }
    if (subject.level === 'setting' && target.level === 'ruleset') {
        const plan = planSettingMove(subject, target, state, registry);
        return plan && { ...base, ...plan };
    }
    return undefined;
}
