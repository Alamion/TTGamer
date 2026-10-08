import { compactId, randomToken } from '../../../../shared/utils/random';

export type DraftIdPrefix = 'tpl' | 'sec' | 'grp' | 'blk' | 'lst' | 'f' | 'opt';

/**
 * Kebab-safe identifier for a new draft node; the prefix guarantees a letter start. A template is
 * a library item that may move to the cloud, so it gets a whole UUIDv7; its elements only need to
 * be unique inside it.
 */
export function generateDraftId(prefix: DraftIdPrefix): string {
    return `${prefix}-${prefix === 'tpl' ? compactId() : randomToken(8)}`;
}
