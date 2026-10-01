import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { NumberInput } from '@site/src/shared/components/NumberInput';
import { clsx } from 'clsx';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';

import {
    markSet,
    type MarkSetId,
    newTrackerColumn,
    newTrackerId,
} from '../../../features/sheet/data/trackerDefaults';
import type {
    TrackerColumn,
    TrackerDisplay,
    TrackerLength,
    TrackerLevel,
    TrackerMarkKind,
    TrackerTotalReads,
    TrackerValueColumn,
} from '../../../types/template';
import {
    TEMPLATE_LIMITS,
    TRACKER_DISPLAYS,
    TRACKER_LAYERS,
    TRACKER_PALETTE_FILLS,
    TRACKER_TOTAL_READS,
} from '../../../types/template';
import { MarkSwatch } from '../../stat-fields/Tracker';
import { ToggleRow } from './LayoutControls';

const text = uiMessages.sheet.templates.tracker;
const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
    translate(descriptor, values);

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60';
const iconButton =
    'grid h-6 w-6 shrink-0 place-items-center rounded border border-border text-textSecondary hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-border disabled:hover:text-textSecondary';

/** What the author sets; own trackers store it, built-in ones map it onto their override. */
export interface TrackerSettingsValue {
    display: TrackerDisplay;
    marks: TrackerMarkKind[];
    levels: TrackerLevel[];
    valueColumn: TrackerValueColumn;
    columns: TrackerColumn[];
    total: boolean;
    lengths: TrackerLength[];
    out: boolean;
    legend: boolean;
    /** Own trackers only (spec 020). */
    fromStart?: boolean;
    fillInside?: boolean;
    totalReads?: TrackerTotalReads;
}

/** A built-in tracker: the game fixes counts and order; its own text shows as placeholders. */
export interface TrackerSettingsGame {
    levels: readonly { name: string; value: string }[];
    marks: readonly { name: string; symbol: string }[];
    /** Title of the game's marks column, shown locked before the extra columns. */
    marksColumn: string;
    /** Level count set by an older page (legacy `track`), with the action that drops it. */
    legacyLevels?: { onUseGame: () => void };
}

const DISPLAY_LABEL: Record<TrackerDisplay, { message: string }> = {
    table: text.displayTable,
    strip: text.displayStrip,
    line: text.displayLine,
};

const COLOR_LABEL = {
    secondary: text.colorSecondary,
    error: text.colorError,
    tertiary: text.colorTertiary,
    success: text.colorSuccess,
    text: text.colorText,
    primary: text.colorPrimary,
} as const;

/** A mark's color: the palette (theme colors) or an own color. */
export function MarkColorPicker({
    fill,
    name,
    onChange,
}: {
    fill: string;
    name: string;
    onChange: (fill: string) => void;
}) {
    return (
        <span
            role="group"
            aria-label={t(text.markColors, { name })}
            className="flex items-center gap-2.5 px-1"
        >
            {TRACKER_PALETTE_FILLS.map((palette) => (
                <button
                    key={palette}
                    type="button"
                    aria-pressed={fill === palette}
                    aria-label={t(COLOR_LABEL[palette])}
                    title={t(COLOR_LABEL[palette])}
                    onClick={() => onChange(palette)}
                    className={clsx(
                        // The picked color gets a bright frame with a gap, as the brush does.
                        'grid h-3.5 w-3.5 place-items-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                        fill === palette && 'outline outline-2 outline-offset-2 outline-textPrimary'
                    )}
                >
                    <MarkSwatch mark={{ fill: palette, symbol: '' }} size="xs" />
                </button>
            ))}
            <input
                type="color"
                value={fill.startsWith('#') ? fill : '#0e7490'}
                aria-label={t(text.markOwnColor, { name })}
                title={t(text.markOwnColor, { name })}
                onChange={(event) => onChange(event.target.value.toLowerCase())}
                className={clsx(
                    'h-6 w-7 cursor-pointer rounded border border-border bg-transparent p-0',
                    fill.startsWith('#') && 'outline outline-2 outline-offset-2 outline-textPrimary'
                )}
            />
        </span>
    );
}

function move<T>(list: readonly T[], index: number, step: -1 | 1): T[] {
    const next = [...list];
    const target = index + step;
    if (target < 0 || target >= next.length) return next;
    [next[index], next[target]] = [next[target]!, next[index]!];
    return next;
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
    return (
        <fieldset className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 border-0 border-t border-border p-0 pt-3">
            <legend className="text-xs font-semibold text-textPrimary">{title}</legend>
            {hint && <p className="m-0 text-[11px] text-textSecondary">{hint}</p>}
            {children}
        </fieldset>
    );
}

