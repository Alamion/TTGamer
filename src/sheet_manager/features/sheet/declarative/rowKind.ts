/**
 * How a trait row is laid out; shared by the renderer (`PrimitiveTraitBody`) and the
 * translation verifier's label overflow budgets, so both agree on which rows are narrow.
 */
export type TraitRowKind = 'compact' | 'trait' | 'traitWithSpecialty';

export function traitRowKind(
    compact: boolean | undefined,
    binding: { row?: { specialization?: boolean } }
): TraitRowKind {
    if (compact) return 'compact';
    return (binding.row?.specialization ?? true) ? 'traitWithSpecialty' : 'trait';
}
