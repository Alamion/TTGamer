/**
 * One spacing rhythm for every compact form in a brief (spec 033, FR-004): the gap between
 * cells, between rows, between groups, and the look of a heading and a label. Elements import
 * these instead of choosing their own, so a brief reads as one dense page.
 */
export const BRIEF = {
    /** Between two cells of one row, and between two rows of one column. */
    cellGap: 'gap-1',
    rowGap: 'gap-y-0.5',
    /** Between two groups of the page, and inside a group's flow of chips. */
    groupGap: 'gap-2',
    flowGap: 'gap-x-3 gap-y-1',
    /** A group's title: small, bold capitals over a hairline. */
    heading:
        'border-b border-border pb-0.5 text-[11px] font-bold leading-3.5 uppercase tracking-wider text-[color:var(--brief-heading)]',
    /** The small caption over or beside a cell. */
    caption: 'text-[10.5px] font-semibold uppercase tracking-wider text-textSecondary',
    /** A control a finger edits: the visible cell stays small, the hit area grows. */
    cellHeight: 'h-6',
    chipHeight: 'h-[26px]',
} as const;
