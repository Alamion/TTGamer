/** Minimal router hooks for components that sync state to the URL (no navigation in tests). */
const location = { pathname: '/', search: '', hash: '', state: undefined };

export function useLocation() {
    return location;
}

export function useHistory() {
    return { location, replace: () => undefined, push: () => undefined };
}
