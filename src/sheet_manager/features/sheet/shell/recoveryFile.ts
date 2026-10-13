import { z } from 'zod';

import type { RecoveryRecord } from '../../../store/recoveryRecord';
import { asRecoveryRecord, RecoveryRecordSchema } from '../../../store/recoveryRecord';

/** The most records one file may carry; the store keeps no more than this. */
const MAX_RECORDS = 100;

const RecoveryFileSchema = z.object({
    ttgRecovery: z.literal(1),
    records: z.array(RecoveryRecordSchema).max(MAX_RECORDS),
});

/** `ttgamer_recovery_<date>.json` */
export function recoveryFileName(now: Date = new Date()): string {
    return `ttgamer_recovery_${now.toISOString().slice(0, 10)}.json`;
}

/** The kept files as one downloadable file; device portrait ids never leave the device. */
export function serializeRecoveryFile(entries: readonly unknown[], now: Date = new Date()): string {
    const records = entries.slice(0, MAX_RECORDS).map(asRecoveryRecord);
    return JSON.stringify(
        { ttgRecovery: 1, exportedAt: now.toISOString(), records },
        (key, value) => (key === 'portraitId' ? undefined : value),
        2
    );
}

/**
 * The records of a recovery file; `undefined` when `raw` is not one. A file that carries the mark
 * but is malformed throws, so the importer rejects it instead of reading it as something else.
 */
export function readRecoveryFile(raw: unknown): RecoveryRecord[] | undefined {
    if (typeof raw !== 'object' || raw === null || !('ttgRecovery' in raw)) return undefined;
    return RecoveryFileSchema.parse(raw).records;
}
