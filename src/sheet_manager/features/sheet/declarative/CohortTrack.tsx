import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import { generateId } from '../../../../shared/utils/random';
import { ConfirmDialog } from '../../../components/dialogs/ConfirmDialog';
import {
    ConditionTrackLengthButtons,
    type ConditionTrackLengthControl,
    ConditionTrackStrip,
    ConditionTrackTable,
} from '../../../components/stat-fields/ConditionTrack';
import type { TrackBinding, TrackLevel } from '../../../systems/templateBindings';
import {
    readDataPath,
    trackLevelsFor,
    trackVariantLengths,
} from '../../../systems/templateBindings';
import type { ConditionMark } from '../../../types/character';
import type { PrimitiveNode } from '../../../types/template';
import type { BoundDocument } from './boundDocument';
import {
    hasMarks,
    isDefeated,
    memberPenalty,
    nextMemberLabel,
    shorteningHidesMarks,
    shortenMarks,
    toggleMark,
} from './cohort';

const messages = uiMessages.sheet.templates.cohort;
const trackMessages = uiMessages.sheet.tracks;
const fields = uiMessages.sheet.documents.fields;

const STORED_SLOTS = 7;
const EMPTY: ConditionMark[] = Array.from({ length: STORED_SLOTS }, () => 'empty');

type RawMember = Record<string, unknown> & { id: string; label?: string };

function levelLabel(level: TrackLevel): string {
    return level.translation ? translate(level.translation) : level.label;
}

function markSymbol(mark: ConditionMark): string {
    return mark === 'cross' ? '×' : mark === 'slash' ? '╱' : '';
}

type Pending =
    | { type: 'remove'; memberId: string; label: string }
    | { type: 'length'; length: number }
    | undefined;

