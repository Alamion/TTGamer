import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useEffect, useMemo } from 'react';

import { generateId } from '../../../../shared/utils/random';
import { Tracker, type TrackerWording } from '../../../components/stat-fields/Tracker';
import { reportSheetIssue } from '../../../diagnostics';
import {
    readBoundNumber,
    readDataPath,
    TRACK_MARK_IDS,
    type TrackBinding,
    trackBoxes,
    trackLevelsFor,
    trackVariantLengths,
} from '../../../systems/templateBindings';
import type { ConditionMark } from '../../../types/character';
import type { PrimitiveNode, TrackerField } from '../../../types/template';
import { type TrackerValue, TrackerValueSchema } from '../../../types/templateValues';
import {
    type BuiltInCopy,
    builtInLevels,
    builtInMarks,
    builtInTrackerModel,
    countHiddenExtraValues,
    GAME_COLUMN_ID,
    paintTrackerMark,
    setTrackerText,
    toggleTrackerMark,
    type TrackerClick,
    trackerDisplayOf,
} from '../data/trackerModel';
import type { BoundDocument } from './boundDocument';
import {
    nextMemberLabel,
    paintMark,
    shorteningHidesMarks,
    shortenMarks,
    toggleMark,
} from './cohort';
import { mergeVisibleMarks, resolveComputedTrackLength, visibleMarks } from './trackLength';

const cohort = uiMessages.sheet.templates.cohort;
const tracks = uiMessages.sheet.tracks;
const fields = uiMessages.sheet.documents.fields;

const STORED_SLOTS = 7;
const EMPTY: ConditionMark[] = Array.from({ length: STORED_SLOTS }, () => 'empty');

type RawMember = Record<string, unknown> & { id: string; label?: string };
type TrackRecord = { levels?: ConditionMark[] } & Record<string, unknown>;

/** The page's side of a built-in tracker: where its extra columns keep their values. */
export interface TrackerPageAccess {
    values: Readonly<Record<string, unknown>>;
    setValue: (key: string, value: unknown) => void;
    previewSource: boolean;
}

/**
 * A built-in track (spec 018, R4): the game's levels, marks, and members, drawn by the shared
 * tracker with the page's display, level text, mark look, extra columns, and total. Marks stay
 * in the document's own data; extra columns keep their values in the page.
 */
