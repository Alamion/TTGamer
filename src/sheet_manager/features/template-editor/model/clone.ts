import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { resolveDataBindingByCoordinate } from '../../../systems/templateBindings';
import type { ListItemField, TemplateNode } from '../../../types/template';
import { isContainerNode, isTemplateField } from '../../../types/template';
import { renameFormulaCoordinates } from '../../sheet/declarative/formula';
import { type DraftIdPrefix, generateDraftId } from './ids';
import { fail, insertNode, keepTermOnRename, locate, type TermCarrier } from './tree';
import { type DraftOpResult, type EditorDraft } from './types';

function idPrefixFor(node: TemplateNode): DraftIdPrefix {
    switch (node.type) {
        case 'section':
            return 'sec';
        case 'group':
            return 'grp';
        case 'table':
            return 'blk';
        case 'list':
            return 'lst';
        default:
            return 'f';
    }
}

export interface CloneOptions {
    /** The copy lands on the page it came from (Duplicate, or a paste there). */
    samePage: boolean;
    /** Coordinates the target page already uses; a kept value key must not collide. */
    targetCoordinates?: ReadonlySet<string>;
}

const FORMULA_SETTINGS = ['formula', 'maxFrom', 'minFrom', 'maxMinFrom'] as const;

/** Points the formulas and display conditions of a copy at the copy's own coordinates. */
function remapCoordinates(node: TemplateNode, renamed: ReadonlyMap<string, string>) {
    const rename = (coordinate: string) => renamed.get(coordinate);
    const remap = (carrier: Record<string, unknown>) => {
        for (const key of FORMULA_SETTINGS) {
            const formula = carrier[key];
            if (typeof formula === 'string') {
                carrier[key] = renameFormulaCoordinates(formula, rename);
            }
        }
        const condition = carrier.visibleWhen as { coordinate?: string } | undefined;
        if (condition?.coordinate) {
            const [base, ...part] = condition.coordinate.split('.');
            const next = rename(base!);
            if (next) condition.coordinate = [next, ...part].join('.');
        }
    };
    const walk = (current: TemplateNode) => {
        remap(current as unknown as Record<string, unknown>);
        if (current.type === 'table') {
            current.columns.forEach((column) =>
                remap(column as unknown as Record<string, unknown>)
            );
        }
        if (current.type === 'list' && current.item) {
            remap(current.item as unknown as Record<string, unknown>);
        }
        if (isContainerNode(current)) current.children.forEach(walk);
    };
    walk(node);
}

/**
 * A copy of a subtree with fresh identifiers for every node, table column, and select option.
 * On the same page custom values are not shared with the original: an explicit custom `valueKey`
 * is dropped so the copy's coordinate becomes its new id. On another page (a paste, spec 023) a
 * custom key is kept unless that page already uses it. A coordinate that addresses system data
 * is always kept, so a copied trait row still shows the same trait. Formulas and display
 * conditions inside the copy are pointed at the copy's own coordinates.
 */
export function cloneWithFreshIds(
    draft: EditorDraft,
    original: TemplateNode,
    { samePage, targetCoordinates }: CloneOptions = { samePage: true }
): TemplateNode {
    const copy = structuredClone(original);
    const renamed = new Map<string, string>();
    const keepCoordinate = (node: { id: string; valueKey?: string }) => {
        const coordinate = node.valueKey ?? node.id;
        if (resolveDataBindingByCoordinate(draft.systemId, draft.documentKind, coordinate)) {
            node.valueKey = coordinate;
        } else if (!samePage && node.valueKey && !targetCoordinates?.has(node.valueKey)) {
            // The author's own name for the value, shared by pages of one type.
        } else {
            delete node.valueKey;
        }
    };
    const renewKeyed = <T extends { id: string; valueKey?: string }>(
        node: T,
        prefix: DraftIdPrefix
    ) => {
        const before = node.valueKey ?? node.id;
        keepCoordinate(node);
        node.id = generateDraftId(prefix);
        const after = node.valueKey ?? node.id;
        if (after !== before) renamed.set(before, after);
    };
    const renew = (node: TemplateNode) => {
        if (isTemplateField(node) || node.type === 'table' || node.type === 'list') {
            renewKeyed(node as { id: string; valueKey?: string }, idPrefixFor(node));
        } else {
            node.id = generateDraftId(idPrefixFor(node));
        }
        if (node.type === 'select') {
            node.options = node.options.map((option) => ({
                ...option,
                id: generateDraftId('opt'),
            }));
        }
        if (node.type === 'list' && node.item) {
            const item = {
                ...node.item,
                ...(node.item.type === 'select'
                    ? {
                          options: node.item.options.map((option) => ({
                              ...option,
                              id: generateDraftId('opt'),
                          })),
                      }
                    : {}),
            } as ListItemField;
            renamed.set(item.id, (item.id = generateDraftId('f')));
            node.item = item;
        }
        if (node.type === 'table') {
            node.columns = node.columns.map((column) => {
                const renewed = { ...column, id: generateDraftId('f') };
                renamed.set(column.valueKey ?? column.id, renewed.id);
                delete renewed.valueKey;
                return renewed;
            });
        }
        if (isContainerNode(node)) node.children.forEach(renew);
    };
    renew(copy);
    remapCoordinates(copy, renamed);

    if (samePage) {
        const labelled = copy as TermCarrier & { title?: string; label?: string };
        const suffixed = (label: string) =>
            translate(uiMessages.sheet.templates.editor.copySuffix, { label });
        if (typeof labelled.title === 'string') labelled.title = suffixed(labelled.title);
        else if (typeof labelled.label === 'string') labelled.label = suffixed(labelled.label);
        keepTermOnRename(labelled);
    }
    return copy;
}

/** Inserts a copy of the node (fresh identities, see `cloneWithFreshIds`) right after it. */
export function duplicateNode(
    draft: EditorDraft,
    nodeId: string
): DraftOpResult & {
    copyId?: string;
} {
    const location = locate(draft, nodeId);
    if (!location) return fail('self-move');
    const copy = cloneWithFreshIds(draft, location.parent![location.index]!);
    const result = insertNode(draft, location.parentId, location.index + 1, copy);
    return result.ok ? { ...result, copyId: copy.id } : result;
}
