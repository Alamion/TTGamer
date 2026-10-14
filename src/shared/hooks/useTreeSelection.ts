import { useCallback, useRef, useState } from 'react';

import type { SelectExtend } from '../components/tree/TreeRowShell';

/**
 * The focused row and the selected rows of a tree: a plain click or arrow selects one row, Ctrl or
 * Cmd toggles a row, Shift selects the range from the row last selected plainly (or toggled).
 * `visibleKeys` is the rows in display order.
 */
export function useTreeSelection(visibleKeys: readonly string[]) {
    const [focused, setFocused] = useState<string | undefined>(undefined);
    const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
    const anchor = useRef<string | undefined>(undefined);

    const select = useCallback(
        (key: string, extend: SelectExtend) => {
            setFocused(key);
            if (extend === 'toggle') {
                setSelection((current) => {
                    const next = new Set(current);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                });
                anchor.current = key;
            } else if (extend === 'range') {
                const to = visibleKeys.indexOf(key);
                const from = visibleKeys.indexOf(anchor.current ?? key);
                if (to < 0 || from < 0) {
                    setSelection(new Set([key]));
                    anchor.current = key;
                    return;
                }
                const [start, end] = [Math.min(from, to), Math.max(from, to)];
                setSelection(new Set(visibleKeys.slice(start, end + 1)));
            } else {
                setSelection(new Set([key]));
                anchor.current = key;
            }
        },
        [visibleKeys]
    );

    /** Replaces the selection (after a delete, or to show one row). */
    const reset = useCallback((keys: readonly string[] = [], focus?: string) => {
        setSelection(new Set(keys));
        setFocused(focus ?? keys[0]);
        anchor.current = focus ?? keys[0];
    }, []);

    return { focused, selection, select, reset };
}
