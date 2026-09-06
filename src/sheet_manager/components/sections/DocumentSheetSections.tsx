import { clsx } from 'clsx';
import { Plus } from 'lucide-react';

import { generateId } from '../../../shared/utils/random';
import type { WodConditionTrack, WodTraitGroup } from '../../systems/wod-like';
import type { ConditionMark, CustomSkill, TraitValue } from '../../types/character';
import { CustomTraitList, TraitRow, TraitRowWithInput } from '../stat-fields/TraitRow';
import type { AccentColor } from './CollapsibleBlock';
import { CollapsibleBlock } from './CollapsibleBlock';
import type { DataTableColumn } from './DataTable';
import { DataTable } from './DataTable';
import { SectionCard } from './SectionCard';

export interface DocumentFieldDefinition {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    multiline?: boolean;
    options?: ReadonlyArray<{ value: string; label: string }>;
}

interface DocumentBlockProps {
    title: string;
    storageKey: string;
    docsPath?: string;
    accentColor?: AccentColor;
}

interface DocumentFieldsBlockProps extends DocumentBlockProps {
    fields: DocumentFieldDefinition[];
    columns?: 1 | 2 | 3;
}

const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
};

export function DocumentFieldsBlock({
    accentColor,
    columns = 3,
    docsPath,
    fields,
    storageKey,
    title,
}: DocumentFieldsBlockProps) {
    return (
        <CollapsibleBlock
            title={title}
            storageKey={storageKey}
            docsPath={docsPath}
            accentColor={accentColor}
        >
            <SectionCard>
                <div className={clsx('grid gap-4', columnClasses[columns])}>
                    {fields.map((field) => (
                        <label
                            key={field.id}
                            className={clsx(
                                'grid gap-1 text-xs font-medium text-textSecondary',
                                field.multiline && columns !== 1 && 'md:col-span-2 xl:col-span-3'
                            )}
                        >
                            {field.label}
                            {field.options ? (
                                <select
                                    value={field.value}
                                    onChange={(event) => field.onChange(event.target.value)}
                                    className="rounded border border-border bg-bgSurface px-2 py-2 text-sm text-textPrimary"
                                >
                                    {field.options.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            ) : field.multiline ? (
                                <textarea
                                    value={field.value}
                                    onChange={(event) => field.onChange(event.target.value)}
                                    className="min-h-28 resize-y rounded border border-border bg-bgSurface px-3 py-2 text-sm text-textPrimary"
                                />
                            ) : (
                                <input
                                    value={field.value}
                                    onChange={(event) => field.onChange(event.target.value)}
                                    className="rounded border border-border bg-bgSurface px-2 py-2 text-sm text-textPrimary"
                                />
                            )}
                        </label>
                    ))}
                </div>
            </SectionCard>
        </CollapsibleBlock>
    );
}

interface TraitGroupsBlockProps extends DocumentBlockProps {
    groups: readonly WodTraitGroup[];
    values: Record<string, TraitValue>;
    defaultValue: TraitValue;
    onChange: (key: string, value: TraitValue) => void;
    localizeLabel?: (group: WodTraitGroup, key: string, fallback: string) => string;
    characterName?: string;
    showFlags?: boolean;
    customTraits?: Readonly<Record<string, CustomTraitCollection>>;
}

export interface CustomTraitCollection {
    items: CustomSkill[];
    onChange: (items: CustomSkill[]) => void;
}

export function CustomTraitsEditor({ items, onChange }: CustomTraitCollection) {
    return (
        <CustomTraitList
            items={items}
            onAdd={() =>
                onChange([
                    ...items,
                    {
                        id: generateId(),
                        label: '',
                        value: 0,
                        specialization: false,
                        experienced: false,
                        practiced: false,
                    },
                ])
            }
            onRemove={(id) => onChange(items.filter((item) => item.id !== id))}
            onChange={(id, value, specialization, experienced, practiced) =>
                onChange(
                    items.map((item) =>
                        item.id === id
                            ? {
                                  ...item,
                                  value,
                                  specialization: specialization ?? item.specialization ?? false,
                                  experienced: experienced ?? item.experienced ?? false,
                                  practiced: practiced ?? item.practiced ?? false,
                              }
                            : item
                    )
                )
            }
            onLabelChange={(id, value, label) =>
                onChange(items.map((item) => (item.id === id ? { ...item, label, value } : item)))
            }
            size="md"
            showFlags
        />
    );
}

export function TraitGroupsBlock({
    accentColor,
    characterName,
    customTraits,
    defaultValue,
    docsPath,
    groups,
    localizeLabel,
    onChange,
    showFlags = false,
    storageKey,
    title,
    values,
}: TraitGroupsBlockProps) {
    return (
        <CollapsibleBlock
            title={title}
            storageKey={storageKey}
            docsPath={docsPath}
            accentColor={accentColor}
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {groups.map((group) => (
                    <SectionCard key={group.id} title={group.label}>
                        {group.traits.map((definition) => {
                            const trait = values[definition.key] ?? defaultValue;
                            return (
                                <TraitRowWithInput
                                    key={definition.key}
                                    name={
                                        localizeLabel?.(group, definition.key, definition.label) ??
                                        definition.label
                                    }
                                    specializationText={trait.specializationText}
                                    value={trait.value}
                                    maxValue={definition.maximum}
                                    minimal={definition.minimum}
                                    size="md"
                                    showFlags={showFlags}
                                    specialization={trait.specialization}
                                    experienced={trait.experienced}
                                    practiced={trait.practiced}
                                    characterName={characterName}
                                    onChange={(value, specialization, experienced, practiced) =>
                                        onChange(definition.key, {
                                            ...trait,
                                            value,
                                            specialization:
                                                specialization ?? trait.specialization ?? false,
                                            experienced: experienced ?? trait.experienced ?? false,
                                            practiced: practiced ?? trait.practiced ?? false,
                                        })
                                    }
                                    onSpecializationTextChange={(specializationText) =>
                                        onChange(definition.key, {
                                            ...trait,
                                            specializationText,
                                        })
                                    }
                                />
                            );
                        })}
                        {customTraits?.[group.id] && (
                            <CustomTraitsEditor {...customTraits[group.id]} />
                        )}
                    </SectionCard>
                ))}
            </div>
        </CollapsibleBlock>
    );
}

interface CustomTraitsBlockProps extends DocumentBlockProps {
    items: CustomSkill[];
    onChange: (items: CustomSkill[]) => void;
}

export function CustomTraitsBlock({
    accentColor,
    docsPath,
    items,
    onChange,
    storageKey,
    title,
}: CustomTraitsBlockProps) {
    return (
        <CollapsibleBlock
            title={title}
            storageKey={storageKey}
            docsPath={docsPath}
            accentColor={accentColor}
        >
            <SectionCard>
                <CustomTraitsEditor items={items} onChange={onChange} />
            </SectionCard>
        </CollapsibleBlock>
    );
}

export interface DocumentResourceValue {
    id: string;
    label: string;
    current: number;
    maximum: number;
    limit?: number;
    mode?: 'rating' | 'pool';
    onChange: (current: number, maximum: number) => void;
}

interface ResourceBlockProps extends DocumentBlockProps {
    resources: DocumentResourceValue[];
    currentLabel: string;
    maximumLabel: string;
}

export function ResourceBlock({
    accentColor,
    currentLabel,
    docsPath,
    maximumLabel,
    resources,
    storageKey,
    title,
}: ResourceBlockProps) {
    return (
        <CollapsibleBlock
            title={title}
            storageKey={storageKey}
            docsPath={docsPath}
            accentColor={accentColor}
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {resources.map((resource) => {
                    const limit = resource.limit ?? 10;
                    return (
                        <SectionCard key={resource.id} title={resource.label}>
                            {resource.mode !== 'rating' && (
                                <TraitRow
                                    label={maximumLabel}
                                    value={resource.maximum}
                                    maxValue={limit}
                                    onChange={(maximum) =>
                                        resource.onChange(
                                            Math.min(resource.current, maximum),
                                            maximum
                                        )
                                    }
                                />
                            )}
                            <TraitRow
                                label={resource.mode === 'rating' ? resource.label : currentLabel}
                                value={resource.current}
                                maxValue={
                                    resource.mode === 'rating' ? limit : resource.maximum || limit
                                }
                                onChange={(current) => resource.onChange(current, resource.maximum)}
                            />
                        </SectionCard>
                    );
                })}
            </div>
        </CollapsibleBlock>
    );
}

export interface ConditionTrackMember {
    id: string;
    label: string;
    levels: ConditionMark[];
}

interface ConditionTrackBlockProps extends DocumentBlockProps {
    track: WodConditionTrack;
    members: ConditionTrackMember[];
    onChange: (members: ConditionTrackMember[]) => void;
    addMemberLabel: string;
    removeMemberLabel: string;
    memberLabel: string;
    maxMembers?: number;
}

const nextMark: Record<ConditionMark, ConditionMark> = {
    empty: 'slash',
    slash: 'cross',
    cross: 'empty',
};

export function ConditionTrackBlock({
    accentColor,
    addMemberLabel,
    docsPath,
    maxMembers = 24,
    memberLabel,
    members,
    onChange,
    removeMemberLabel,
    storageKey,
    title,
    track,
}: ConditionTrackBlockProps) {
    return (
        <CollapsibleBlock
            title={title}
            storageKey={storageKey}
            docsPath={docsPath}
            accentColor={accentColor}
        >
            <SectionCard>
                {maxMembers > 1 && (
                    <div className="mb-3 flex justify-end">
                        <button
                            type="button"
                            disabled={members.length >= maxMembers}
                            onClick={() =>
                                onChange([
                                    ...members,
                                    {
                                        id: generateId(),
                                        label: String.fromCharCode(65 + members.length),
                                        levels: track.levels.map(() => 'empty'),
                                    },
                                ])
                            }
                            className="flex items-center gap-1 text-sm text-textSecondary transition-colors hover:text-textPrimary disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            {addMemberLabel}
                        </button>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-max text-sm">
                        <thead>
                            <tr className="text-xs text-textSecondary">
                                <th scope="col" className="pb-2 pr-4 text-left">
                                    {track.label}
                                </th>
                                <th scope="col" className="w-14 pb-2 text-center">
                                    −
                                </th>
                                {members.map((member, memberIndex) => (
                                    <th key={member.id} scope="col" className="pb-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <input
                                                value={member.label}
                                                onChange={(event) =>
                                                    onChange(
                                                        members.map((candidate, index) =>
                                                            index === memberIndex
                                                                ? {
                                                                      ...candidate,
                                                                      label: event.target.value,
                                                                  }
                                                                : candidate
                                                        )
                                                    )
                                                }
                                                aria-label={`${memberLabel} ${memberIndex + 1}`}
                                                className="w-16 border-b border-border bg-transparent px-1 text-center text-xs text-textPrimary"
                                            />
                                            {members.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onChange(
                                                            members.filter(
                                                                (_, index) => index !== memberIndex
                                                            )
                                                        )
                                                    }
                                                    aria-label={removeMemberLabel}
                                                    className="text-error"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {track.levels.map((level, levelIndex) => (
                                <tr key={level.id} className="border-t border-border/50">
                                    <th scope="row" className="py-1.5 pr-4 text-left font-normal">
                                        {level.label}
                                    </th>
                                    <td className="text-center text-textSecondary">
                                        {level.penalty ?? '—'}
                                    </td>
                                    {members.map((member, memberIndex) => {
                                        const mark = member.levels[levelIndex] ?? 'empty';
                                        return (
                                            <td key={member.id} className="px-1 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onChange(
                                                            members.map((candidate, index) => {
                                                                if (index !== memberIndex) {
                                                                    return candidate;
                                                                }
                                                                const levels = [
                                                                    ...candidate.levels,
                                                                ];
                                                                levels[levelIndex] = nextMark[mark];
                                                                return { ...candidate, levels };
                                                            })
                                                        )
                                                    }
                                                    aria-label={`${member.label} ${level.label}: ${mark}`}
                                                    className={clsx(
                                                        'mx-auto grid h-7 w-7 place-items-center rounded border-2 font-mono font-bold transition-colors',
                                                        mark === 'cross'
                                                            ? 'border-error bg-error text-white'
                                                            : mark === 'slash'
                                                              ? 'border-secondary bg-secondary text-white'
                                                              : 'border-border bg-transparent hover:border-primary'
                                                    )}
                                                >
                                                    {mark === 'cross'
                                                        ? '×'
                                                        : mark === 'slash'
                                                          ? '╱'
                                                          : ''}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </CollapsibleBlock>
    );
}

interface EditableTableBlockProps<T extends { id: string }> extends DocumentBlockProps {
    columns: DataTableColumn<T>[];
    items: T[];
    onAdd: () => void;
    onRemove: (id: string) => void;
    addLabel: string;
    emptyMessage: string;
}

export function EditableTableBlock<T extends { id: string }>({
    accentColor,
    addLabel,
    columns,
    docsPath,
    emptyMessage,
    items,
    onAdd,
    onRemove,
    storageKey,
    title,
}: EditableTableBlockProps<T>) {
    return (
        <CollapsibleBlock
            title={title}
            storageKey={storageKey}
            docsPath={docsPath}
            accentColor={accentColor}
        >
            <SectionCard>
                <DataTable
                    columns={columns}
                    items={items}
                    idKey="id"
                    onAdd={onAdd}
                    onRemove={onRemove}
                    addLabel={addLabel}
                    emptyMessage={emptyMessage}
                    className="px-0 pb-0"
                />
            </SectionCard>
        </CollapsibleBlock>
    );
}
