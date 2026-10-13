import { NumberInput } from '@site/src/shared/components/NumberInput';
import { X } from 'lucide-react';

import type { TrackerColumn } from '../../../../types/template';
import { TEMPLATE_LIMITS } from '../../../../types/template';
import { newTrackerColumn } from '../../../sheet/data/trackerDefaults';
import { ToggleRow } from '../LayoutControls';
import { AddButton, Group, iconButton, inputClasses, t, text } from './controls';
import type { TrackerSettingsChange, TrackerSettingsGame, TrackerSettingsValue } from './types';

export function ColumnsGroup({
    value,
    onChange,
    game,
}: {
    value: TrackerSettingsValue;
    onChange: TrackerSettingsChange;
    game?: TrackerSettingsGame;
}) {
    const locked = game !== undefined;
    const setColumn = (index: number, patch: Partial<TrackerColumn>) =>
        onChange({
            columns: value.columns.map((column, i) =>
                i === index ? { ...column, ...patch } : column
            ),
        });
    const marksColumns = value.columns.filter(({ kind }) => kind === 'marks').length;
    return (
        <Group title={t(text.columns)} hint={locked ? t(text.columnsBuiltInHint) : undefined}>
            {game && (
                <div className="rounded-sm border border-border bg-bgBase px-2 py-1.5 text-xs text-textSecondary">
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
                        className="grid min-w-0 gap-1.5 rounded-sm border border-border bg-bgBase p-2"
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
    );
}
