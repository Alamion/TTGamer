import { generateId } from '@site/src/shared/utils/random';
import { z } from 'zod';

/**
 * A file the importer rejected, kept whole so it can be repaired (spec 031). Entries kept before
 * records existed are raw values; `asRecoveryRecord` wraps them without touching the store.
 */
export const RecoveryRecordSchema = z.object({
    ttgRecovery: z.literal(1),
    id: z.string().min(1).max(128),
    content: z.unknown(),
    reason: z.string().max(2_000),
    at: z.string(),
});

export type RecoveryRecord = z.infer<typeof RecoveryRecordSchema>;

export function newRecoveryRecord(
    content: unknown,
    reason: string,
    id: string = generateId(),
    now: Date = new Date()
): RecoveryRecord {
    return { ttgRecovery: 1, id, content, reason: reason.slice(0, 2_000), at: now.toISOString() };
}

export function asRecoveryRecord(entry: unknown): RecoveryRecord {
    const parsed = RecoveryRecordSchema.safeParse(entry);
    return parsed.success ? parsed.data : newRecoveryRecord(entry, '', undefined, new Date(0));
}
