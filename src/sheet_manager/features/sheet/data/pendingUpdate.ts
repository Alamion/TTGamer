import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { create } from 'zustand';

import { overrideKey, useTemplateStore } from '../../../store/templateStore';
import type { CustomTemplate } from '../../../types/template';
import { differencesOf } from '../../template-editor/merge/differences';
import { equal } from '../../template-editor/merge/flatten';
import { mergePages } from '../../template-editor/merge/merge';
import type { TemplateEditorDialogProps } from '../../template-editor/TemplateEditorDialog';
import type { OverrideBaseRecord } from './shippedRevision';
import { pendingUpdate, revisionOf, shippedPageFor } from './shippedRevision';

// Session presence is transient; it never belongs in the persisted template store.
const useEditingPages = create<Record<string, number>>(() => ({}));

export function usePageEditorSession(systemId: string, viewId: string) {
    const key = overrideKey(systemId, viewId);
    useLayoutEffect(() => {
        useEditingPages.setState((state) => ({ [key]: (state[key] ?? 0) + 1 }));
        return () => {
            useEditingPages.setState((state) => {
                const next = { ...state };
                if (next[key]! > 1) next[key]!--;
                else delete next[key];
                return next;
            }, true);
        };
    }, [key]);
}

interface PendingPageUpdate {
    state: ReturnType<typeof pendingUpdate>;
    copy: CustomTemplate | undefined;
    shipped: CustomTemplate | undefined;
    record: OverrideBaseRecord | undefined;
}

export function usePendingUpdate(systemId: string, viewId: string): PendingPageUpdate {
    const key = overrideKey(systemId, viewId);
    const copy = useTemplateStore((state) => state.defaultOverrides[key]);
    const record = useTemplateStore((state) => state.overrideBases[key]);
    const shipped = useMemo(() => shippedPageFor(systemId, viewId), [systemId, viewId]);
    return { state: pendingUpdate({ shipped, copy, record }), shipped, copy, record };
}

export function reviewBaseFor(
    pending: ReturnType<typeof usePendingUpdate>
): Extract<TemplateEditorDialogProps['base'], { kind: 'review' }> | undefined {
    const { copy, shipped, record } = pending;
    if (!copy || !shipped) return undefined;
    const review = { kind: 'review' as const, copy, shipped };
    return record?.base
        ? { ...review, mode: 'merge', baseline: record.base }
        : { ...review, mode: 'differences' };
}

/** Returns whether the pending page needs no review, and records its base after rendering. */
export function useSilentAdvance(systemId: string, viewId: string): boolean {
    const { state, copy, shipped, record } = usePendingUpdate(systemId, viewId);
    const key = overrideKey(systemId, viewId);
    const editing = useEditingPages((state) => (state[key] ?? 0) > 0);
    const advanced = useRef<string | undefined>(undefined);
    const silent = useMemo(() => {
        if (!copy || !shipped) return false;
        if (state === 'base-differs' && record?.base) {
            const result = mergePages(record.base, shipped, copy);
            return !('error' in result) && equal(result.draft, copy);
        }
        if (state === 'no-base-differs') {
            const result = differencesOf(shipped, copy);
            return !('error' in result) && result.items.length === 0;
        }
        return state === 'none' && !record?.base && revisionOf(copy) === revisionOf(shipped);
    }, [state, copy, shipped, record]);

    useEffect(() => {
        if (!silent || editing || !copy || !shipped) return;
        // Recheck live presence: another pane may already have advanced this page in its effect.
        const current = useTemplateStore.getState();
        if (current.defaultOverrides[key] !== copy || useEditingPages.getState()[key]) return;
        const revision = revisionOf(shipped);
        const token = `${key}:${revision}`;
        if (advanced.current === token || current.overrideBases[key]?.revision === revision) return;
        advanced.current = token;
        current.setDefaultOverride(copy, { base: shipped });
    }, [silent, editing, copy, shipped, key]);
    return silent;
}
