import { useSitePath } from '@site/src/shared/hooks/useSitePath';
import { parseDocsLink } from '@site/src/shared/utils/docsLink';
import { clsx } from 'clsx';
import { HelpCircle } from 'lucide-react';
import type { MouseEvent } from 'react';

/**
 * The "?" help link of a titled block, an editor setting, or a settings field. Site docs open in the reader's
 * locale; an external page opens in a new tab. A value that is not a documentation link renders
 * nothing (templates report it through their reference checks). `onPlainClick` takes a plain click
 * on a site link instead (the docs card, spec 045); other clicks still open the page.
 */
export function DocsHelpLink({
    className,
    docsPath,
    label,
    size = 'md',
    onPlainClick,
    expanded,
}: {
    docsPath: string;
    /** Accessible name, e.g. "Documentation: Attributes". */
    label: string;
    className?: string;
    size?: 'sm' | 'md';
    onPlainClick?: (href: string) => void;
    /** Whether what a plain click opens is open. */
    expanded?: boolean;
}) {
    const sitePath = useSitePath();
    const link = parseDocsLink(docsPath);
    if (!link) return null;
    const href = link.kind === 'site' ? sitePath(link.path) : link.url;
    const takesClick = onPlainClick && link.kind === 'site';
    const onClick = (event: MouseEvent) => {
        event.stopPropagation();
        const plain =
            event.button === 0 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.shiftKey &&
            !event.altKey;
        if (!takesClick || !plain) return;
        event.preventDefault();
        onPlainClick(href);
    };
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            aria-label={label}
            aria-haspopup={takesClick ? 'dialog' : undefined}
            aria-expanded={takesClick ? expanded : undefined}
            title={label}
            className={clsx(
                'inline-flex shrink-0 text-textSecondary transition-colors hover:text-textPrimary',
                className
            )}
        >
            <HelpCircle className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
        </a>
    );
}
