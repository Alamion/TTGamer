import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { Plus, X } from 'lucide-react';
import {
    type CSSProperties,
    type KeyboardEvent as ReactKeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {
    TrackerClick,
    TrackerModel,
    TrackerModelColumn,
    TrackerModelCopy,
} from '../../features/sheet/data/trackerModel';
import { TRACKER_PALETTE_FILLS, type TrackerPaletteFill } from '../../types/template';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';
import { ConditionTrackLengthButtons } from './ConditionTrack';
import { StatLabel } from './StatLabel';

const messages = uiMessages.sheet.tracks;

type Mark = TrackerModel['marks'][number];

const PALETTE_CLASSES: Record<TrackerPaletteFill, string> = {
    secondary: 'border-secondary bg-secondary text-white',
    error: 'border-error bg-error text-white',
    tertiary: 'border-tertiary bg-tertiary text-white',
    success: 'border-success bg-success text-white',
    // Ink flips with the theme, so its symbol takes the page background to stay readable.
    text: 'border-textPrimary bg-textPrimary text-bgBase',
    primary: 'border-primary bg-primary text-primary-on',
};

function isPaletteFill(fill: string): fill is TrackerPaletteFill {
    return (TRACKER_PALETTE_FILLS as readonly string[]).includes(fill);
}

const PALETTE_CSS: Record<TrackerPaletteFill, string> = {
    secondary: 'rgb(var(--secondary))',
    error: 'rgb(var(--error))',
    tertiary: 'rgb(var(--tertiary))',
    success: 'rgb(var(--success))',
    text: 'rgb(var(--text-primary))',
    primary: 'rgb(var(--primary))',
};

/** A locked box (spec 020 FR-011) darkens in its own mark's color. */
function darker(fill: string): string {
    return `color-mix(in srgb, ${isPaletteFill(fill) ? PALETTE_CSS[fill] : fill}, black 35%)`;
}

function fillLook(mark: Pick<Mark, 'fill'> | undefined): {
    className: string;
    style?: CSSProperties;
} {
    if (!mark) return { className: 'border-border bg-bgBase' };
    if (isPaletteFill(mark.fill)) return { className: PALETTE_CLASSES[mark.fill] };
    return {
        className: 'text-white',
        style: { backgroundColor: mark.fill, borderColor: mark.fill },
    };
}

const BOX = 'grid shrink-0 place-items-center rounded border-2 font-mono font-bold leading-none';
// Spec 019: boxes are smaller and further apart, so outline rings never touch.
const BOX_SIZE = {
    md: 'h-[26px] w-[26px] text-xs',
    sm: 'h-5 w-5 text-[11px]',
    // Spec 020: a pool row's boxes are the size of rating dots.
    dot: 'h-4 w-4 text-[9px]',
    xs: 'h-3.5 w-3.5 border text-[9px]',
} as const;

type BoxSize = keyof typeof BOX_SIZE;

/** The outline layer: a ring outside the box with a see-through gap (spec 019 R7). */
const OUTLINE_SIZE: Record<BoxSize, string> = {
    md: 'outline outline-[2.5px] outline-offset-[1.5px]',
    sm: 'outline outline-2 outline-offset-1',
    dot: 'outline outline-2 outline-offset-1',
    xs: 'outline outline-[1.5px] outline-offset-1',
};

const OUTLINE_CLASSES: Record<TrackerPaletteFill, string> = {
    secondary: 'outline-secondary',
    error: 'outline-error',
    tertiary: 'outline-tertiary',
    success: 'outline-success',
    text: 'outline-textPrimary',
    primary: 'outline-primary',
};

const SYMBOL_CLASSES: Record<TrackerPaletteFill, string> = {
    secondary: 'text-secondary',
    error: 'text-error',
    tertiary: 'text-tertiary',
    success: 'text-success',
    text: 'text-textPrimary',
    primary: 'text-primary',
};

/** Classes, style, and symbol of a box holding an optional fill and an optional outline. */
function boxLook(
    fill: Pick<Mark, 'fill' | 'symbol'> | undefined,
    outline: Pick<Mark, 'fill' | 'symbol'> | undefined,
    size: BoxSize
): { className: string; style?: CSSProperties; symbol: string } {
    const base = fillLook(fill);
    if (!outline) return { ...base, symbol: fill?.symbol ?? '' };
    const palette = isPaletteFill(outline.fill);
    return {
        className: clsx(
            base.className,
            OUTLINE_SIZE[size],
            palette && OUTLINE_CLASSES[outline.fill as TrackerPaletteFill],
            // An outline's symbol shows only on a box without a fill, in the outline's color.
            !fill && palette && SYMBOL_CLASSES[outline.fill as TrackerPaletteFill]
        ),
        style: {
            ...base.style,
            ...(palette ? {} : { outlineColor: outline.fill }),
            ...(!fill && !palette ? { color: outline.fill } : {}),
        },
        symbol: fill ? fill.symbol : outline.symbol,
    };
}

/** A mark as it looks in a box, symbol centered; the preview in legends and the editor. */
export function MarkSwatch({
    mark,
    size = 'sm',
}: {
    mark: Pick<Mark, 'fill' | 'symbol'> & { layer?: Mark['layer'] };
    size?: BoxSize;
}) {
    const look =
        mark.layer === 'outline' ? boxLook(undefined, mark, size) : boxLook(mark, undefined, size);
    return (
        <span
            aria-hidden="true"
            className={clsx(BOX, BOX_SIZE[size], look.className)}
            style={look.style}
        >
            {look.symbol}
        </span>
    );
}

const LONG_PRESS_MS = 500;
const LONG_PRESS_SLOP_PX = 10;

/**
 * A touch long press (spec 020 FR-005a): held still for half a second, it runs `onLong` once and
 * swallows the press's click and the phone's own context menu. Mouse and pen presses never start it.
 */
function useLongPress(onLong: (() => void) | undefined) {
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const start = useRef<{ x: number; y: number } | undefined>(undefined);
    const fired = useRef(false);
    const touchedAt = useRef(0);
    useEffect(() => () => clearTimeout(timer.current), []);
    const cancel = () => {
        clearTimeout(timer.current);
        start.current = undefined;
    };
    return {
        handlers: onLong
            ? {
                  onPointerDown: (event: ReactPointerEvent) => {
                      if (event.pointerType !== 'touch') return;
                      fired.current = false;
                      touchedAt.current = Date.now();
                      start.current = { x: event.clientX, y: event.clientY };
                      clearTimeout(timer.current);
                      timer.current = setTimeout(() => {
                          start.current = undefined;
                          fired.current = true;
                          onLong();
                      }, LONG_PRESS_MS);
                  },
                  onPointerMove: (event: ReactPointerEvent) => {
                      const from = start.current;
                      if (!from) return;
                      const moved = Math.hypot(event.clientX - from.x, event.clientY - from.y);
                      if (moved > LONG_PRESS_SLOP_PX) cancel();
                  },
                  onPointerUp: cancel,
                  onPointerCancel: cancel,
                  onPointerLeave: cancel,
              }
            : {},
        /** True (once) when the click ending a long press must be dropped. */
        consumeClick: () => {
            const was = fired.current;
            fired.current = false;
            return was;
        },
        /** The phone's own long-press menu right after a touch: drop it, the timer acts instead. */
        touchMenu: () => Date.now() - touchedAt.current < LONG_PRESS_MS * 2,
    };
}

function MarkBox({
    disabled,
    label,
    title,
    fill,
    outline,
    onToggle,
    onOutline,
    locked,
    size,
}: {
    disabled: boolean;
    label: string;
    title: string;
    fill: Mark | undefined;
    outline: Mark | undefined;
    onToggle: () => void;
    /** The outline action (right click, Shift+Enter/Space, long press); unset keeps the defaults. */
    onOutline?: () => void;
    /** Layers a minimum holds on this box (pools, spec 020). */
    locked?: { fill: boolean; outline: boolean };
    size: Exclude<BoxSize, 'xs'>;
}) {
    const look = boxLook(fill, outline, size);
    const lockedFill = locked?.fill === true && fill !== undefined;
    const lockedOutline = locked?.outline === true && outline !== undefined;
    const style: CSSProperties = {
        ...look.style,
        ...(lockedFill
            ? { backgroundColor: darker(fill.fill), borderColor: darker(fill.fill) }
            : {}),
        ...(lockedOutline ? { outlineColor: darker(outline.fill) } : {}),
    };
    const text = messages.tracker;
    const names = [fill?.name, outline?.name].filter(Boolean).join(', ');
    const outlineAction = disabled ? undefined : onOutline;
    const longPress = useLongPress(outlineAction);
    const shiftActivates = (event: ReactKeyboardEvent) =>
        event.shiftKey && (event.key === 'Enter' || event.key === ' ');
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => {
                if (!longPress.consumeClick()) onToggle();
            }}
            {...longPress.handlers}
            {...(outlineAction
                ? {
                      onContextMenu: (event: ReactMouseEvent) => {
                          event.preventDefault();
                          if (!longPress.touchMenu()) outlineAction();
                      },
                      onKeyDown: (event: ReactKeyboardEvent) => {
                          if (!shiftActivates(event)) return;
                          // The button's own click must not follow (Enter clicks on key down).
                          event.preventDefault();
                          if (!event.repeat) outlineAction();
                      },
                      // Space clicks on key up.
                      onKeyUp: (event: ReactKeyboardEvent) => {
                          if (shiftActivates(event)) event.preventDefault();
                      },
                  }
                : {})}
            aria-label={
                lockedFill || lockedOutline
                    ? translate(text.boxLocked, { level: label, mark: names })
                    : fill && outline
                      ? translate(text.boxBoth, {
                            level: label,
                            fill: fill.name,
                            outline: outline.name,
                        })
                      : translate(text.box, {
                            level: label,
                            mark: (fill ?? outline)?.name ?? translate(text.empty),
                        })
            }
            title={title}
            className={clsx(
                BOX,
                BOX_SIZE[size],
                'transition-colors focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-70',
                // The outline layer owns `outline`; plain boxes drop the browser's focus outline.
                !outline && 'focus-visible:outline-none',
                // A long press must not select text or open the phone's callout.
                'select-none [-webkit-touch-callout:none]',
                look.className,
                !fill && !disabled && 'hover:border-primary'
            )}
            style={style}
        >
            {look.symbol}
        </button>
    );
}

