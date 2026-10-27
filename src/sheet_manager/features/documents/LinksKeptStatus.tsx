import { useEffect } from 'react';

import { useLinksKeptMessage } from './linkKeeperRuntime';

/** How long the message about kept links stays. */
const SHOWN_MS = 6000;

/** Says, for a moment, how many links a rename or a move kept in other documents (spec 044). */
export function LinksKeptStatus() {
    const { message, at } = useLinksKeptMessage();
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => useLinksKeptMessage.setState({ message: null }), SHOWN_MS);
        return () => clearTimeout(timer);
    }, [message, at]);
    return (
        <p
            role="status"
            className={
                message
                    ? 'fixed bottom-4 left-1/2 z-50 m-0 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border border-border bg-bgSurface px-3 py-2 text-sm text-textPrimary shadow-lg'
                    : 'sr-only'
            }
        >
            {message ?? ''}
        </p>
    );
}
