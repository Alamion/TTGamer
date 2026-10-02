import { useSitePath } from '@site/src/shared/hooks/useSitePath';
import { parseDocsLink } from '@site/src/shared/utils/docsLink';
import { clsx } from 'clsx';
import { HelpCircle } from 'lucide-react';

/**
 * The "?" help link of a titled block, an editor setting, or a settings field. Site docs open in the reader's
 * locale; an external page opens in a new tab. A value that is not a documentation link renders
 * nothing (templates report it through their reference checks).
 */
export function DocsHelpLink({
    className,
    docsPath,
    label,
    size = 'md',
}: {
    docsPath: string;
    /** Accessible name, e.g. "Documentation: Attributes". */
    label: string;
    className?: string;
    size?: 'sm' | 'md';
}) {
    const sitePath = useSitePath();
    const link = parseDocsLink(docsPath);
    if (!link) return null;
    return (
        <a
            href={link.kind === 'site' ? sitePath(link.path) : link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            aria-label={label}
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
