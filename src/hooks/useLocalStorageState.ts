import { useState, useCallback, useMemo } from 'react';

type SetStateAction<T> = T | ((prevState: T) => T);

export function useLocalStorageState<T>(
    key: string,
    defaultValue: T
): [T, (value: SetStateAction<T>) => void] {
    const [state, setState] = useState<T>(() => {
        try {
            const stored = localStorage.getItem(key);
            if (stored !== null) {
                return JSON.parse(stored) as T;
            }
        } catch {
            // Ignore parse errors
        }
        return defaultValue;
    });

    const setValue = useCallback(
        (value: SetStateAction<T>) => {
            setState((prev) => {
                const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
                try {
                    localStorage.setItem(key, JSON.stringify(next));
                } catch {
                    // Ignore storage errors
                }
                return next;
            });
        },
        [key]
    );

    return [state, setValue];
}

export function useExpandedState(
    sectionKey: string,
    defaultExpanded = true
): [boolean, () => void] {
    const key = useMemo(() => `expanded_${sectionKey}`, [sectionKey]);
    const [isExpanded, setIsExpanded] = useLocalStorageState(key, defaultExpanded);

    const toggle = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, [setIsExpanded]);

    return [isExpanded, toggle];
}
