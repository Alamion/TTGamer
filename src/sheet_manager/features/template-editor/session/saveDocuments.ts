import { type CustomTemplate, walkTemplateNodes } from '../../../types/template';

/** The nodes whose stored values a save can stop showing, by id, as comparable text. */
function valueBearingNodes(template: CustomTemplate): Map<string, string> {
    const nodes = new Map<string, string>();
    walkTemplateNodes(template.children, (node) => {
        const bearsValues =
            node.type === 'list' ||
            node.type === 'table' ||
            node.type === 'tracker' ||
            (node.type === 'primitive' && node.bindingKey.startsWith('track:'));
        if (bearsValues) nodes.set(node.id, JSON.stringify(node));
    });
    return nodes;
}

/**
 * Whether the save checks (spec 016, 018, 022) need the documents' stored values: a list, table,
 * or tracker of the saved page changed or went away. Otherwise no document is read for a save.
 */
export function savedValuesMayChange(before: CustomTemplate, after: CustomTemplate): boolean {
    const now = valueBearingNodes(after);
    for (const [id, json] of valueBearingNodes(before)) {
        if (now.get(id) !== json) return true;
    }
    return false;
}
