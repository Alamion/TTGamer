import { warn } from '@site/src/shared/utils/logging';
import { useEffect } from 'react';

/**
 * Connects the dice roller to the game systems' dice readings. The system registry (and its
 * catalogs) loads on demand so it never joins the bundle every page downloads; rolls made
 * before it arrives are simply unread.
 */
export default function RollReadingRegistration(): null {
    useEffect(() => {
        let cancelled = false;
        let unregister: (() => void) | undefined;
        import('./registerSystemsReader')
            .then(({ registerSystemsReader }) => {
                if (!cancelled) unregister = registerSystemsReader();
            })
            .catch((err: unknown) => {
                warn('Game-system dice readings could not be loaded', 'Roll reading', [err]);
            });
        return () => {
            cancelled = true;
            unregister?.();
        };
    }, []);
    return null;
}
