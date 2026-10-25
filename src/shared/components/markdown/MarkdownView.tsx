import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { ChevronRight } from 'lucide-react';
import {
    createContext,
    memo,
    type ReactNode,
    useContext,
    useEffect,
    useId,
    useMemo,
    useState,
} from 'react';

import { parseMarkdown } from '../../markdown/parse';
import type {
    MarkdownBlock,
    MarkdownInline,
    MarkdownListBlock,
    MarkdownTopBlock,
} from '../../markdown/types';

const messages = uiMessages.shared.markdown.view;

/** Degradations a caller may report (constitution III): the view itself only renders. */
export type MarkdownIssue =
    { code: 'unknown-callout'; kind: string } | { code: 'insecure-image'; src: string };

export interface MarkdownViewProps {
    source: string;
    /** Replaces an inline code span (a roll control); `undefined` keeps the plain code. */
    renderCode?: (code: string) => ReactNode;
    /** The URL of an `![[name]]` embed; `undefined` shows the embed as inert text. */
    resolveEmbed?: (name: string) => string | undefined;
    /** Ticks a task's checkbox on its source line; without it checkboxes are read-only. */
    onToggleTask?: (line: number) => void;
    onIssue?: (issue: MarkdownIssue) => void;
    /** Added to heading levels, so `#` sits under the page's own heading (default 1: `#` → h2). */
    headingOffset?: number;
    className?: string;
}

interface Slots {
    renderCode?: (code: string) => ReactNode;
    resolveEmbed?: (name: string) => string | undefined;
    onToggleTask?: (line: number) => void;
    headingOffset: number;
}

const SlotsContext = createContext<Slots>({ headingOffset: 1 });

/** Callout types and the palette token they take (design D1); others are neutral. */
const CALLOUT_TONES: Readonly<Record<string, 'info' | 'success' | 'warning' | 'error'>> = {
    note: 'info',
    info: 'info',
    abstract: 'info',
    summary: 'info',
    tldr: 'info',
    todo: 'info',
    question: 'info',
    help: 'info',
    faq: 'info',
    tip: 'success',
    hint: 'success',
    important: 'success',
    success: 'success',
    check: 'success',
    done: 'success',
    warning: 'warning',
    caution: 'warning',
    attention: 'warning',
    spoiler: 'warning',
    failure: 'error',
    fail: 'error',
    missing: 'error',
    danger: 'error',
    error: 'error',
    bug: 'error',
};
const NEUTRAL_CALLOUTS = new Set(['example', 'quote', 'cite']);

const TONE_CLASSES = {
    info: 'border-info bg-info/10',
    success: 'border-success bg-success/10',
    warning: 'border-warning bg-warning/10',
    error: 'border-error bg-error/10',
    neutral: 'border-borderMoreContrast bg-bgSurface',
} as const;

export function calloutTone(kind: string): keyof typeof TONE_CLASSES {
    return CALLOUT_TONES[kind] ?? 'neutral';
}

const isHttps = (src: string) => /^https:\/\//i.test(src.trim());

/** Issues of a parsed text, reported once per change of the text. */
function collectIssues(blocks: readonly MarkdownBlock[], issues: MarkdownIssue[]) {
    const visitInline = (nodes: readonly MarkdownInline[]) => {
        for (const node of nodes) {
            if (node.type === 'image' && !isHttps(node.src) && /^http:/i.test(node.src)) {
                issues.push({ code: 'insecure-image', src: node.src });
            } else if ('children' in node) {
                visitInline(node.children);
            }
        }
    };
    const visitList = (list: MarkdownListBlock) => {
        for (const item of list.items) {
            visitInline(item.children);
            item.lists.forEach(visitList);
        }
    };
    for (const block of blocks) {
        switch (block.type) {
            case 'callout':
                if (!CALLOUT_TONES[block.kind] && !NEUTRAL_CALLOUTS.has(block.kind)) {
                    issues.push({ code: 'unknown-callout', kind: block.kind });
                }
                visitInline(block.title);
                collectIssues(block.children, issues);
                break;
            case 'quote':
                collectIssues(block.children, issues);
                break;
            case 'heading':
            case 'paragraph':
                visitInline(block.children);
                break;
            case 'list':
                visitList(block);
                break;
            case 'table':
                block.head.forEach(visitInline);
                block.rows.forEach((row) => row.forEach(visitInline));
                break;
            case 'code':
            case 'rule':
                break;
        }
    }
}

function Inlines({ nodes }: { nodes: readonly MarkdownInline[] }) {
    return nodes.map((node, index) => <Inline key={index} node={node} />);
}

