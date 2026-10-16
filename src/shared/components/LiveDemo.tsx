import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

const messages = uiMessages.shared.liveDemo;

/**
 * A frame for real interface shown on a documentation page: `live` parts act on the reader's
 * own data (the dice panel), `example` parts show a fixed document that nothing writes to, and
 * `sketch` parts are simple models of a control (the layout).
 */
export function LiveDemo({
    kind = 'live',
    className,
    children,
}: {
    kind?: 'live' | 'example' | 'sketch';
    className?: string;
    children: ReactNode;
}) {
    const text = messages[kind];
    return (
        <div className="tailwind-root">
            <figure
                className={clsx(
                    'mx-0 my-4 overflow-hidden rounded-lg border border-border bg-bgSurface',
                    className
                )}
            >
                <figcaption className="flex flex-wrap items-baseline gap-x-2 border-b border-border px-3 py-1.5 text-xs text-textSecondary">
                    <span
                        className={clsx(
                            'rounded-sm px-1.5 py-0.5 font-semibold uppercase tracking-wide',
                            kind === 'live'
                                ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                                : 'bg-primary/15 text-primary'
                        )}
                    >
                        {translate(text.label)}
                    </span>
                    <span>{translate(text.caption)}</span>
                </figcaption>
                <div>{children}</div>
            </figure>
        </div>
    );
}
