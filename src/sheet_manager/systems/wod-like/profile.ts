import { z } from 'zod';

const identifierSchema = z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z][a-z0-9-]*$/);
const labelSchema = z.string().min(1).max(120);

export const WodTraitDefinitionSchema = z
    .object({
        id: identifierSchema,
        key: z.string().min(1).max(120),
        label: labelSchema,
        minimum: z.number().int().min(0).max(20).default(0),
        maximum: z.number().int().min(1).max(20).default(5),
        catalog: z.string().min(1).max(80).optional(),
    })
    .refine(({ maximum, minimum }) => minimum <= maximum, {
        message: 'Trait minimum cannot exceed maximum',
    });

export const WodTraitGroupSchema = z.object({
    id: identifierSchema,
    label: labelSchema,
    role: z.enum(['attribute', 'ability', 'advantage', 'virtue', 'special']),
    traits: z.array(WodTraitDefinitionSchema).min(1).max(40),
});

export const WodResourceDefinitionSchema = z
    .object({
        id: identifierSchema,
        label: labelSchema,
        mode: z.enum(['rating', 'pool']),
        minimum: z.number().int().min(0).max(20).default(0),
        maximum: z.number().int().min(1).max(20),
    })
    .refine(({ maximum, minimum }) => minimum <= maximum, {
        message: 'Resource minimum cannot exceed maximum',
    });

export const WodConditionLevelSchema = z.object({
    id: identifierSchema,
    label: labelSchema,
    penalty: z.number().int().min(-20).max(20).nullable().default(null),
});

export const WodConditionTrackSchema = z.object({
    id: identifierSchema,
    label: labelSchema,
    levels: z.array(WodConditionLevelSchema).min(1).max(20),
});

function uniqueIds<T extends { id: string }>(values: T[]) {
    return new Set(values.map(({ id }) => id)).size === values.length;
}

export const WodSheetProfileSchema = z
    .object({
        id: identifierSchema,
        label: labelSchema,
        traitGroups: z.array(WodTraitGroupSchema).min(1).max(30),
        resources: z.array(WodResourceDefinitionSchema).max(20).default([]),
        conditionTracks: z.array(WodConditionTrackSchema).max(10).default([]),
    })
    .superRefine(({ conditionTracks, resources, traitGroups }, context) => {
        if (!uniqueIds(traitGroups)) {
            context.addIssue({ code: 'custom', message: 'Duplicate trait group ID' });
        }
        if (!uniqueIds(resources)) {
            context.addIssue({ code: 'custom', message: 'Duplicate resource ID' });
        }
        if (!uniqueIds(conditionTracks)) {
            context.addIssue({ code: 'custom', message: 'Duplicate condition track ID' });
        }
        traitGroups.forEach((group, index) => {
            if (!uniqueIds(group.traits)) {
                context.addIssue({
                    code: 'custom',
                    message: `Duplicate trait ID in group ${group.id}`,
                    path: ['traitGroups', index, 'traits'],
                });
            }
        });
    });

export type WodTraitDefinition = z.infer<typeof WodTraitDefinitionSchema>;
export type WodTraitGroup = z.infer<typeof WodTraitGroupSchema>;
export type WodResourceDefinition = z.infer<typeof WodResourceDefinitionSchema>;
export type WodConditionTrack = z.infer<typeof WodConditionTrackSchema>;
export type WodSheetProfile = z.infer<typeof WodSheetProfileSchema>;

export function defineWodSheetProfile(input: z.input<typeof WodSheetProfileSchema>) {
    return WodSheetProfileSchema.parse(input);
}

export function createWodSheetProfileVariant(
    base: WodSheetProfile,
    overrides: Partial<
        Pick<WodSheetProfile, 'label' | 'traitGroups' | 'resources' | 'conditionTracks'>
    > & {
        id: string;
    }
) {
    return WodSheetProfileSchema.parse({ ...base, ...overrides });
}

export function getWodTraitGroup(profile: WodSheetProfile, id: string) {
    const group = profile.traitGroups.find((candidate) => candidate.id === id);
    if (!group) throw new Error(`Unknown WoD trait group: ${profile.id}/${id}`);
    return group;
}
