import { useMemo } from 'react';

import { overrideKey, useTemplateStore } from '../../../store/templateStore';
import { pendingUpdate, shippedPageFor } from './shippedRevision';

export function usePendingUpdate(systemId: string, viewId: string) {
    const key = overrideKey(systemId, viewId);
    const copy = useTemplateStore((state) => state.defaultOverrides[key]);
    const record = useTemplateStore((state) => state.overrideBases[key]);
    const shipped = useMemo(() => shippedPageFor(systemId, viewId), [systemId, viewId]);
    return { state: pendingUpdate({ shipped, copy, record }), shipped, copy, record };
}
