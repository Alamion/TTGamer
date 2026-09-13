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

export function useSessionStorageState<T>(
    key: string,
    defaultValue: T
): [T, (value: SetStateAction<T>) => void] {
    const [state, setState] = useState<T>(() => {
        if (values.has(key)) return values.get(key) as T;
        const value = readValue(key, defaultValue);
        values.set(key, value);
        return value;
    });

    useEffect(() => {
        const listener = (value: unknown) => setState(value as T);
        const set = listeners.get(key) ?? new Set();
        set.add(listener);
        listeners.set(key, set);
        return () => {
            set.delete(listener);
            if (set.size === 0) listeners.delete(key);
        };
    }, [key, setState]);

    const setValue = useCallback(
        (value: SetStateAction<T>) => {
            setState((prev) => {
                const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
                writeValue(key, next);
                return next;
            });
        },
        [key]
    );

    return [state, setValue];
}
