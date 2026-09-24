import type { TraitPoolFlags } from '../types';

/**
 * Classic WoD stat pool (the Star Wars conversion): successes on 6+, ones subtract unless the
 * character is experienced, and a specialty makes 10s explode.
 */
export function classicWodTraitPool(value: number, flags: TraitPoolFlags): string | undefined {
    if (value <= 0) return undefined;
    let notation = `${value}d10>=6`;
    if (!flags.experienced) notation += 'f=1';
    if (flags.specialization) notation += '!';
    return notation;
}
