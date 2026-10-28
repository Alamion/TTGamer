import { translate } from '@docusaurus/Translate';
import * as Popover from '@radix-ui/react-popover';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import MDXContent from '@theme/MDXContent';
import {
    Children,
    type ComponentProps,
    createContext,
    createElement,
    isValidElement,
    type ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';

import { modalRoot } from '../utils/modalRoot';
import { type DocsPageModule, fragmentRange, loadDocsPage, reportFragment } from './docsFragments';
import { DocsHelpLink } from './DocsHelpLink';

const messages = uiMessages.shared.docsFragment.card;

const LEVELS = [1, 2, 3, 4, 5, 6] as const;

/** Headings without the page's "#" links: in a card they would move the sheet, not the page. */
const HEADINGS = Object.fromEntries(
    LEVELS.map((level) => [
        `h${String(level)}`,
        (props: ComponentProps<'h1'>) => createElement(`h${String(level)}`, props),
    ])
);
const LEVEL_OF = new Map<unknown, number>(
    LEVELS.map((level) => [HEADINGS[`h${String(level)}`], level])
);

/** A link inside a fragment opens in a new tab, so the sheet stays. */
function FragmentLink({ children, ...props }: ComponentProps<'a'>) {
    return (
        <a {...props} target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    );
}

const FragmentContext = createContext<{ path: string; anchor?: string }>({ path: '' });

/**
 * The page's top-level blocks cut to the fragment (spec 045, D2). MDX hands its wrapper one element
 * that draws the page; drawing it here gives the blocks themselves, so only the fragment's
 * components ever run.
 */
function FragmentWrapper({ children }: { children?: ReactNode }) {
    const { path, anchor } = useContext(FragmentContext);
    const page =
        isValidElement(children) && typeof children.type === 'function'
            ? (children.type as (props: unknown) => ReactNode)(children.props)
            : children;
    const blocks = Children.toArray(
        isValidElement<{ children?: ReactNode }>(page) ? page.props.children : page
    );
    const { start, end, found } = fragmentRange(
        blocks.map((block) =>
            isValidElement<{ id?: string }>(block)
                ? { level: LEVEL_OF.get(block.type), id: block.props.id }
                : {}
        ),
        anchor
    );
    useEffect(() => {
        if (!found) reportFragment('missing', `${path}#${anchor ?? ''}`);
    }, [found, path, anchor]);
    return (
        <>
            {!found && (
                <p role="note" className="text-sm text-textSecondary">
                    {translate(messages.notFound)}
                </p>
            )}
            {blocks.slice(start, end)}
        </>
    );
}

const COMPONENTS = { ...HEADINGS, a: FragmentLink, wrapper: FragmentWrapper };

type Loading = { path: string; page?: DocsPageModule; failed?: boolean };

/** Loads the page and draws the fragment, or says why it cannot. */
function FragmentContent({ path, anchor }: { path: string; anchor?: string }) {
    const [loading, setLoading] = useState<Loading>({ path });
    useEffect(() => {
        let live = true;
        const done = (page: DocsPageModule | undefined) => {
            if (!live) return;
            if (!page) reportFragment('unavailable', path);
            setLoading(page ? { path, page } : { path, failed: true });
        };
        loadDocsPage(path).then(done, () => done(undefined));
        return () => {
            live = false;
        };
    }, [path]);
    const current = loading.path === path ? loading : { path };
    if (current.failed) {
        return <p className="m-0 text-sm text-textSecondary">{translate(messages.unavailable)}</p>;
    }
    if (!current.page) {
        return (
            <p role="status" className="m-0 text-sm text-textSecondary">
                {translate(messages.loading)}
            </p>
        );
    }
    const Content = current.page.default;
    return (
        <FragmentContext.Provider value={{ path, anchor }}>
            <div className="markdown text-sm">
                <MDXContent>
                    <Content components={COMPONENTS} />
                </MDXContent>
            </div>
        </FragmentContext.Provider>
    );
}

/**
 * A "?" whose plain click shows its part of the page in a card (spec 045, US1): the reader's
 * language, the way to the whole page, open until Esc or a click outside. Kept apart from
 * `DocsHelpLink` so pages that only link (the navbar's dice settings) do not load the card.
 */
export function DocsPreviewLink({
    docsPath,
    label,
    title,
}: {
    docsPath: string;
    label: string;
    /** What the link is about, named in the card's label. */
    title: string;
}) {
    const [href, setHref] = useState<string>();
    const open = href !== undefined;
    const link = (
        <DocsHelpLink
            docsPath={docsPath}
            label={label}
            expanded={open}
            onPlainClick={(next) => setHref(open ? undefined : next)}
        />
    );
    const [path = '', anchor] = (href ?? '').split('#');
    return (
        <Popover.Root open={open} onOpenChange={(next) => !next && setHref(undefined)}>
            <Popover.Anchor asChild>
                <span className="inline-flex">{link}</span>
            </Popover.Anchor>
            <Popover.Portal container={modalRoot()}>
                <Popover.Content
                    data-docs-card=""
                    aria-label={translate(messages.label, { title })}
                    side="bottom"
                    align="end"
                    sideOffset={4}
                    collisionPadding={8}
                    onOpenAutoFocus={(event) => event.preventDefault()}
                    className="z-[1000] flex max-h-[min(480px,var(--radix-popover-content-available-height))] w-[420px] max-w-[calc(100vw-1rem)] flex-col rounded-md border border-border bg-bgSurface shadow-lg"
                >
                    <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-3">
                        {open && <FragmentContent path={path} anchor={anchor || undefined} />}
                    </div>
                    <div className="flex justify-end border-t border-border p-2">
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                        >
                            {translate(messages.openPage)}
                        </a>
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