export interface TrackerProps {
    model: TrackerModel;
    disabled: boolean;
    /** A box press: the legend brush's mark (spec 019) or a layer (spec 020 outline action). */
    onMark: (columnId: string, copyId: string, levelId: string, click: TrackerClick) => void;
    onText?: (columnId: string, copyId: string, levelId: string, text: string) => void;
    onAddCopy?: (columnId: string) => void;
    onRemoveCopy?: (columnId: string, copyId: string) => void;
    onLength?: (step: -1 | 1) => void;
    lengthHidesMarks?: (step: -1 | 1) => boolean;
    /** Built-in member tracks keep their own wording ("Add member", "Out of the fight"). */
    wording?: Partial<TrackerWording>;
}

export interface TrackerWording {
    add: (column: TrackerModelColumn) => string;
    remove: (column: TrackerModelColumn, copy: TrackerModelCopy) => string;
    out: string;
    removeTitle: string;
    removeDescription: (copy: TrackerModelCopy) => string;
    shortenTitle: string;
    shortenDescription: string;
    /** Accessible level name of a box in a repeated column: "Hurt (A)". */
    boxLabel: (level: string, column: TrackerModelColumn, copy: TrackerModelCopy) => string;
    /** Said when a repeated column is full; built-in member tracks name their cap. */
    capReached?: (column: TrackerModelColumn) => string;
}

