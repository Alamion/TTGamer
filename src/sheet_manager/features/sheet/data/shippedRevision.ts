import { systemRegistry } from '../../../systems/index';
import { resolveEffectiveTemplate } from '../../../systems/view';
import type { CustomTemplate } from '../../../types/template';
import { revisionOf } from './revision';

export { revisionOf } from './revision';

export interface OverrideBaseRecord {
    base?: CustomTemplate;
    revision?: string;
    dismissed?: string;
}

export function shippedPageFor(systemId: string, viewId: string): CustomTemplate | undefined {
    for (const definition of systemRegistry.getSystem(systemId)?.documents ?? []) {
        const resolved = resolveEffectiveTemplate(
            viewId,
            { templates: [], defaultOverrides: {} },
            systemId,
            definition.kind
        );
        if (resolved) return resolved.template;
    }
    return undefined;
}

type PendingUpdate = 'none' | 'base-equal' | 'base-differs' | 'no-base-differs' | 'dismissed';

export function pendingUpdate({
    shipped,
    copy,
    record,
}: {
    shipped: CustomTemplate | undefined;
    copy: CustomTemplate | undefined;
    record: OverrideBaseRecord | undefined;
}): PendingUpdate {
    if (!shipped || !copy) return 'none';
    const revision = revisionOf(shipped);
    if (record?.dismissed === revision) return 'dismissed';
    if (record?.base) return record.revision === revision ? 'base-equal' : 'base-differs';
    return revisionOf(copy) === revision ? 'none' : 'no-base-differs';
}
