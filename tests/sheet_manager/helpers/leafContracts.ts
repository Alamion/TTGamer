import {
    type CustomTemplate,
    isContainerNode,
    type TemplateNode,
} from '@site/src/sheet_manager/types/template';

/** Keys that only place or caption a field on the page; everything else is its contract. */
const LAYOUT_KEYS = new Set(['column', 'span', 'hideLabel']);

/**
 * Every field of a page by node id, without its layout keys: what it binds, computes, and rolls
 * (spec 042, FR-002). A layout-only change keeps this map equal.
 */
export function leafContracts(template: CustomTemplate): Record<string, unknown> {
    const contracts: Record<string, unknown> = {};
    const walk = (node: TemplateNode) => {
        if (isContainerNode(node)) {
            node.children.forEach(walk);
            return;
        }
        contracts[node.id] = Object.fromEntries(
            Object.entries(node).filter(([key]) => !LAYOUT_KEYS.has(key))
        );
    };
    template.children.forEach(walk);
    return Object.fromEntries(Object.entries(contracts).sort(([a], [b]) => a.localeCompare(b)));
}
