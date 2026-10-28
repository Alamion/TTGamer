/**
 * The container for everything a portal draws. Tailwind utilities exist only under
 * `.tailwind-root`, which `#modal-root` (theme/Root) carries; `document.body` does not.
 */
export const modalRoot = (): HTMLElement | undefined =>
    typeof document === 'undefined'
        ? undefined
        : (document.getElementById('modal-root') ?? undefined);
