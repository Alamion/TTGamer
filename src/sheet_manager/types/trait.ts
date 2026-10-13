import { z } from 'zod';

const dotValueSchema = z.number().int().min(0).max(5);

export const CustomSkillSchema = z.object({
    id: z.string(),
    label: z.string(),
    value: dotValueSchema,
    specialization: z.boolean().optional(),
    experienced: z.boolean().optional(),
    practiced: z.boolean().optional(),
});

export const BackgroundSchema = z.object({
    id: z.string(),
    label: z.string(),
    value: dotValueSchema,
    catalogId: z.string().optional(),
});

export const MeritFlawSchema = z.object({
    id: z.string(),
    points: z.number().int().min(1).max(5),
    label: z.string(),
    catalogId: z.string().optional(),
});

export type CustomSkill = z.infer<typeof CustomSkillSchema>;
export type MeritFlawItem = z.infer<typeof MeritFlawSchema>;

export const TraitModifierSchema = z.object({
    specialization: z.boolean().optional(),
    experienced: z.boolean().optional(),
    practiced: z.boolean().optional(),
});

export const TraitValueSchema = z.object({
    value: dotValueSchema,
    specializationText: z.string().optional(),
    ...TraitModifierSchema.shape,
});

export type TraitValue = z.infer<typeof TraitValueSchema>;

export const DEFAULT_ATTRIBUTE_VALUE: TraitValue = {
    value: 1,
    specialization: false,
    experienced: false,
    practiced: false,
};

export const DEFAULT_SKILL_VALUE: TraitValue = {
    ...DEFAULT_ATTRIBUTE_VALUE,
    value: 0,
};
