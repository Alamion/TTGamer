import { generateId } from '../../../../shared/utils/random';

export type DraftIdPrefix = 'tpl' | 'sec' | 'grp' | 'blk' | 'lst' | 'f' | 'opt';

/** Kebab-safe identifier for a new draft node; the prefix guarantees a letter start. */
export function generateDraftId(prefix: DraftIdPrefix): string {
    const token =
        generateId()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 8) || 'node';
    return `${prefix}-${token}`;
}