function Inline({ node }: { node: MarkdownInline }) {
    const { renderCode, resolveEmbed } = useContext(SlotsContext);
    switch (node.type) {
        case 'text':
            return node.text;
        case 'strong':
            return (
                <strong>
                    <Inlines nodes={node.children} />
                </strong>
            );
        case 'em':
            return (
                <em>
                    <Inlines nodes={node.children} />
                </em>
            );
        case 'del':
            return (
                <del>
                    <Inlines nodes={node.children} />
                </del>
            );
        case 'mark':
            return (
                <mark className="rounded-sm bg-warning/30 px-0.5 text-inherit">
                    <Inlines nodes={node.children} />
                </mark>
            );
        case 'code': {
            const custom = renderCode?.(node.code);
            if (custom !== undefined) return custom;
            return (
                <code className="rounded-sm bg-bgBase px-1 py-0.5 font-mono text-[0.9em]">
                    {node.code}
                </code>
            );
        }
        case 'link':
            return node.href.startsWith('#') ? (
                <a href={node.href} title={node.title} className={LINK_CLASSES}>
                    <Inlines nodes={node.children} />
                </a>
            ) : (
                <a
                    href={node.href}
                    title={node.title}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={LINK_CLASSES}
                >
                    <Inlines nodes={node.children} />
                </a>
            );
        case 'image': {
            const src = isHttps(node.src) ? node.src : resolveEmbed?.(node.src);
            if (src)
                return <img src={src} alt={node.alt} title={node.title} className="max-w-full" />;
            if (/^http:/i.test(node.src)) {
                return (
                    <span className="text-textSecondary">
                        {translate(messages.insecureImage)}{' '}
                        <a
                            href={node.src}
                            target="_blank"
                            rel="noreferrer noopener"
                            className={LINK_CLASSES}
                        >
                            {node.alt || node.src}
                        </a>
                    </span>
                );
            }
            return <span className="text-textSecondary">{node.alt || node.src}</span>;
        }
        case 'embed': {
            const src = resolveEmbed?.(node.name);
            if (src) {
                return <img src={src} alt={node.alt ?? node.name} className="max-w-full" />;
            }
            return <InertLink text={`![[${node.name}${node.alt ? `|${node.alt}` : ''}]]`} />;
        }
        case 'wikilink':
            return <InertLink text={node.alias ?? node.target} title={node.target} />;
    }
}

const LINK_CLASSES =
    'text-primary underline underline-offset-2 hover:text-primary-hover focus-visible:outline-1 focus-visible:outline-primary';

/** A link that does nothing yet (spec 043 FR-010): looks like a link, reads as text. */
function InertLink({ text, title }: { text: string; title?: string }) {
    return (
        <span
            className="text-primary underline decoration-dotted underline-offset-2"
            title={
                title
                    ? `${title} — ${translate(messages.unresolvedEmbed)}`
                    : translate(messages.unresolvedEmbed)
            }
        >
            {text}
        </span>
    );
}

function List({ list }: { list: MarkdownListBlock }) {
    const { onToggleTask } = useContext(SlotsContext);
    const items = list.items.map((item, index) => (
        <li key={index} className={clsx(item.task && 'list-none')}>
            {item.task ? (
                <label className="inline-flex items-start gap-2">
                    <input
                        type="checkbox"
                        className="mt-1"
                        checked={item.task.checked}
                        disabled={!onToggleTask}
                        onChange={() => item.task && onToggleTask?.(item.task.line)}
                    />
                    <span className={clsx(item.task.checked && 'text-textSecondary line-through')}>
                        <Inlines nodes={item.children} />
                    </span>
                </label>
            ) : (
                <Inlines nodes={item.children} />
            )}
            {item.lists.map((nested, nestedIndex) => (
                <List key={nestedIndex} list={nested} />
            ))}
        </li>
    ));
    return list.ordered ? (
        <ol start={list.start === 1 ? undefined : list.start} className="my-1 list-decimal pl-6">
            {items}
        </ol>
    ) : (
        <ul className="my-1 list-disc pl-6">{items}</ul>
    );
}

const HEADING_CLASSES = [
    'text-2xl font-bold',
    'text-xl font-bold',
    'text-lg font-bold',
    'text-base font-bold',
    'text-sm font-bold uppercase tracking-wide',
    'text-sm font-semibold text-textSecondary',
];