export function BuiltInTracker({
    node,
    descriptor,
    bound,
    systemId,
    documentKind,
    page,
}: {
    node: PrimitiveNode;
    descriptor: TrackBinding;
    bound: BoundDocument;
    systemId: string;
    documentKind: string;
    page?: TrackerPageAccess;
}) {
    const label = node.label ?? descriptor.label;
    const readOnly = bound.readOnly;
    const settings = node.tracker;
    const extraColumns = useMemo(() => settings?.columns ?? [], [settings?.columns]);
    const extrasKey = settings?.valueKey ?? node.id;
    const parsedExtras = TrackerValueSchema.safeParse(page?.values[extrasKey]);
    const extrasValue: TrackerValue | undefined = parsedExtras.success
        ? parsedExtras.data
        : undefined;
    const hiddenExtras = countHiddenExtraValues(extraColumns, extrasValue);
    const extrasUnreadable = page?.values[extrasKey] !== undefined && !parsedExtras.success;
    const reportsHidden = page !== undefined && !page.previewSource;
    useEffect(() => {
        if (!reportsHidden) return;
        if (extrasUnreadable) {
            reportSheetIssue({
                code: 'template-value-unreadable',
                message: 'The stored values of a tracker’s extra columns have an unknown shape',
                details: { nodeId: node.id },
            });
        } else if (hiddenExtras > 0) {
            reportSheetIssue({
                code: 'template-value-hidden',
                message: 'Stored values belong to tracker columns the page no longer has',
                details: { nodeId: node.id, count: hiddenExtras },
            });
        }
    }, [reportsHidden, extrasUnreadable, hiddenExtras, node.id]);

    const members = descriptor.members;
    const rawMembers: RawMember[] = members
        ? ((Array.isArray(bound.data[descriptor.dataKey])
              ? bound.data[descriptor.dataKey]
              : []) as RawMember[])
        : [];
    const track = members ? undefined : (bound.data[descriptor.dataKey] as TrackRecord);
    const marksOf = (member: RawMember): ConditionMark[] => {
        const levels = (member[members!.trackKey] as { levels?: ConditionMark[] } | undefined)
            ?.levels;
        return Array.isArray(levels) ? levels : EMPTY;
    };

    // Visible levels: variants (fodder lengths), a computed length (V5), or the game's levels.
    const computed = descriptor.length
        ? resolveComputedTrackLength(descriptor.length, track, (path) => {
              const read = readBoundNumber(systemId, documentKind, bound.data, path);
              return read.bound ? read.value : undefined;
          })
        : undefined;
    useEffect(() => {
        if (!computed?.failed) return;
        reportSheetIssue({
            code: 'formula-error',
            message: 'Track length formula could not be evaluated',
            details: { bindingKey: descriptor.key, formula: descriptor.length?.from },
        });
    }, [computed?.failed, descriptor.key, descriptor.length?.from]);
    const storedLength = descriptor.variants
        ? readDataPath(bound.data, descriptor.variants.lengthPath)
        : undefined;
    const gameLevels = computed
        ? trackBoxes(computed.length).map((level) => ({
              id: level.id,
              name: `${label} ${level.label}`,
              penalty: null,
          }))
        : (members
              ? trackLevelsFor(descriptor, storedLength)
              : (track?.levels ?? []).map(
                    (_, index) =>
                        descriptor.levels[Math.min(index, descriptor.levels.length - 1)] ?? {
                            id: `level-${index}`,
                            label: String(index),
                            penalty: null,
                        }
                )
          ).map((level) => ({
              id: level.id,
              name: level.translation ? translate(level.translation) : level.label,
              penalty: level.penalty,
          }));
    const levels = builtInLevels(gameLevels, node);
    const gameMarks = (
        descriptor.marks ??
        TRACK_MARK_IDS.map((id) => ({
            id,
            label: translate(tracks.tracker[id]),
            translation: undefined,
        }))
    ).map((mark) => ({
        id: mark.id,
        name: mark.translation ? translate(mark.translation) : mark.label,
    }));
    const marks = builtInMarks(gameMarks, node);

    const copies: BuiltInCopy[] = members
        ? rawMembers.map((member) => ({
              id: member.id,
              label: String(member.label ?? ''),
              marks: marksOf(member).slice(0, levels.length),
          }))
        : [
              {
                  id: 'track',
                  marks: computed
                      ? visibleMarks(track?.levels, computed.length)
                      : (track?.levels ?? []),
              },
          ];

    // Member variants step between neighbouring lengths; a computed track steps its adjustment.
    const lengths = trackVariantLengths(descriptor);
    const lengthIndex = lengths.indexOf(levels.length);
    const variantStep = (step: -1 | 1) =>
        lengthIndex >= 0 ? lengths[lengthIndex + step] : undefined;
    const length = computed
        ? {
              shown: computed.length,
              canShorten: !readOnly && computed.shorter !== undefined,
              canLengthen: !readOnly && computed.longer !== undefined,
          }
        : lengths.length > 1
          ? {
                shown: levels.length,
                canShorten: !readOnly && variantStep(-1) !== undefined,
                canLengthen: !readOnly && variantStep(1) !== undefined,
            }
          : undefined;
    const maxMembers = node.cohort?.maxMembers ?? members?.maxMembers ?? 0;
    const hasPenalties = !computed;

    const model = builtInTrackerModel({
        label,
        hideLabel: node.hideLabel ?? false,
        display: trackerDisplayOf(node, computed !== undefined),
        levels,
        marks,
        valueColumn: {
            title: settings?.valueColumn?.title ?? translate(fields.conditionPenalty),
            show: settings?.valueColumn?.show ?? hasPenalties,
        },
        total: settings?.total ?? (members !== undefined && rawMembers.length > 1),
        legend: settings?.legend ?? false,
        gameColumnTitle: translate(members?.trackKey === 'health' ? fields.health : fields.damage),
        copies,
        ...(members ? { members: { canAdd: rawMembers.length < maxMembers } } : {}),
        extraColumns,
        pageValue: extrasValue,
        ...(length ? { length } : {}),
        readOnly,
    });

    // --- writes ---------------------------------------------------------------------------
    const writeTrack = (updates: Record<string, unknown>) =>
        bound.update({ [descriptor.dataKey]: { ...track, ...updates } });
    const writeMembers = (next: RawMember[], extra: Record<string, unknown> = {}) =>
        bound.update({ [descriptor.dataKey]: next, ...extra });
    const extrasField = { columns: [...extraColumns], marks: [...marks] } as Pick<
        TrackerField,
        'columns' | 'marks'
    >;
    const writeExtras = (next: TrackerValue) => page?.setValue(extrasKey, next);

    const onMark = (columnId: string, copyId: string, levelId: string, click: TrackerClick) => {
        // Built-in marks are fills only, so a layer press is the plain cycle.
        const brush = 'brush' in click ? click.brush : undefined;
        if (columnId !== GAME_COLUMN_ID) {
            if (page)
                writeExtras(
                    brush
                        ? paintTrackerMark(
                              extrasField,
                              extrasValue,
                              columnId,
                              copyId,
                              levelId,
                              brush
                          )
                        : toggleTrackerMark(extrasField, extrasValue, columnId, copyId, levelId)
                );
            return;
        }
        const index = levels.findIndex(({ id }) => id === levelId);
        if (index < 0) return;
        // The legend's brush puts its mark in one click (spec 019); otherwise the click cycles.
        const mark = (current: readonly ConditionMark[]) =>
            brush ? paintMark(current, index, brush as ConditionMark) : toggleMark(current, index);
        if (!members) {
            const shown = copies[0]!.marks;
            const next = mark(shown);
            writeTrack({ levels: computed ? mergeVisibleMarks(track?.levels, next) : next });
            return;
        }
        writeMembers(
            rawMembers.map((member) =>
                member.id === copyId
                    ? {
                          ...member,
                          [members.trackKey]: {
                              ...(member[members.trackKey] as object),
                              levels: mark(marksOf(member)),
                          },
                      }
                    : member
            )
        );
    };

    const onLength = (step: -1 | 1) => {
        if (computed && descriptor.length) {
            const next = step < 0 ? computed.shorter : computed.longer;
            if (next !== undefined) writeTrack({ [descriptor.length.adjustmentKey]: next });
            return;
        }
        const next = variantStep(step);
        const lengthKey = descriptor.variants?.lengthPath[0];
        if (next === undefined || !lengthKey || !members) return;
        writeMembers(
            next < levels.length
                ? rawMembers.map((member) => ({
                      ...member,
                      [members.trackKey]: {
                          ...(member[members.trackKey] as object),
                          levels: shortenMarks(marksOf(member), next),
                      },
                  }))
                : rawMembers,
            { [lengthKey]: next }
        );
    };

    const wording: Partial<TrackerWording> | undefined = members
        ? {
              add: () => translate(cohort.addMember),
              remove: (_column, copy) =>
                  translate(cohort.removeMember, { label: copy.letter ?? copy.label }),
              out: translate(cohort.defeated),
              removeTitle: translate(cohort.removeTitle),
              removeDescription: (copy) =>
                  translate(cohort.removeDescription, { label: copy.letter ?? copy.label }),
              shortenTitle: translate(cohort.shortenTitle),
              shortenDescription: translate(cohort.shortenDescription),
              capReached: () => translate(cohort.maxMembersReached, { count: maxMembers }),
              boxLabel: (level, _column, copy) =>
                  copy.letter
                      ? `${translate(cohort.member, { label: copy.letter })} — ${level}`
                      : level,
          }
        : undefined;

    return (
        <Tracker
            model={model}
            disabled={readOnly}
            onMark={onMark}
            onText={(columnId, copyId, levelId, text) => {
                if (page) {
                    writeExtras(
                        setTrackerText(extrasField, extrasValue, columnId, copyId, levelId, text)
                    );
                }
            }}
            onAddCopy={() => {
                if (!members || rawMembers.length >= maxMembers) return;
                writeMembers([
                    ...rawMembers,
                    {
                        id: generateId(),
                        label: nextMemberLabel(
                            rawMembers.map((member) => String(member.label ?? ''))
                        ),
                        [members.trackKey]: { levels: [...EMPTY] },
                    },
                ]);
            }}
            onRemoveCopy={(_columnId, copyId) =>
                writeMembers(rawMembers.filter((member) => member.id !== copyId))
            }
            onLength={onLength}
            lengthHidesMarks={(step) => {
                if (!members) return false;
                const next = variantStep(step);
                return (
                    next !== undefined &&
                    next < levels.length &&
                    rawMembers.some((member) => shorteningHidesMarks(marksOf(member), next))
                );
            }}
            {...(wording ? { wording } : {})}
        />
    );
}