/** One condition track per member of a group, pack, or squadron. */
export function CohortTrack({
    node,
    descriptor,
    bound,
}: {
    node: PrimitiveNode;
    descriptor: TrackBinding & { members: NonNullable<TrackBinding['members']> };
    bound: BoundDocument;
}) {
    const [pending, setPending] = useState<Pending>();
    const { trackKey } = descriptor.members;
    const maxMembers = node.cohort?.maxMembers ?? descriptor.members.maxMembers;
    const rawMembers = (
        Array.isArray(bound.data[descriptor.dataKey]) ? bound.data[descriptor.dataKey] : []
    ) as RawMember[];
    const marksOf = (member: RawMember): ConditionMark[] => {
        const levels = (member[trackKey] as { levels?: ConditionMark[] } | undefined)?.levels;
        return Array.isArray(levels) ? levels : EMPTY;
    };
    const storedLength = descriptor.variants
        ? readDataPath(bound.data, descriptor.variants.lengthPath)
        : undefined;
    const levels = trackLevelsFor(descriptor, storedLength);
    const visibleLength = levels.length;
    const disabled = bound.readOnly;
    const label = node.label ?? descriptor.label;

    const writeMembers = (next: RawMember[], extra: Record<string, unknown> = {}) =>
        bound.update({ [descriptor.dataKey]: next, ...extra });
    const setMarks = (memberId: string, marks: ConditionMark[]) =>
        writeMembers(
            rawMembers.map((member) =>
                member.id === memberId
                    ? { ...member, [trackKey]: { ...(member[trackKey] as object), levels: marks } }
                    : member
            )
        );
    const addMember = () => {
        if (rawMembers.length >= maxMembers) return;
        writeMembers([
            ...rawMembers,
            {
                id: generateId(),
                label: nextMemberLabel(rawMembers.map((member) => String(member.label ?? ''))),
                [trackKey]: { levels: [...EMPTY] },
            },
        ]);
    };
    const removeMember = (memberId: string) =>
        writeMembers(rawMembers.filter((member) => member.id !== memberId));
    const requestRemove = (member: RawMember) => {
        if (hasMarks(marksOf(member))) {
            setPending({ type: 'remove', memberId: member.id, label: String(member.label ?? '') });
        } else {
            removeMember(member.id);
        }
    };
    const applyLength = (length: number) => {
        const lengthKey = descriptor.variants?.lengthPath[0];
        if (!lengthKey) return;
        writeMembers(
            length < visibleLength
                ? rawMembers.map((member) => ({
                      ...member,
                      [trackKey]: {
                          ...(member[trackKey] as object),
                          levels: shortenMarks(marksOf(member), length),
                      },
                  }))
                : rawMembers,
            { [lengthKey]: length }
        );
    };
    const requestLength = (length: number) => {
        if (rawMembers.some((member) => shorteningHidesMarks(marksOf(member), length))) {
            setPending({ type: 'length', length });
        } else {
            applyLength(length);
        }
    };

    // Variant lengths are stepped through with the track's own −/+ regulator.
    const lengths = trackVariantLengths(descriptor);
    const lengthIndex = lengths.indexOf(visibleLength);
    const shorter = lengthIndex > 0 ? lengths[lengthIndex - 1] : undefined;
    const longer =
        lengthIndex >= 0 && lengthIndex < lengths.length - 1 ? lengths[lengthIndex + 1] : undefined;
    const lengthControl: ConditionTrackLengthControl | undefined =
        lengths.length > 1 && !node.compact
            ? {
                  onDecrease: shorter === undefined ? undefined : () => requestLength(shorter),
                  onIncrease: longer === undefined ? undefined : () => requestLength(longer),
                  decreaseLabel: translate(trackMessages.length.decrease, { track: label }),
                  increaseLabel: translate(trackMessages.length.increase, { track: label }),
              }
            : undefined;
    const lettered = rawMembers.length > 1;
    const atCap = rawMembers.length >= maxMembers;

    const controls = !disabled && (
        <div className="flex flex-wrap items-center gap-3">
            {lettered && lengthControl && (
                <ConditionTrackLengthButtons control={lengthControl} disabled={disabled} />
            )}
            <button
                type="button"
                onClick={addMember}
                disabled={atCap}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-bgBase disabled:opacity-40"
            >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {translate(messages.addMember)}
            </button>
            {atCap && (
                <span role="alert" className="text-xs text-textSecondary">
                    {translate(messages.maxMembersReached, { count: maxMembers })}
                </span>
            )}
        </div>
    );

    const removeButton = (member: RawMember) =>
        !disabled &&
        rawMembers.length > 1 && (
            <button
                type="button"
                onClick={() => requestRemove(member)}
                aria-label={translate(messages.removeMember, { label: String(member.label ?? '') })}
                className="rounded p-0.5 text-textSecondary hover:text-error"
            >
                <X className="h-3 w-3" aria-hidden="true" />
            </button>
        );

    const defeatedBadge = (member: RawMember) =>
        isDefeated(marksOf(member), visibleLength) && (
            <span className="rounded bg-error/15 px-1.5 text-[10px] font-semibold uppercase text-error">
                {translate(messages.defeated)}
            </span>
        );

    let body;
    if (node.compact) {
        body = (
            <div className="grid gap-1">
                {rawMembers.map((member) => {
                    const marks = marksOf(member);
                    return (
                        <div
                            key={member.id}
                            className="flex flex-wrap items-center gap-2"
                            data-defeated={isDefeated(marks, visibleLength) || undefined}
                        >
                            <ConditionTrackStrip
                                disabled={disabled}
                                label={lettered ? String(member.label ?? '') : label}
                                levels={levels.map((level) => ({
                                    id: level.id,
                                    label: levelLabel(level),
                                    penalty: level.penalty,
                                }))}
                                marks={marks.slice(0, visibleLength)}
                                onChange={(next) =>
                                    setMarks(member.id, [...next, ...marks.slice(visibleLength)])
                                }
                            />
                            {defeatedBadge(member)}
                            {removeButton(member)}
                        </div>
                    );
                })}
            </div>
        );
    } else if (!lettered && rawMembers[0]) {
        const member = rawMembers[0];
        const marks = marksOf(member);
        body = (
            <div className="grid gap-1">
                <ConditionTrackTable
                    disabled={disabled}
                    levels={levels.map((level) => ({
                        id: level.id,
                        label: levelLabel(level),
                        penalty: level.penalty,
                    }))}
                    marks={marks.slice(0, visibleLength)}
                    onChange={(next) =>
                        setMarks(member.id, [...next, ...marks.slice(visibleLength)])
                    }
                    lengthControl={lengthControl}
                    columnLabels={{
                        level: translate(fields.conditionLevel),
                        penalty: translate(fields.conditionPenalty),
                        mark: translate(fields.damage),
                    }}
                />
                {defeatedBadge(member)}
            </div>
        );
    } else {
        body = (
            <div className="overflow-x-auto">
                <table className="text-sm">
                    <thead>
                        <tr>
                            <th
                                scope="col"
                                className="px-2 py-1 text-left text-xs font-semibold text-textSecondary"
                            >
                                {translate(messages.level)}
                            </th>
                            <th
                                scope="col"
                                className="px-2 py-1 text-left text-xs font-semibold text-textSecondary"
                            >
                                {translate(messages.penalty)}
                            </th>
                            {rawMembers.map((member) => (
                                <th
                                    key={member.id}
                                    scope="col"
                                    className={clsx(
                                        'px-1 py-1 text-center text-xs font-semibold',
                                        isDefeated(marksOf(member), visibleLength)
                                            ? 'text-error line-through'
                                            : 'text-textPrimary'
                                    )}
                                    title={
                                        isDefeated(marksOf(member), visibleLength)
                                            ? translate(messages.defeated)
                                            : undefined
                                    }
                                >
                                    <span className="inline-flex items-center gap-0.5">
                                        {String(member.label ?? '')}
                                        {removeButton(member)}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {levels.map((level, levelIndex) => (
                            <tr key={level.id}>
                                <td className="px-2 py-1 text-textPrimary">{levelLabel(level)}</td>
                                <td className="px-2 py-1 font-mono text-textSecondary">
                                    {level.penalty ?? ''}
                                </td>
                                {rawMembers.map((member) => {
                                    const marks = marksOf(member);
                                    const mark = marks[levelIndex] ?? 'empty';
                                    return (
                                        <td key={member.id} className="px-1 py-1 text-center">
                                            <button
                                                type="button"
                                                disabled={disabled}
                                                onClick={() =>
                                                    setMarks(
                                                        member.id,
                                                        toggleMark(marks, levelIndex)
                                                    )
                                                }
                                                aria-label={`${translate(messages.member, {
                                                    label: String(member.label ?? ''),
                                                })} — ${levelLabel(level)}: ${mark}`}
                                                className={clsx(
                                                    'grid h-7 w-7 place-items-center rounded border-2 font-mono text-sm font-bold disabled:opacity-70',
                                                    mark === 'cross'
                                                        ? 'border-error bg-error text-white'
                                                        : mark === 'slash'
                                                          ? 'border-secondary bg-secondary text-white'
                                                          : 'border-border bg-bgBase hover:border-primary'
                                                )}
                                            >
                                                {markSymbol(mark)}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        <tr>
                            <td className="px-2 py-1 text-xs text-textSecondary" colSpan={2}>
                                {translate(messages.penalty)}
                            </td>
                            {rawMembers.map((member) => (
                                <td
                                    key={member.id}
                                    className="px-1 py-1 text-center font-mono text-xs text-textSecondary"
                                >
                                    {memberPenalty(
                                        marksOf(member),
                                        levels.map((level) => level.penalty)
                                    ) || ''}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="grid gap-2">
            {!node.hideLabel && !node.compact && (
                <span className="text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    {label}
                </span>
            )}
            {body}
            {controls}
            <ConfirmDialog
                open={pending !== undefined}
                onOpenChange={(open) => {
                    if (!open) setPending(undefined);
                }}
                onConfirm={() => {
                    if (pending?.type === 'remove') removeMember(pending.memberId);
                    if (pending?.type === 'length') applyLength(pending.length);
                    setPending(undefined);
                }}
                title={translate(
                    pending?.type === 'length' ? messages.shortenTitle : messages.removeTitle
                )}
                description={
                    pending?.type === 'length'
                        ? translate(messages.shortenDescription)
                        : translate(messages.removeDescription, {
                              label: pending?.type === 'remove' ? pending.label : '',
                          })
                }
                confirmLabel={translate(messages.confirm)}
                cancelLabel={translate(messages.cancel)}
                variant="danger"
            />
        </div>
    );
}