function RowButtons({
    index,
    count,
    locked,
    labels,
    onMove,
    onRemove,
}: {
    index: number;
    count: number;
    locked: boolean;
    labels: { up: string; down: string; remove: string };
    onMove: (step: -1 | 1) => void;
    onRemove: () => void;
}) {
    return (
        <span className="flex items-center gap-0.5">
            <button
                type="button"
                aria-label={labels.up}
                title={labels.up}
                disabled={locked || index === 0}
                onClick={() => onMove(-1)}
                className={iconButton}
            >
                <ArrowUp className="h-3 w-3" aria-hidden="true" />
            </button>
            <button
                type="button"
                aria-label={labels.down}
                title={labels.down}
                disabled={locked || index === count - 1}
                onClick={() => onMove(1)}
                className={iconButton}
            >
                <ArrowDown className="h-3 w-3" aria-hidden="true" />
            </button>
            <button
                type="button"
                aria-label={labels.remove}
                title={labels.remove}
                disabled={locked || count === 1}
                onClick={onRemove}
                className={iconButton}
            >
                <X className="h-3 w-3" aria-hidden="true" />
            </button>
        </span>
    );
}

function AddButton({
    label,
    disabled,
    onClick,
}: {
    label: string;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="flex items-center gap-1 justify-self-start rounded px-2 py-1 text-xs text-primary hover:bg-bgBase disabled:opacity-40"
        >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
        </button>
    );
}

/**
 * Tracker settings (spec 018, contract "Editor: settings groups"), the same for own and built-in
 * trackers; with `game`, the parts the game fixes are disabled and its text shows as placeholders.
 */
