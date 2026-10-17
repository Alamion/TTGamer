import { resolveWritableBinding } from '../../../systems/templateBindings';
import {
    type CustomTemplate,
    fieldValueKey,
    isTemplateField,
    type TemplateField,
    walkTemplateNodes,
} from '../../../types/template';
import type { CoordinateWrite, FormulaRun } from './hooks';

/** A value a button may change: its bounds and how a new number is written. */
export interface ButtonTarget {
    bounds: { min: number; max: number };
    /** The number a field nobody filled in yet starts from. */
    initial: number;
    write(next: number, read: (coordinate: string) => number | undefined): CoordinateWrite;
}

const UNBOUNDED = { min: -1_000_000, max: 1_000_000 };

function templateField(template: CustomTemplate, key: string): TemplateField | undefined {
    let found: TemplateField | undefined;
    walkTemplateNodes(template.children, (node) => {
        if (!found && isTemplateField(node) && fieldValueKey(node) === key) found = node;
    });
    return found;
}

/** Pools store both parts: writing one keeps the other (and current never above max). */
function poolWrite(base: string, part: 'current' | 'max') {
    return (next: number, read: (coordinate: string) => number | undefined): CoordinateWrite => {
        const current = part === 'current' ? next : (read(`${base}.current`) ?? 0);
        const max = part === 'max' ? next : (read(`${base}.max`) ?? next);
        return { target: base, value: { current: Math.min(current, max), max } };
    };
}

/**
 * What a button change can target (spec 038 D6): the template's numbers, ratings, and resource
 * parts, and the game's traits, resources, and number fields. `undefined` for anything else.
 */
export function buttonTarget(
    template: CustomTemplate,
    target: string,
    read: (coordinate: string) => number | undefined
): ButtonTarget | undefined {
    const [base = '', part] = target.split('.') as [string, ('current' | 'max')?];
    const plain = (next: number): CoordinateWrite => ({ target: base, value: next });
    const field = templateField(template, base);
    if (field) {
        if (field.type === 'number' && !part) {
            return {
                bounds: { min: field.min ?? UNBOUNDED.min, max: field.max ?? UNBOUNDED.max },
                initial: Math.max(0, field.min ?? 0),
                write: plain,
            };
        }
        if (field.type === 'rating' && !part) {
            return { bounds: { min: field.min, max: field.max }, initial: field.min, write: plain };
        }
        if (field.type === 'resource' && part) {
            const max = part === 'current' ? (read(`${base}.max`) ?? field.max) : field.max;
            return {
                bounds: { min: part === 'max' ? field.min : 0, max },
                initial: 0,
                write: poolWrite(base, part),
            };
        }
        return undefined;
    }
    const binding = resolveWritableBinding(template.systemId, template.documentKind, base);
    if (binding?.kind === 'trait' && !part) {
        return {
            bounds: { min: binding.minimum, max: binding.maximum },
            initial: binding.minimum,
            write: plain,
        };
    }
    if (binding?.kind === 'resource') {
        if (binding.mode !== 'pool') {
            return part
                ? undefined
                : { bounds: { min: 0, max: binding.maximum }, initial: 0, write: plain };
        }
        const side = part ?? 'current';
        const max = side === 'current' ? (read(`${base}.max`) ?? binding.maximum) : binding.maximum;
        return { bounds: { min: 0, max }, initial: 0, write: poolWrite(base, side) };
    }
    if (binding?.kind === 'field' && binding.valueType === 'number' && !part) {
        return { bounds: binding.range ?? UNBOUNDED, initial: 0, write: plain };
    }
    return undefined;
}

/** A coordinate's number through the page's formulas; `undefined` when it has none. */
export function readNumber(evaluate: (source: string) => FormulaRun, coordinate: string) {
    const result = evaluate(coordinate);
    return result.ok && typeof result.value === 'number' ? result.value : undefined;
}
