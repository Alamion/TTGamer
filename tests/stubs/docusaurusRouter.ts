/** Minimal router hooks for components that sync state to the URL (no navigation in tests). */
export function useLocation() {
    return { pathname: '/', search: '', hash: '', state: undefined };
}

export function useHistory() {
    return { replace: () => undefined, push: () => undefined };
}
