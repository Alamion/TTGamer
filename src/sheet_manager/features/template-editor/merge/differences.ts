import type { CustomTemplate } from '../../../types/template';
import { mergePages, type MergeResult } from './merge';

/** Without a recorded base every shipped difference is offered, but none is applied. */
export function differencesOf(shipped: CustomTemplate, copy: CustomTemplate): MergeResult {
    const result = mergePages(copy, shipped, copy);
    if ('error' in result) return result;
    return {
        draft: copy,
        items: result.items.map((item) => ({ ...item, origin: 'difference' })),
    };
}
