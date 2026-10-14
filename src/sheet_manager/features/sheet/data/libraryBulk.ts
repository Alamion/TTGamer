import type { SystemRegistry } from '../../../systems/registry';
import type { CustomTemplate } from '../../../types/template';
import { type DeletePlan, deletePlan, type LibraryState, mergeWrites } from './libraryActions';
import { isMovable, type MovePlan, type MoveTarget, moveTargets, planMove } from './libraryMoves';
import { findNode, type LibraryNode, type RulesetNode } from './libraryTree';

/**
 * Several selected rows act as one (spec 032, library multi-selection): a row whose ancestor is
 * selected too rides along with it and is not a subject of its own. Planners stay pure.
 */
export function bulkSubjects(
    tree: readonly RulesetNode[],
    keys: ReadonlySet<string>
): LibraryNode[] {
    const subjects: LibraryNode[] = [];
    for (const key of keys) {
        const found = findNode(tree, key);
        if (!found) continue;
        if (found.ancestors.some((ancestor) => keys.has(ancestor.key))) continue;
        subjects.push(found.node);
    }
    return subjects;
}

export interface BulkDeletePlan {
    /** Selected rows that cannot be deleted (shipped or unavailable): any makes the delete wait. */
    blocked: LibraryNode[];
    documentCount: number;
    catalogCount: number;
    boundTemplates: CustomTemplate[];
    writes: DeletePlan['writes'];
}

export function planBulkDelete(
    subjects: readonly LibraryNode[],
    state: LibraryState
): BulkDeletePlan {
    const blocked: LibraryNode[] = [];
    const plans: DeletePlan[] = [];
    for (const node of subjects) {
        const plan = deletePlan(node, state);
        if (plan) plans.push(plan);
        else blocked.push(node);
    }
    const templates = new Map<string, CustomTemplate>();
    for (const plan of plans) {
        for (const template of plan.boundTemplates) templates.set(template.id, template);
    }
    return {
        blocked,
        documentCount: plans.reduce((sum, plan) => sum + plan.documentCount, 0),
        catalogCount: plans.reduce((sum, plan) => sum + plan.catalogs.length, 0),
        boundTemplates: [...templates.values()],
        writes: mergeWrites(...plans.map((plan) => plan.writes)),
    };
}

/**
 * The places every subject may go to: all subjects are of one level and movable, and a target
 * counts only if each of them can go there. `undefined` when they cannot move together.
 */
export function bulkMoveTargets(
    subjects: readonly LibraryNode[],
    tree: readonly RulesetNode[]
): MoveTarget[] | undefined {
    const [first, ...rest] = subjects;
    if (!first || !isMovable(first)) return undefined;
    if (rest.some((node) => node.level !== first.level || !isMovable(node))) return undefined;
    let common = moveTargets(first.key, tree);
    for (const node of rest) {
        const keys = new Set(moveTargets(node.key, tree).map((target) => target.node.key));
        common = common.filter((target) => keys.has(target.node.key));
    }
    return common;
}

/** One plan for the whole move: the subjects' plans summed, their writes merged. */
export function planBulkMove(
    subjects: readonly LibraryNode[],
    targetKey: string,
    tree: readonly RulesetNode[],
    state: LibraryState,
    registry: SystemRegistry
): MovePlan | undefined {
    const plans: MovePlan[] = [];
    for (const node of subjects) {
        const plan = planMove(node.key, targetKey, tree, state, registry);
        if (!plan) return undefined;
        plans.push(plan);
    }
    const [first] = plans;
    if (!first) return undefined;
    const lost = new Map<string, CustomTemplate>();
    for (const plan of plans) for (const template of plan.lostBy) lost.set(template.id, template);
    const sum = (pick: (plan: MovePlan) => number) =>
        plans.reduce((total, plan) => total + pick(plan), 0);
    return {
        ...first,
        crossesSystem: plans.some((plan) => plan.crossesSystem),
        documentsMoving: sum((plan) => plan.documentsMoving),
        documentsStaying: sum((plan) => plan.documentsStaying),
        pagesStaying: sum((plan) => plan.pagesStaying),
        catalogsMoving: sum((plan) => plan.catalogsMoving),
        lostBy: [...lost.values()],
        writes: mergeWrites(...plans.map((plan) => plan.writes)),
    };
}
