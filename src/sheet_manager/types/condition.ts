import { z } from 'zod';

export const ConditionMarkSchema = z.enum(['empty', 'slash', 'cross']);
export type ConditionMark = z.infer<typeof ConditionMarkSchema>;