function Block({ block }: { block: MarkdownBlock }): ReactNode {
    const { headingOffset } = useContext(SlotsContext);
    switch (block.type) {
        case 'heading': {
            const level = Math.min(6, block.level + headingOffset);
            const Tag = `h${String(level)}` as 'h2';
            return (
                <Tag
                    className={clsx('mt-3 mb-1 text-textPrimary', HEADING_CLASSES[block.level - 1])}
                >
                    <Inlines nodes={block.children} />
                </Tag>
            );
        }
        case 'paragraph':
            return (
                <p className="my-0.5 min-h-[1lh]">
                    <Inlines nodes={block.children} />
                </p>
            );
        case 'rule':
            return <hr className="my-3 border-border" />;
        case 'code':
            return (
                <pre className="my-2 overflow-x-auto rounded-sm bg-bgBase p-2 text-sm">
                    <code className="font-mono">{block.code}</code>
                </pre>
            );
        case 'quote':
            return (
                <blockquote className="my-2 border-l-4 border-borderMoreContrast pl-3 text-textSecondary">
                    <Blocks blocks={block.children} />
                </blockquote>
            );
        case 'callout':
            return <Callout callout={block} />;
        case 'list':
            return <List list={block} />;
        case 'table':
            return (
                <div className="my-2 overflow-x-auto">
                    <table className="border-collapse text-sm">
                        <thead>
                            <tr>
                                {block.head.map((cell, index) => (
                                    <th
                                        key={index}
                                        scope="col"
                                        className="border border-border px-2 py-1"
                                        style={{ textAlign: block.align[index] ?? undefined }}
                                    >
                                        <Inlines nodes={cell} />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {block.rows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {row.map((cell, index) => (
                                        <td
                                            key={index}
                                            className="border border-border px-2 py-1"
                                            style={{ textAlign: block.align[index] ?? undefined }}
                                        >
                                            <Inlines nodes={cell} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
    }
}

/**
 * A callout; `-` starts it folded and `+` open (spec 043, US2). Folding is the reader's state in
 * this view only: never written into the text, never shared with another view.
 */
function Callout({ callout }: { callout: Extract<MarkdownBlock, { type: 'callout' }> }) {
    const [open, setOpen] = useState(callout.fold !== 'closed');
    const bodyId = useId();
    const foldable = callout.fold !== null;
    return (
        <div
            className={clsx(
                'my-2 rounded-sm border-l-4 px-3 py-2',
                TONE_CLASSES[calloutTone(callout.kind)]
            )}
            data-callout={callout.kind}
        >
            {foldable ? (
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={bodyId}
                    onClick={() => setOpen((current) => !current)}
                    className="flex w-full items-center gap-1 text-left font-bold focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
                >
                    <ChevronRight
                        aria-hidden
                        className={clsx(
                            'h-4 w-4 shrink-0 transition-transform',
                            open && 'rotate-90'
                        )}
                    />
                    <span>
                        <Inlines nodes={callout.title} />
                    </span>
                </button>
            ) : (
                <p className="font-bold">
                    <Inlines nodes={callout.title} />
                </p>
            )}
            {(!foldable || open) && (
                <div id={bodyId}>
                    <Blocks blocks={callout.children} />
                </div>
            )}
        </div>
    );
}

function Blocks({ blocks }: { blocks: readonly MarkdownBlock[] }) {
    return blocks.map((block, index) => <Block key={index} block={block} />);
}

/** Equal source on the same line renders equally: unchanged blocks skip rendering. */
const TopBlock = memo(
    function TopBlock({ top }: { top: MarkdownTopBlock }) {
        return <Block block={top.block} />;
    },
    (previous, next) =>
        previous.top.source === next.top.source && previous.top.line === next.top.line
);

/** Renders markdown as React nodes; no input ever becomes HTML (spec 043 FR-009). */
export function MarkdownView({
    source,
    renderCode,
    resolveEmbed,
    onToggleTask,
    onIssue,
    headingOffset = 1,
    className,
}: MarkdownViewProps) {
    const tops = useMemo(() => parseMarkdown(source), [source]);
    const slots = useMemo(
        () => ({ renderCode, resolveEmbed, onToggleTask, headingOffset }),
        [renderCode, resolveEmbed, onToggleTask, headingOffset]
    );
    useEffect(() => {
        if (!onIssue) return;
        const issues: MarkdownIssue[] = [];
        collectIssues(
            tops.map(({ block }) => block),
            issues
        );
        for (const issue of issues) onIssue(issue);
    }, [tops, onIssue]);
    return (
        <SlotsContext.Provider value={slots}>
            <div className={clsx('break-words text-textPrimary', className)}>
                {tops.map((top, index) => (
                    <TopBlock key={`${String(top.line)}:${String(index)}`} top={top} />
                ))}
            </div>
        </SlotsContext.Provider>
    );
}