export function TrackerSettings({
    value,
    onChange,
    game,
}: {
    value: TrackerSettingsValue;
    onChange: (next: Partial<TrackerSettingsValue>) => void;
    game?: TrackerSettingsGame;
}) {
    const locked = game !== undefined;
    const setMark = (index: number, patch: Partial<TrackerMarkKind>) =>
        onChange({
            marks: value.marks.map((mark, i) => (i === index ? { ...mark, ...patch } : mark)),
        });
    const setLevel = (index: number, patch: Partial<TrackerLevel>) =>
        onChange({
            levels: value.levels.map((level, i) => (i === index ? { ...level, ...patch } : level)),
        });
    const setColumn = (index: number, patch: Partial<TrackerColumn>) =>
        onChange({
            columns: value.columns.map((column, i) =>
                i === index ? { ...column, ...patch } : column
            ),
        });
    const marksColumns = value.columns.filter(({ kind }) => kind === 'marks').length;
    const valueTitle = value.valueColumn.title || t(text.defaultValueTitle);

    return (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3" data-tracker-settings="">
            <Group title={t(text.display)} hint={t(text.displayHint)}>
                <div role="group" aria-label={t(text.display)} className="flex flex-wrap gap-1">
                    {TRACKER_DISPLAYS.map((display) => (
                        <button
                            key={display}
                            type="button"
                            aria-pressed={value.display === display}
                            onClick={() => onChange({ display })}
                            className={clsx(
                                'rounded border px-2.5 py-1 text-xs transition-colors',
                                value.display === display
                                    ? 'border-primary bg-primary-muted text-textPrimary'
                                    : 'border-border text-textSecondary hover:border-primary/60'
                            )}
                        >
                            {t(DISPLAY_LABEL[display])}
                        </button>
                    ))}
                </div>
            </Group>

            <Group title={t(text.marks)} hint={t(locked ? text.marksBuiltIn : text.marksHint)}>
                {!locked && (
                    <select
                        value=""
                        aria-label={t(text.startFrom)}
                        onChange={(event) => {
                            const set = event.target.value as MarkSetId | '';
                            if (!set) return;
                            // Points read as a pool: runs from the start, counted.
                            onChange(
                                set === 'points'
                                    ? { marks: markSet(set), fromStart: true, totalReads: 'count' }
                                    : { marks: markSet(set) }
                            );
                        }}
                        className={`${inputClasses} max-w-full justify-self-start`}
                    >
                        <option value="">{t(text.startFrom)}</option>
                        <option value="one">{t(text.setOne)}</option>
                        <option value="two">{t(text.setTwo)}</option>
                        <option value="three">{t(text.setThree)}</option>
                        <option value="points">{t(text.setPoints)}</option>
                    </select>
                )}
                {locked && (
                    <p className="m-0 text-[11px] text-textSecondary">{t(text.layerLocked)}</p>
                )}
                {value.marks.map((mark, index) => {
                    const n = index + 1;
                    const placeholder = game?.marks[index];
                    const shown = {
                        ...mark,
                        symbol: mark.symbol || placeholder?.symbol || '',
                    };
                    const name = mark.name || placeholder?.name || t(text.newMark, { n });
                    return (
                        <div key={mark.id} className="flex flex-wrap items-center gap-1.5">
                            <MarkSwatch mark={shown} />
                            <input
                                value={mark.name}
                                placeholder={placeholder?.name}
                                maxLength={TEMPLATE_LIMITS.trackerNameMax}
                                aria-label={t(text.markName, { n })}
                                onChange={(event) => setMark(index, { name: event.target.value })}
                                className={`${inputClasses} min-w-0 flex-[1_1_7rem]`}
                            />
                            <input
                                value={mark.symbol}
                                placeholder={placeholder?.symbol}
                                aria-label={t(text.markSymbol, { n })}
                                onChange={(event) =>
                                    setMark(index, {
                                        symbol: Array.from(event.target.value)
                                            .slice(0, TEMPLATE_LIMITS.trackerSymbolMax)
                                            .join(''),
                                    })
                                }
                                className={`${inputClasses} w-11 text-center font-mono font-bold`}
                            />
                            <MarkColorPicker
                                fill={mark.fill}
                                name={name}
                                onChange={(fill) => setMark(index, { fill })}
                            />
                            <span
                                role="group"
                                aria-label={t(text.markLayer, { n })}
                                className="flex items-center gap-1"
                            >
                                {TRACKER_LAYERS.map((layer) => (
                                    <button
                                        key={layer}
                                        type="button"
                                        aria-pressed={mark.layer === layer}
                                        disabled={locked}
                                        onClick={() => setMark(index, { layer })}
                                        className={clsx(
                                            'rounded border px-1.5 py-0.5 text-[11px] transition-colors disabled:opacity-60',
                                            mark.layer === layer
                                                ? 'border-primary bg-primary-muted text-textPrimary'
                                                : 'border-border text-textSecondary hover:border-primary/60'
                                        )}
                                    >
                                        {t(layer === 'fill' ? text.layerFill : text.layerOutline)}
                                    </button>
                                ))}
                            </span>
                            <RowButtons
                                index={index}
                                count={value.marks.length}
                                locked={locked}
                                labels={{
                                    up: t(text.moveMarkUp, { n }),
                                    down: t(text.moveMarkDown, { n }),
                                    remove: t(text.removeMark, { n }),
                                }}
                                onMove={(step) =>
                                    onChange({ marks: move(value.marks, index, step) })
                                }
                                onRemove={() =>
                                    onChange({ marks: value.marks.filter((_, i) => i !== index) })
                                }
                            />
                        </div>
                    );
                })}
                {!locked && (
                    <AddButton
                        label={t(text.addMark)}
                        disabled={value.marks.length >= TEMPLATE_LIMITS.trackerMarksMax}
                        onClick={() =>
                            onChange({
                                marks: [
                                    ...value.marks,
                                    {
                                        id: newTrackerId('mk'),
                                        name: t(text.newMark, { n: value.marks.length + 1 }),
                                        symbol: '•',
                                        fill: 'text',
                                        layer: 'fill',
                                    },
                                ],
                            })
                        }
                    />
                )}
            </Group>

            <Group title={t(text.levels)} hint={locked ? t(text.levelsBuiltIn) : undefined}>
                {!locked && (
                    <span className="text-[11px] text-textSecondary">
                        {t(text.levelCount, {
                            count: value.levels.length,
                            max: TEMPLATE_LIMITS.trackerLevelsMax,
                        })}
                    </span>
                )}
                {game?.legacyLevels && (
                    <p className="m-0 flex flex-wrap items-center gap-2 text-[11px] text-textSecondary">
                        {t(text.levelsLegacy)}
                        <button
                            type="button"
                            onClick={game.legacyLevels.onUseGame}
                            className="rounded border border-border px-2 py-0.5 text-xs text-primary hover:border-primary"
                        >
                            {t(text.levelsUseGame)}
                        </button>
                    </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        value={value.valueColumn.title ?? ''}
                        placeholder={t(text.defaultValueTitle)}
                        maxLength={TEMPLATE_LIMITS.trackerNameMax}
                        aria-label={t(text.valueTitle)}
                        onChange={(event) =>
                            onChange({
                                valueColumn: {
                                    ...value.valueColumn,
                                    title: event.target.value || undefined,
                                },
                            })
                        }
                        className={`${inputClasses} min-w-0 flex-[1_1_8rem]`}
                    />
                    <ToggleRow
                        checked={value.valueColumn.show}
                        label={t(text.valueShow)}
                        onChange={(show) =>
                            onChange({ valueColumn: { ...value.valueColumn, show } })
                        }
                    />
                </div>
                {value.levels.map((level, index) => {
                    const n = index + 1;
                    const placeholder = game?.levels[index];
                    return (
                        <div key={level.id} className="flex items-center gap-1.5">
                            <span className="w-4 shrink-0 text-right font-mono text-xs text-textSecondary">
                                {n}
                            </span>
                            <input
                                value={level.name}
                                placeholder={placeholder?.name}
                                maxLength={TEMPLATE_LIMITS.trackerNameMax}
                                aria-label={t(text.levelName, { n })}
                                onChange={(event) => setLevel(index, { name: event.target.value })}
                                className={`${inputClasses} min-w-0 flex-1`}
                            />
                            <input
                                value={level.value}
                                placeholder={placeholder?.value || '—'}
                                maxLength={TEMPLATE_LIMITS.trackerLevelValueMax}
                                disabled={!value.valueColumn.show}
                                aria-label={t(text.levelValue, { n })}
                                onChange={(event) => setLevel(index, { value: event.target.value })}
                                className={`${inputClasses} w-14 shrink-0 font-mono`}
                            />
                            <RowButtons
                                index={index}
                                count={value.levels.length}
                                locked={locked}
                                labels={{
                                    up: t(text.moveLevelUp, { n }),
                                    down: t(text.moveLevelDown, { n }),
                                    remove: t(text.removeLevel, { n }),
                                }}
                                onMove={(step) =>
                                    onChange({ levels: move(value.levels, index, step) })
                                }
                                onRemove={() =>
                                    onChange({
                                        levels: value.levels.filter((_, i) => i !== index),
                                        // A length never keeps a removed level.
                                        lengths: value.lengths.map((length) => ({
                                            levels: length.levels.filter((id) => id !== level.id),
                                        })),
                                    })
                                }
                            />
                        </div>
                    );
                })}
                {!locked && (
                    <AddButton
                        label={t(text.addLevel)}
                        disabled={value.levels.length >= TEMPLATE_LIMITS.trackerLevelsMax}
                        onClick={() =>
                            onChange({
                                levels: [
                                    ...value.levels,
                                    {
                                        id: newTrackerId('lv'),
                                        name: t(text.newLevel, { n: value.levels.length + 1 }),
                                        value: '',
                                    },
                                ],
                            })
                        }
                    />
                )}
            </Group>

            <Group title={t(text.columns)} hint={locked ? t(text.columnsBuiltInHint) : undefined}>
                {game && (
                    <div className="rounded border border-border bg-bgBase px-2 py-1.5 text-xs text-textSecondary">
                        <strong className="text-textPrimary">{t(text.columnBuiltIn)}</strong>
                        {game.marksColumn ? ` · ${game.marksColumn}` : ''}
                    </div>
                )}
                {value.columns.map((column, index) => {
                    const n = index + 1;
                    const lastMarks = !locked && column.kind === 'marks' && marksColumns === 1;
                    return (
                        <div
                            key={column.id}
                            className="grid min-w-0 gap-1.5 rounded border border-border bg-bgBase p-2"
                        >
                            <div className="flex flex-wrap items-center gap-1.5">
                                <strong className="text-xs text-textPrimary">
                                    {t(text.column, { n })}
                                </strong>
                                <select
                                    value={column.kind}
                                    aria-label={t(text.columnKind)}
                                    disabled={lastMarks}
                                    onChange={(event) =>
                                        setColumn(index, {
                                            kind: event.target.value as TrackerColumn['kind'],
                                        })
                                    }
                                    className={inputClasses}
                                >
                                    <option value="marks">{t(text.columnMarks)}</option>
                                    <option value="text">{t(text.columnText)}</option>
                                </select>
                                <input
                                    value={column.title}
                                    maxLength={TEMPLATE_LIMITS.trackerNameMax}
                                    aria-label={t(text.columnTitle)}
                                    onChange={(event) =>
                                        setColumn(index, { title: event.target.value })
                                    }
                                    className={`${inputClasses} min-w-0 flex-[1_1_7rem]`}
                                />
                                <button
                                    type="button"
                                    aria-label={t(text.removeColumn, { n })}
                                    title={t(text.removeColumn, { n })}
                                    disabled={lastMarks}
                                    onClick={() =>
                                        onChange({
                                            columns: value.columns.filter((_, i) => i !== index),
                                        })
                                    }
                                    className={iconButton}
                                >
                                    <X className="h-3 w-3" aria-hidden="true" />
                                </button>
                            </div>
                            <label className="flex flex-wrap items-center gap-2 text-xs text-textSecondary">
                                {t(text.covers)}
                                <select
                                    value={column.covers ?? 0}
                                    onChange={(event) => {
                                        const covers = Number(event.target.value);
                                        const next = { ...column };
                                        if (covers > 0) next.covers = covers;
                                        else delete next.covers;
                                        onChange({
                                            columns: value.columns.map((c, i) =>
                                                i === index ? next : c
                                            ),
                                        });
                                    }}
                                    className={`${inputClasses} min-w-0 max-w-full`}
                                >
                                    <option value={0}>{t(text.coversAll)}</option>
                                    {value.levels.slice(0, -1).map((_, i) => (
                                        <option key={i} value={i + 1}>
                                            {t(text.coversFirst, { n: i + 1 })}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div className="flex flex-wrap items-center gap-2">
                                <ToggleRow
                                    checked={column.copies !== undefined}
                                    label={t(text.copies)}
                                    onChange={(checked) => {
                                        const next = { ...column };
                                        if (checked) next.copies = { max: 12 };
                                        else delete next.copies;
                                        onChange({
                                            columns: value.columns.map((c, i) =>
                                                i === index ? next : c
                                            ),
                                        });
                                    }}
                                />
                                {column.copies && (
                                    <label className="flex items-center gap-1 text-xs text-textSecondary">
                                        {t(text.copiesMax)}
                                        <NumberInput
                                            value={column.copies.max}
                                            min={1}
                                            max={TEMPLATE_LIMITS.trackerCopiesMax}
                                            step={1}
                                            optional={false}
                                            label={t(text.copiesMaxLabel)}
                                            onChange={(max) =>
                                                setColumn(index, { copies: { max: max ?? 1 } })
                                            }
                                            className={`${inputClasses} w-14`}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div className="flex flex-wrap gap-1">
                    {(['marks', 'text'] as const).map((kind) => (
                        <AddButton
                            key={kind}
                            label={t(kind === 'marks' ? text.addMarksColumn : text.addTextColumn)}
                            disabled={value.columns.length >= TEMPLATE_LIMITS.trackerColumnsMax}
                            onClick={() =>
                                onChange({ columns: [...value.columns, newTrackerColumn(kind)] })
                            }
                        />
                    ))}
                </div>
            </Group>

            {!locked && <LengthSettings value={value} onChange={onChange} />}

            <Group title={t(text.reading)}>
                {!locked && (
                    <ToggleRow
                        checked={value.fromStart ?? false}
                        hint={t(text.fromStartHint)}
                        label={t(text.fromStart)}
                        onChange={(fromStart) => onChange({ fromStart })}
                    />
                )}
                {!locked && value.fromStart && (
                    <ToggleRow
                        checked={value.fillInside ?? false}
                        hint={t(text.fillInsideHint)}
                        label={t(text.fillInside)}
                        onChange={(fillInside) => onChange({ fillInside })}
                    />
                )}
                <ToggleRow
                    checked={value.total}
                    label={locked ? t(text.total, { value: valueTitle }) : t(text.totalRow)}
                    onChange={(total) => onChange({ total })}
                />
                {!locked && value.total && (
                    <div className="grid gap-1 pl-5">
                        <div
                            role="group"
                            aria-label={t(text.totalReads)}
                            className="flex flex-wrap items-center gap-1 text-xs text-textSecondary"
                        >
                            <span>{t(text.totalReads)}</span>
                            {TRACKER_TOTAL_READS.map((reads) => (
                                <button
                                    key={reads}
                                    type="button"
                                    aria-pressed={(value.totalReads ?? 'deepest') === reads}
                                    onClick={() => onChange({ totalReads: reads })}
                                    className={clsx(
                                        'rounded border px-2 py-0.5 text-xs transition-colors',
                                        (value.totalReads ?? 'deepest') === reads
                                            ? 'border-primary bg-primary-muted text-textPrimary'
                                            : 'border-border text-textSecondary hover:border-primary/60'
                                    )}
                                >
                                    {reads === 'count'
                                        ? t(text.totalCount)
                                        : `${t(text.totalDeepest)} (${valueTitle})`}
                                </button>
                            ))}
                        </div>
                        {value.totalReads === 'count' && (
                            <p className="text-[11px] text-textSecondary">
                                {t(text.totalCountHint)}
                            </p>
                        )}
                    </div>
                )}
                {!locked && (
                    <ToggleRow
                        checked={value.out}
                        label={t(text.out)}
                        onChange={(out) => onChange({ out })}
                    />
                )}
                <ToggleRow
                    checked={value.legend}
                    hint={t(text.legendHint)}
                    label={t(text.legend)}
                    onChange={(legend) => onChange({ legend })}
                />
            </Group>
        </div>
    );
}

function LengthSettings({
    value,
    onChange,
}: {
    value: TrackerSettingsValue;
    onChange: (next: Partial<TrackerSettingsValue>) => void;
}) {
    const enabled = value.lengths.length > 0;
    const allLevels = () => ({ levels: value.levels.map(({ id }) => id) });
    const toggle = (lengthIndex: number, levelId: string, checked: boolean) =>
        onChange({
            lengths: value.lengths.map((length, i) =>
                i !== lengthIndex
                    ? length
                    : {
                          levels: checked
                              ? [...length.levels, levelId]
                              : length.levels.filter((id) => id !== levelId),
                      }
            ),
        });
    return (
        <Group title={t(text.lengths)} hint={t(text.lengthsHint)}>
            <ToggleRow
                checked={enabled}
                label={t(text.lengths)}
                onChange={(checked) => onChange({ lengths: checked ? [allLevels()] : [] })}
            />
            {enabled && (
                <>
                    <div className="overflow-x-auto">
                        <div
                            role="table"
                            className="grid w-max gap-x-2 gap-y-1 text-xs text-textSecondary"
                            style={{
                                gridTemplateColumns: `minmax(6rem,auto) repeat(${value.lengths.length}, auto)`,
                            }}
                        >
                            <div role="row" className="contents">
                                <span role="columnheader" />
                                {value.lengths.map((_, i) => (
                                    <span
                                        key={i}
                                        role="columnheader"
                                        className="flex items-center gap-0.5 font-semibold"
                                    >
                                        {t(text.lengthColumn, { n: i + 1 })}
                                        <button
                                            type="button"
                                            aria-label={t(text.removeLength, { n: i + 1 })}
                                            title={t(text.removeLength, { n: i + 1 })}
                                            disabled={value.lengths.length === 1}
                                            onClick={() =>
                                                onChange({
                                                    lengths: value.lengths.filter(
                                                        (_, j) => j !== i
                                                    ),
                                                })
                                            }
                                            className="rounded p-0.5 hover:text-error disabled:opacity-30"
                                        >
                                            <X className="h-3 w-3" aria-hidden="true" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            {value.levels.map((level) => (
                                <div role="row" key={level.id} className="contents">
                                    <span role="rowheader" className="text-textPrimary">
                                        {level.name}
                                    </span>
                                    {value.lengths.map((length, i) => (
                                        <span role="cell" key={i} className="text-center">
                                            <input
                                                type="checkbox"
                                                checked={length.levels.includes(level.id)}
                                                aria-label={t(text.lengthLevel, {
                                                    level: level.name,
                                                    n: i + 1,
                                                })}
                                                onChange={(event) =>
                                                    toggle(i, level.id, event.target.checked)
                                                }
                                            />
                                        </span>
                                    ))}
                                </div>
                            ))}
                            <div role="row" className="contents">
                                <span role="rowheader">{t(text.lengthShows)}</span>
                                {value.lengths.map((length, i) => (
                                    <span role="cell" key={i} className="text-center font-mono">
                                        {
                                            length.levels.filter((id) =>
                                                value.levels.some((level) => level.id === id)
                                            ).length
                                        }
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <AddButton
                        label={t(text.addLength)}
                        disabled={value.lengths.length >= TEMPLATE_LIMITS.trackerLengthsMax}
                        onClick={() => onChange({ lengths: [...value.lengths, allLevels()] })}
                    />
                </>
            )}
        </Group>
    );
}
