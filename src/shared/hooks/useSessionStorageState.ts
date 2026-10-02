import { useCallback, useEffect, useState } from 'react';

type SetStateAction<T> = T | ((prevState: T) => T);

const values = new Map<string, unknown>();
const listeners = new Map<string, Set<(value: unknown) => void>>();

function readValue<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const stored = sessionStorage.getItem(key);
        if (stored !== null) {
            return JSON.parse(stored) as T;
        }
    } catch {
        // Ignore parse errors
    }
    return defaultValue;
}

function writeValue(key: string, value: unknown): void {
    values.set(key, value);
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage errors
    }
    const set = listeners.get(key);
    if (set) {
        set.forEach((listener) => listener(value));
    }
}

function currentValue<T>(key: string, defaultValue: T): T {
    if (values.has(key)) return values.get(key) as T;
    const value = readValue(key, defaultValue);
    values.set(key, value);
    return value;
}

/** Session-scoped state shared by every user of `key`; a new `key` reads that key's value. */
export function useSessionStorageState<T>(
    key: string,
    defaultValue: T
): [T, (value: SetStateAction<T>) => void] {
    const [state, setState] = useState(() => ({ key, value: currentValue(key, defaultValue) }));
    const value = state.key === key ? state.value : currentValue(key, defaultValue);
    if (state.key !== key) setState({ key, value });

    useEffect(() => {
        const listener = (next: unknown) => setState({ key, value: next as T });
        const set = listeners.get(key) ?? new Set();
        set.add(listener);
        listeners.set(key, set);
        return () => {
            set.delete(listener);
            if (set.size === 0) listeners.delete(key);
        };
    }, [key]);

    const setValue = useCallback(
        (action: SetStateAction<T>) => {
            const prev = currentValue(key, defaultValue);
            const next =
                typeof action === 'function' ? (action as (prevState: T) => T)(prev) : action;
            writeValue(key, next);
        },
        [key, defaultValue]
    );

    return [value, setValue];
}
