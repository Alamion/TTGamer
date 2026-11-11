import type { TraitPoolFlags } from '../../types';

/** Classic specialties reroll tens only at four dots; conversion-only flags have no effect. */
export function wod2eTraitPool(value: number, flags: TraitPoolFlags): string | undefined {
    if (value <= 0) return undefined;
    return `${value}d10${value >= 4 && flags.specialization ? '!' : ''}>=6f=1`;
}