function defaultWording(): TrackerWording {
    const text = messages.tracker;
    return {
        add: (column) => translate(text.add, { title: column.title }),
        remove: (_column, copy) => translate(text.removeCopy, { name: copy.label }),
        out: translate(text.out),
        removeTitle: translate(text.removeCopyTitle),
        removeDescription: (copy) => translate(text.removeCopyDescription, { name: copy.label }),
        shortenTitle: translate(text.shortenTitle),
        shortenDescription: translate(text.shortenDescription),
        boxLabel: (level, _column, copy) => (copy.letter ? `${level} (${copy.letter})` : level),
    };
}

type Pending =
    | { type: 'remove'; column: TrackerModelColumn; copy: TrackerModelCopy }
    | { type: 'length'; step: -1 | 1 }
    | undefined;

const dash = (value: string | undefined) => (value ? value : '—');

/**
 * One tracker (spec 018): levels, mark kinds, marks and text columns with copies, a total per
 * copy, and an optional length switch, drawn as a table, strips, or one small line.
 */
export function Tracker({
    model,
    disabled,
    onMark,
    onText,
    onAddCopy,
    onRemoveCopy,
    onLength,
    lengthHidesMarks,
    wording: wordingOverrides,
}: TrackerProps) {
    const [pending, setPending] = useState<Pending>();
    const [brush, setBrush] = useState<Pick<Mark, 'id' | 'layer'>>();
    const wording = { ...defaultWording(), ...wordingOverrides };
    const markById = new Map(model.marks.map((mark) => [mark.id, mark]));
    const legendShown = model.legend && model.display !== 'line';
    const brushMark = brush ? markById.get(brush.id) : undefined;
    // A brush whose mark is gone or changed layer, or that has no legend to show it, ends for good.
    if (brush && (!brushMark || brushMark.layer !== brush.layer || !legendShown || disabled)) {
        setBrush(undefined);
    }
    const activeBrush = brush && brushMark?.layer === brush.layer ? brushMark : undefined;
    const root = useRef<HTMLDivElement>(null);
    const brushOn = activeBrush !== undefined;
    useEffect(() => {
        const node = root.current;
        if (!node || !brushOn) return;
        // Escape ends the brush while focus is inside this tracker; open dialogs take it first.
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            setBrush(undefined);
        };
        node.addEventListener('keydown', onKey);
        return () => node.removeEventListener('keydown', onKey);
    }, [brushOn]);
    const levelTitle = (level: TrackerModel['levels'][number]) =>
        model.valueColumn.show && level.value ? `${level.name} (${level.value})` : level.name;
    const size = model.display === 'row' ? 'dot' : model.display === 'line' ? 'sm' : 'md';
    // The layer the total and the marked level name read (spec 019 FR-016).
    const readingOf = (copy: TrackerModelCopy) =>
        model.readingLayer === 'fill' ? copy.marks : copy.outlines;

    const requestRemove = (column: TrackerModelColumn, copy: TrackerModelCopy) => {
        if (copy.hasValues) setPending({ type: 'remove', column, copy });
        else onRemoveCopy?.(column.id, copy.id);
    };
    const requestLength = (step: -1 | 1) => {
        if (lengthHidesMarks?.(step)) setPending({ type: 'length', step });
        else onLength?.(step);
    };

    const box = (column: TrackerModelColumn, copy: TrackerModelCopy, levelId: string) => {
        const level = model.levels.find(({ id }) => id === levelId)!;
        const position = column.covered.indexOf(levelId);
        const locked = copy.locked && {
            fill: position < copy.locked.fill,
            outline: position < copy.locked.outline,
        };
        const held = locked?.fill
            ? copy.locked!.fill
            : locked?.outline
              ? copy.locked!.outline
              : undefined;
        return (
            <MarkBox
                key={levelId}
                disabled={disabled}
                label={wording.boxLabel(level.name, column, copy)}
                title={
                    held === undefined
                        ? levelTitle(level)
                        : translate(messages.tracker.lockedTitle, { level: level.name, n: held })
                }
                locked={locked}
                fill={markById.get(copy.marks[levelId] ?? '')}
                outline={markById.get(copy.outlines[levelId] ?? '')}
                onToggle={() =>
                    onMark(
                        column.id,
                        copy.id,
                        levelId,
                        activeBrush ? { brush: activeBrush.id } : { layer: model.readingLayer }
                    )
                }
                onOutline={
                    model.hasOutlines
                        ? () => onMark(column.id, copy.id, levelId, { layer: 'outline' })
                        : undefined
                }
                size={size}
            />
        );
    };

    const removeButton = (column: TrackerModelColumn, copy: TrackerModelCopy) =>
        column.canRemove &&
        !disabled && (
            <button
                type="button"
                onClick={() => requestRemove(column, copy)}
                aria-label={wording.remove(column, copy)}
                className="rounded p-0.5 text-textSecondary hover:text-error"
            >
                <X className="h-3 w-3" aria-hidden="true" />
            </button>
        );

    const lengthControl =
        model.length && model.display !== 'line' && !disabled ? (
            <span className="inline-flex items-center gap-1 text-xs text-textSecondary">
                <ConditionTrackLengthButtons
                    disabled={disabled}
                    control={{
                        onDecrease: model.length.canShorten ? () => requestLength(-1) : undefined,
                        onIncrease: model.length.canLengthen ? () => requestLength(1) : undefined,
                        decreaseLabel: translate(messages.length.decrease, { track: model.label }),
                        increaseLabel: translate(messages.length.increase, { track: model.label }),
                    }}
                />
                <span className="font-mono">{model.length.shown}</span>
            </span>
        ) : undefined;

    const addButtons = disabled
        ? []
        : model.columns
              .filter((column) => column.repeatable)
              .map((column) => (
                  <button
                      key={column.id}
                      type="button"
                      onClick={() => onAddCopy?.(column.id)}
                      disabled={!column.canAdd}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-bgBase disabled:opacity-40"
                  >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {wording.add(column)}
                  </button>
              ));

    let body: ReactNode;
    if (model.display === 'table') body = renderTable();
    else if (model.display === 'row') body = renderRow();
    else body = renderStrips();

    /** A pool drawn like a rating row (spec 020 FR-011a): label left, boxes and count right. */
    function renderRow() {
        const column = model.columns[0];
        const copy = column?.copies[0];
        if (!column || !copy) return null;
        return (
            <div className="term-row flex items-center justify-between gap-2 py-1">
                <StatLabel
                    label={model.label}
                    className={model.hideLabel ? 'sr-only' : undefined}
                />
                <span className="flex items-center gap-2">
                    <span
                        role="group"
                        aria-label={model.label}
                        className="flex flex-wrap items-center gap-[7px]"
                    >
                        {column.covered.map((levelId) => box(column, copy, levelId))}
                    </span>
                    {model.total && copy.total && (
                        <span className="min-w-[3.2em] text-right font-mono text-xs font-bold text-textSecondary">
                            {copy.total}
                        </span>
                    )}
                </span>
            </div>
        );
    }

    function renderTable() {
        const copies = model.columns.flatMap((column) =>
            column.copies.map((copy) => ({ column, copy }))
        );
        const marksCopies = copies.filter(({ column }) => column.kind === 'marks');
        const template = [
            'minmax(6rem,1fr)',
            ...(model.valueColumn.show ? ['4.5rem'] : []),
            ...copies.map(({ column }) =>
                column.kind === 'marks' ? 'minmax(3.5rem,auto)' : 'minmax(8rem,1fr)'
            ),
        ].join(' ');
        const row = 'grid items-center gap-2';
        const style = { gridTemplateColumns: template };
        const single = marksCopies.length === 1 ? marksCopies[0] : undefined;
        return (
            <div className="overflow-x-auto">
                <div role="table" aria-label={model.label} className="w-full min-w-max text-sm">
                    <div
                        role="row"
                        style={style}
                        className={clsx(
                            row,
                            'pb-2 text-xs font-semibold uppercase tracking-wider text-textSecondary'
                        )}
                    >
                        <span role="columnheader">{translate(messages.tracker.level)}</span>
                        {model.valueColumn.show && (
                            <span role="columnheader" className="text-center">
                                {model.valueColumn.title || translate(messages.tracker.value)}
                            </span>
                        )}
                        {copies.map(({ column, copy }) => (
                            <span
                                key={`${column.id}-${copy.id}`}
                                role="columnheader"
                                className="flex items-center justify-center gap-0.5 text-center"
                            >
                                <span
                                    className={clsx(copy.out && 'text-error line-through')}
                                    title={copy.out ? wording.out : undefined}
                                >
                                    {copy.label}
                                </span>
                                {removeButton(column, copy)}
                            </span>
                        ))}
                    </div>
                    {model.levels.map((level) => (
                        <div
                            key={level.id}
                            role="row"
                            style={style}
                            className={clsx(row, 'border-t border-border/60 py-2')}
                        >
                            <span
                                role="rowheader"
                                className={clsx(
                                    'font-medium',
                                    single &&
                                        readingOf(single.copy)[level.id] &&
                                        markById.has(readingOf(single.copy)[level.id]!)
                                        ? 'text-error'
                                        : 'text-textPrimary'
                                )}
                            >
                                {level.name}
                            </span>
                            {model.valueColumn.show && (
                                <span
                                    role="cell"
                                    className="text-center font-mono text-textSecondary"
                                >
                                    {dash(level.value)}
                                </span>
                            )}
                            {copies.map(({ column, copy }) => (
                                <span
                                    key={`${column.id}-${copy.id}`}
                                    role="cell"
                                    className="flex justify-center"
                                >
                                    {!column.covered.includes(level.id) ? (
                                        <span
                                            className="text-borderMoreContrast"
                                            aria-hidden="true"
                                        >
                                            ·
                                        </span>
                                    ) : column.kind === 'marks' ? (
                                        box(column, copy, level.id)
                                    ) : disabled ? (
                                        <span className="w-full text-textPrimary">
                                            {copy.texts[level.id] ?? ''}
                                        </span>
                                    ) : (
                                        <input
                                            type="text"
                                            value={copy.texts[level.id] ?? ''}
                                            maxLength={200}
                                            aria-label={`${copy.label || column.title} — ${level.name}`}
                                            onChange={(event) =>
                                                onText?.(
                                                    column.id,
                                                    copy.id,
                                                    level.id,
                                                    event.target.value
                                                )
                                            }
                                            className="w-full rounded border bg-bgBase px-1.5 py-0.5 text-sm text-textPrimary"
                                        />
                                    )}
                                </span>
                            ))}
                        </div>
                    ))}
                    {model.total && (
                        <div
                            role="row"
                            data-tracker-total=""
                            style={style}
                            className={clsx(
                                row,
                                'border-t-2 border-border py-1.5 font-mono font-bold'
                            )}
                        >
                            <span
                                role="rowheader"
                                className="font-sans text-xs font-semibold uppercase tracking-wider text-textSecondary"
                            >
                                {model.valueColumn.title || translate(messages.tracker.value)}
                            </span>
                            {model.valueColumn.show && <span role="cell" />}
                            {copies.map(({ column, copy }) => (
                                <span
                                    key={`${column.id}-${copy.id}`}
                                    role="cell"
                                    className="text-center"
                                >
                                    {column.kind !== 'marks' ? null : copy.out ? (
                                        <span className="rounded bg-error/15 px-1.5 font-sans text-[10px] font-semibold uppercase text-error">
                                            {wording.out}
                                        </span>
                                    ) : (
                                        dash(copy.total)
                                    )}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    function renderStrips() {
        const lines = model.columns
            .filter((column) => column.kind === 'marks')
            .flatMap((column) =>
                column.copies.map((copy) => {
                    const name = copy.label || model.label;
                    const ownName =
                        !column.repeatable &&
                        model.columns.filter((c) => c.kind === 'marks').length === 1;
                    return (
                        <div
                            key={`${column.id}-${copy.id}`}
                            className={clsx(
                                'flex flex-wrap items-center',
                                size === 'sm'
                                    ? 'gap-x-2 gap-y-1 text-xs'
                                    : 'gap-x-3 gap-y-1 text-xs'
                            )}
                            data-defeated={copy.out || undefined}
                        >
                            <span
                                className={clsx(
                                    'font-semibold uppercase tracking-wider',
                                    copy.out ? 'text-error line-through' : 'text-textSecondary',
                                    ownName && model.hideLabel && 'sr-only'
                                )}
                                title={copy.out ? wording.out : undefined}
                            >
                                {ownName ? model.label : name}
                            </span>
                            <span
                                className={clsx(
                                    'flex flex-wrap items-center',
                                    size === 'sm' ? 'gap-2.5' : 'gap-3'
                                )}
                                role="group"
                                aria-label={ownName ? model.label : name}
                            >
                                {column.covered.map((levelId) => box(column, copy, levelId))}
                            </span>
                            {model.total &&
                                (copy.out ? (
                                    <span className="rounded bg-error/15 px-1.5 text-[10px] font-semibold uppercase text-error">
                                        {wording.out}
                                    </span>
                                ) : (
                                    copy.total && (
                                        <span className="font-mono font-bold text-textSecondary">
                                            {model.valueColumn.title
                                                ? `${model.valueColumn.title} ${copy.total}`
                                                : copy.total}
                                        </span>
                                    )
                                ))}
                            {removeButton(column, copy)}
                        </div>
                    );
                })
            );
        const textTitles = model.columns
            .filter((column) => column.kind === 'text')
            .map((column) => column.title);
        return (
            <div className="grid gap-2">
                {lines}
                {textTitles.length > 0 && model.display === 'strip' && (
                    <p className="text-xs text-textSecondary">
                        {translate(messages.tracker.textOnlyInTable, {
                            titles: textTitles.join(', '),
                        })}
                    </p>
                )}
            </div>
        );
    }

    const legend = legendShown ? (
        <div className="grid gap-1">
            <ul className="m-0 flex list-none flex-wrap gap-x-1.5 gap-y-1 p-0 text-xs text-textSecondary">
                {model.marks.map((mark) => {
                    const content = (
                        <>
                            <MarkSwatch mark={mark} />
                            {mark.name}
                        </>
                    );
                    const pressed = activeBrush?.id === mark.id;
                    return (
                        <li key={mark.id}>
                            {disabled ? (
                                <span className="inline-flex items-center gap-1.5 border border-transparent px-2 py-1.5">
                                    {content}
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    aria-pressed={pressed}
                                    title={translate(
                                        pressed
                                            ? messages.tracker.brushOff
                                            : messages.tracker.brushOn,
                                        { mark: mark.name }
                                    )}
                                    onClick={() =>
                                        setBrush(
                                            pressed ? undefined : { id: mark.id, layer: mark.layer }
                                        )
                                    }
                                    className={clsx(
                                        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                        pressed
                                            ? 'border-warning text-textPrimary ring-1 ring-warning'
                                            : 'border-border hover:border-borderMoreContrast hover:text-textPrimary'
                                    )}
                                >
                                    {content}
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>
            {!disabled && (
                <p role="status" className="m-0 min-h-0 text-[11px] text-textSecondary">
                    {activeBrush
                        ? translate(messages.tracker.brushStatus, { mark: activeBrush.name })
                        : ''}
                </p>
            )}
        </div>
    ) : null;

    const capNotes = disabled
        ? []
        : model.columns
              .filter((column) => column.repeatable && !column.canAdd && wording.capReached)
              .map((column) => (
                  <span key={column.id} role="alert" className="text-xs text-textSecondary">
                      {wording.capReached!(column)}
                  </span>
              ));
    const showHeaderLabel = model.display === 'table' && !model.hideLabel;
    const toolbar = [lengthControl, ...addButtons, ...capNotes].filter(Boolean);

    return (
        <div ref={root} className="grid gap-2">
            {(showHeaderLabel || toolbar.length > 0) && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    {showHeaderLabel ? (
                        <span className="text-xs font-semibold uppercase tracking-wider text-textSecondary">
                            {model.label}
                        </span>
                    ) : (
                        <span />
                    )}
                    {toolbar.length > 0 && (
                        <span className="flex flex-wrap items-center gap-2">{toolbar}</span>
                    )}
                </div>
            )}
            {body}
            {legend}
            <ConfirmDialog
                open={pending !== undefined}
                onOpenChange={(open) => {
                    if (!open) setPending(undefined);
                }}
                onConfirm={() => {
                    if (pending?.type === 'remove')
                        onRemoveCopy?.(pending.column.id, pending.copy.id);
                    if (pending?.type === 'length') onLength?.(pending.step);
                    setPending(undefined);
                }}
                title={pending?.type === 'length' ? wording.shortenTitle : wording.removeTitle}
                description={
                    pending?.type === 'length'
                        ? wording.shortenDescription
                        : pending
                          ? wording.removeDescription(pending.copy)
                          : ''
                }
                confirmLabel={translate(messages.tracker.confirm)}
                cancelLabel={translate(messages.tracker.cancel)}
                variant="danger"
            />
        </div>
    );
}
