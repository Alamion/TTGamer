import { traitRowKind } from '../../src/sheet_manager/features/sheet/declarative/rowKind';
import { systemRegistry } from '../../src/sheet_manager/systems/index';
import type { TraitRowKind } from './types.ts';

interface TraitBindingLike {
    key: string;
    kind: string;
    coordinate?: string;
    row?: { specialization?: boolean };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/**
 * Glossary ref → row kinds where the shipped default templates display it: primitive trait
 * nodes (by binding key) and dots rating fields bridged to a trait (by value key).
 */
export function shippedTemplateRowKinds(): Map<string, Set<TraitRowKind>> {
    const kinds = new Map<string, Set<TraitRowKind>>();
    const add = (ref: unknown, kind: TraitRowKind) => {
        if (typeof ref !== 'string') return;
        if (!kinds.has(ref)) kinds.set(ref, new Set());
        kinds.get(ref)!.add(kind);
    };
    for (const system of systemRegistry.getSystems()) {
        const traits = (system.templateBindings ?? []).filter(
            (binding) => binding.kind === 'trait'
        ) as unknown as TraitBindingLike[];
        const walk = (value: unknown) => {
            if (Array.isArray(value)) {
                value.forEach(walk);
                return;
            }
            if (!isRecord(value)) return;
            const ref = value.termRef ?? value.labelMessage;
            if (value.type === 'primitive' && typeof value.bindingKey === 'string') {
                const binding = traits.find((trait) => trait.key === value.bindingKey);
                if (binding) add(ref, traitRowKind(value.compact as boolean, binding));
            } else if (value.type === 'rating' && typeof value.valueKey === 'string') {
                const binding = traits.find((trait) => trait.coordinate === value.valueKey);
                if (binding) add(ref, traitRowKind(value.compact as boolean, binding));
            }
            Object.values(value).forEach(walk);
        };
        walk(system.defaultTemplates ?? []);
    }
    return kinds;
}
