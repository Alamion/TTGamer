import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { Plus, X } from 'lucide-react';
import { type CSSProperties, type ReactNode, useState } from 'react';

import type {
    TrackerModel,
    TrackerModelColumn,
    TrackerModelCopy,
} from '../../features/sheet/data/trackerModel';
import { TRACKER_PALETTE_FILLS, type TrackerPaletteFill } from '../../types/template';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';
import { ConditionTrackLengthButtons } from './ConditionTrack';

const messages = uiMessages.sheet.tracks;

type Mark = TrackerModel['marks'][number];

const PALETTE_CLASSES: Record<TrackerPaletteFill, string> = {
    secondary: 'border-secondary bg-secondary text-white',
    error: 'border-error bg-error text-white',
    tertiary: 'border-tertiary bg-tertiary text-white',
    success: 'border-success bg-success text-white',
    // Ink flips with the theme, so its symbol takes the page background to stay readable.
    text: 'border-textPrimary bg-textPrimary text-bgBase',
};

function isPaletteFill(fill: string): fill is TrackerPaletteFill {
    return (TRACKER_PALETTE_FILLS as readonly string[]).includes(fill);
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
const BOX_SIZE = {
    md: 'h-8 w-8 text-sm',
    sm: 'h-6 w-6 text-xs',
    xs: 'h-3.5 w-3.5 border',
} as const;

/** A mark's filled square, symbol centered; the preview in legends and the editor. */
export function MarkSwatch({
    mark,
    size = 'sm',
}: {
    mark: Pick<Mark, 'fill' | 'symbol'>;
    size?: keyof typeof BOX_SIZE;
}) {
    const look = fillLook(mark);
    return (
        <span
            aria-hidden="true"
            className={clsx(BOX, BOX_SIZE[size], look.className)}
            style={look.style}
        >
            {mark.symbol}
        </span>
    );
}

function MarkBox({
    disabled,
    label,
    title,
    mark,
    onToggle,
    size,
}: {
    disabled: boolean;
    label: string;
    title: string;
    mark: Mark | undefined;
    onToggle: () => void;
    size: 'sm' | 'md';
}) {
    const look = fillLook(mark);
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onToggle}
            aria-label={translate(messages.tracker.box, {
                level: label,
                mark: mark ? mark.name : translate(messages.tracker.empty),
            })}
            title={title}
            className={clsx(
                BOX,
                BOX_SIZE[size],
                'transition-colors disabled:opacity-70',
                look.className,
                !mark && !disabled && 'hover:border-primary'
            )}
            style={look.style}
        >
            {mark?.symbol}
        </button>
    );
}

export interface TrackerProps {
    model: TrackerModel;
    disabled: boolean;
    onMark: (columnId: string, copyId: string, levelId: string) => void;
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
    const wording = { ...defaultWording(), ...wordingOverrides };
    const markById = new Map(model.marks.map((mark) => [mark.id, mark]));
    const levelTitle = (level: TrackerModel['levels'][number]) =>
        model.valueColumn.show && level.value ? `${level.name} (${level.value})` : level.name;
    const size = model.display === 'line' ? 'sm' : 'md';

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
        return (
            <MarkBox
                key={levelId}
                disabled={disabled}
                label={wording.boxLabel(level.name, column, copy)}
                title={levelTitle(level)}
                mark={markById.get(copy.marks[levelId] ?? '')}
                onToggle={() => onMark(column.id, copy.id, levelId)}
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
    else body = renderStrips();

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
                            className={clsx(row, 'border-t border-border/60 py-1.5')}
                        >
                            <span
                                role="rowheader"
                                className={clsx(
                                    'font-medium',
                                    single &&
                                        single.copy.marks[level.id] &&
                                        markById.has(single.copy.marks[level.id]!)
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
                                className="flex flex-wrap items-center gap-1"
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
            <div className="grid gap-1">
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

    const legend =
        model.marks.length > 1 && model.display !== 'line' ? (
            <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-xs text-textSecondary">
                {model.marks.map((mark) => (
                    <li key={mark.id} className="inline-flex items-center gap-1">
                        <MarkSwatch mark={mark} />
                        {mark.name}
                    </li>
                ))}
            </ul>
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
        <div className="grid gap-2">
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
