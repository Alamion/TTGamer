import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { buildDiceNotation } from '../../../../shared/utils/diceNotation';
import { generateId } from '../../../../shared/utils/random';
import type { CatalogEntry } from '../../../components';
import { SectionCard } from '../../../components/sections/SectionCard';
import {
    CompactRating,
    CompactResource,
    CompactTextField,
} from '../../../components/stat-fields/CompactSheetFields';
import {
    ConditionTrackStrip,
    ConditionTrackTable,
} from '../../../components/stat-fields/ConditionTrack';
import { MeritFlawList } from '../../../components/stat-fields/MeritFlawRow';
import {
    CustomTraitList,
    TraitRow,
    TraitRowWithInput,
} from '../../../components/stat-fields/TraitRow';
import { reportSheetIssue } from '../../../diagnostics';
import type {
    DocumentBindingDescriptor,
    EquipmentSectionId,
    ListBinding,
} from '../../../systems/templateBindings';
import {
    fieldBindingUpdate,
    readDataPath,
    resolveDocumentBinding,
} from '../../../systems/templateBindings';
import type {
    ConditionMark,
    CustomSkill,
    MeritFlawItem,
    TraitValue,
} from '../../../types/character';
import { DEFAULT_ATTRIBUTE_VALUE } from '../../../types/character';
import type { ListNode, PrimitiveNode } from '../../../types/template';
import { listValueKey } from '../../../types/template';
import { ArmorSection } from '../body/ArmorSection';
import { ImplantsSection } from '../body/ImplantsSection';
import { InventorySection } from '../body/InventorySection';
import { WeaponsSection } from '../body/WeaponsSection';
import { CATALOG_BINDINGS } from '../data/catalogBindings';
import { useBodyHandlers } from '../hooks/useBodyHandlers';
import { useBoundDocument } from './boundDocument';
import { CohortTrack } from './CohortTrack';
import { EnumField, RowsBody } from './RowsBody';

const page = uiMessages.sheet.templates.page;
const fields = uiMessages.sheet.documents.fields;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

/** maxFrom resolution for this node (feature 006 FR-12); degraded when the source is unavailable. */
export interface PrimitiveMaxState {
    resolvedMax?: number;
    degraded?: boolean;
    /** Resolved `minFrom`: dots up to it are locked and writes never go below it. */
    resolvedMin?: number;
}

type DegradedReason =
    | 'unregistered-binding'
    | 'wrong-binding-kind'
    | 'no-document'
    | 'no-body-handlers';

function DegradedBinding({ bindingKey, reason }: { bindingKey: string; reason: DegradedReason }) {
    reportSheetIssue({
        code: 'binding-unresolved',
        message: 'Binding could not be rendered; showing a degraded notice',
        details: { bindingKey, reason },
    });
    return (
        <div
            role="alert"
            className="rounded-lg border border-dashed border-border bg-bgSurface p-4 text-sm text-textSecondary"
        >
            {translate(page.primitiveDegraded, { binding: bindingKey })}
        </div>
    );
}

/** Full-width labeled text field for identity data (compact variant uses CompactTextField). */
function IdentityField({
    label,
    hideLabel,
    value,
    onChange,
    disabled,
}: {
    label: string;
    hideLabel?: boolean;
    value: string;
    onChange: (next: string) => void;
    disabled: boolean;
}) {
    return (
        <label className="grid gap-1 text-xs font-medium text-textSecondary">
            <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                className={inputClasses}
            />
        </label>
    );
}

// ---------------------------------------------------------------------------
// System lists (feature 006 US6): one interface for every SystemListId binding.
// ---------------------------------------------------------------------------

type TraitListEntry = { id: string; label: string; value: number };

function toCatalogEntries(
    source: ReadonlyArray<{ id: string; name: string; shortDescription?: string }>,
    filter?: { key: string; value: string }
): CatalogEntry[] {
    return source
        .filter(
            (entry) => !filter || (entry as Record<string, unknown>)[filter.key] === filter.value
        )
        .map((entry) => ({
            id: entry.id,
            name: entry.name,
            subtitle: entry.shortDescription,
        }));
}

/** Catalog entries for a bound list (registry-declared catalog + filter). */
function listCatalog(binding: ListBinding): CatalogEntry[] | undefined {
    if (!binding.catalog) return undefined;
    const { catalogId, catalogFilter } = binding.catalog;
    const catalog = CATALOG_BINDINGS.get(catalogId);
    if (!catalog) {
        reportSheetIssue({
            code: 'catalog-unavailable',
            message: 'List binding declares a catalog that is not registered',
            details: { catalogId, bindingKey: binding.key },
        });
        return undefined;
    }
    return toCatalogEntries(catalog.entries, catalogFilter);
}

/**
 * System-bound trait-shaped list (`trait` and `named-trait` entry shapes): entries
 * {id, label, value}; catalog selection copies the entry name.
 */
function TraitListBindingView({
    binding,
    items,
    disabled,
    onChange,
    onCatalogSelect,
    placeholder,
    columns = 1,
}: {
    binding: ListBinding;
    items: readonly TraitListEntry[];
    disabled: boolean;
    onChange: (items: TraitListEntry[]) => void;
    onCatalogSelect?: (id: string, entry: CatalogEntry) => void;
    placeholder?: string;
    columns?: 1 | 2 | 3 | 4;
}) {
    return (
        <CustomTraitList
            items={items as CustomSkill[]}
            disabled={disabled}
            columns={columns}
            onAdd={() => onChange([...items, { id: generateId(), label: '', value: 0 }])}
            onRemove={(id) => onChange(items.filter((item) => item.id !== id))}
            onChange={(id, value, specialization, experienced, practiced) =>
                onChange(
                    items.map((item) =>
                        item.id === id
                            ? {
                                  ...item,
                                  value,
                                  specialization: specialization ?? false,
                                  experienced: experienced ?? false,
                                  practiced: practiced ?? false,
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
            placeholder={placeholder}
            catalog={listCatalog(binding)}
            onCatalogSelect={onCatalogSelect}
            onDiceRoll={buildDiceNotation}
        />
    );
}

/** System-bound list rendered with the same molecules the built-in page uses. */
function SystemListBody({
    binding,
    disabled,
    title,
    docsPath,
    columns = 1,
    showTitle = false,
    framed = false,
}: {
    binding: ListBinding;
    disabled: boolean;
    title: string;
    docsPath?: string;
    columns?: 1 | 2 | 3 | 4;
    /** Lists sit inside titled groups: their own title and card are opt-in. */
    showTitle?: boolean;
    framed?: boolean;
}) {
    const bound = useBoundDocument();
    const { dataKey } = binding;
    const raw = (bound?.data[dataKey] as unknown[] | undefined) ?? [];

    const write = (next: unknown[]) => bound?.update({ [dataKey]: next });

    if (binding.entryShape === 'merit-flaw') {
        const items = raw as MeritFlawItem[];
        const isMerit = binding.catalog?.catalogFilter?.value !== 'Flaw';
        return (
            <MeritFlawList
                title={title}
                items={items}
                disabled={disabled}
                docsPath={docsPath}
                isMerit={isMerit}
                columns={columns}
                showTitle={showTitle}
                framed={framed}
                onAdd={() => write([...items, { id: generateId(), points: 1, label: '' }])}
                onRemove={(id) => write(items.filter((item) => item.id !== id))}
                onChange={(id, points, label) =>
                    write(items.map((item) => (item.id === id ? { ...item, points, label } : item)))
                }
                catalog={listCatalog(binding)}
                onCatalogSelect={(id, entry) =>
                    write(
                        items.map((item) =>
                            item.id === id
                                ? { ...item, catalogId: entry.id, label: entry.name }
                                : item
                        )
                    )
                }
            />
        );
    }

    const rawItems = raw as Array<Record<string, unknown>>;
    const items: TraitListEntry[] = rawItems.map((item) => ({
        id: String(item.id ?? ''),
        label: String(item.label ?? item.name ?? ''),
        value: typeof item.value === 'number' ? item.value : 0,
    }));
    // Reverse mapping keeps unknown fields (specialization flags, catalog ids, `name` for
    // named traits) intact across label/value edits — entries are edits, never re-creations.
    const rawById = new Map(rawItems.map((item) => [String(item.id ?? ''), item]));
    const toRaw = (entry: TraitListEntry): Record<string, unknown> => {
        const source = rawById.get(entry.id);
        if (binding.entryShape === 'named-trait') {
            return { ...(source ?? {}), id: entry.id, name: entry.label, value: entry.value };
        }
        return { ...(source ?? { id: entry.id, specialization: false }), ...entry };
    };
    const list = (
        <TraitListBindingView
            binding={binding}
            items={items}
            disabled={disabled}
            columns={columns}
            onChange={(next) => write(next.map(toRaw))}
            onCatalogSelect={(id, entry) =>
                write(
                    rawItems.map((item) =>
                        String(item.id ?? '') === id
                            ? {
                                  ...item,
                                  ...(binding.entryShape === 'named-trait'
                                      ? { name: entry.name }
                                      : { label: entry.name }),
                                  catalogId: entry.id,
                              }
                            : item
                    )
                )
            }
        />
    );
    if (!framed) {
        return showTitle ? (
            <div className="grid gap-1">
                <h3 className="text-sm font-semibold text-textPrimary">{title}</h3>
                {list}
            </div>
        ) : (
            list
        );
    }
    return (
        <SectionCard title={showTitle ? title : undefined} docsPath={docsPath}>
            {list}
        </SectionCard>
    );
}

/** Custom (value-bag) list: entries stored under the list's own coordinate. */
export function CustomListView({
    list,
    entries,
    disabled,
    onChange,
}: {
    list: ListNode;
    entries: readonly TraitListEntry[];
    disabled: boolean;
    onChange: (next: TraitListEntry[]) => void;
}) {
    return (
        <TraitListBindingView
            binding={
                {
                    key: `list:${list.id}`,
                    kind: 'list',
                    label: list.title ?? list.id,
                    documentKinds: new Set<string>(),
                    listId: list.id,
                    dataKey: listValueKey(list),
                    entryShape: 'trait',
                } satisfies ListBinding
            }
            items={entries}
            disabled={disabled}
            onChange={onChange}
            placeholder={list.title}
            columns={list.columns as 1 | 2 | 3 | 4}
        />
    );
}

/** Wrapper with the storage plumbing for a system-bound list node. */
export function SystemListView({
    list,
    systemId,
    documentKind,
    disabled,
}: {
    list: ListNode;
    systemId: string;
    documentKind: string;
    disabled: boolean;
}) {
    const descriptor = list.bindingKey
        ? resolveDocumentBinding(systemId, documentKind, list.bindingKey)
        : undefined;
    if (!descriptor || descriptor.kind !== 'list') {
        return (
            <DegradedBinding
                bindingKey={list.bindingKey ?? listValueKey(list)}
                reason={descriptor ? 'wrong-binding-kind' : 'unregistered-binding'}
            />
        );
    }
    return (
        <SystemListBody
            binding={descriptor}
            disabled={disabled}
            title={list.title ?? descriptor.label}
            columns={list.columns as 1 | 2 | 3 | 4}
            showTitle={list.showTitle}
            framed={list.framed}
        />
    );
}

// ---------------------------------------------------------------------------
// Equipment bindings (US6): the body-section molecules with handler parity.
// ---------------------------------------------------------------------------

function EquipmentBody({ sectionId }: { sectionId: EquipmentSectionId }) {
    const handlers = useBodyHandlers();
    if (!handlers) {
        return <DegradedBinding bindingKey={`equipment:${sectionId}`} reason="no-body-handlers" />;
    }
    switch (sectionId) {
        case 'inventory':
            return (
                <InventorySection
                    items={handlers.inventory}
                    readOnly={handlers.readOnly}
                    onAdd={handlers.addInventoryItem}
                    onRemove={handlers.removeInventoryItem}
                    onUpdate={handlers.updateInventoryItem}
                    onCatalogSelect={handlers.handleInventoryCatalogSelect}
                />
            );
        case 'armor':
            return (
                <ArmorSection
                    items={handlers.armor}
                    readOnly={handlers.readOnly}
                    onAdd={handlers.addArmorItem}
                    onRemove={handlers.removeArmorItem}
                    onUpdate={handlers.updateArmorItem}
                    onCatalogSelect={handlers.handleArmorCatalogSelect}
                />
            );
        case 'weapons':
            return (
                <WeaponsSection
                    items={handlers.weapons}
                    readOnly={handlers.readOnly}
                    onAdd={handlers.addWeaponItem}
                    onRemove={handlers.removeWeaponItem}
                    onUpdate={handlers.updateWeaponItem}
                    onCatalogSelect={handlers.handleWeaponCatalogSelect}
                />
            );
        case 'implants':
            return (
                <ImplantsSection
                    items={handlers.implants}
                    readOnly={handlers.readOnly}
                    onAdd={handlers.addImplantItem}
                    onRemove={handlers.removeImplantItem}
                    onUpdate={handlers.updateImplantItem}
                    onCatalogSelect={handlers.handleImplantCatalogSelect}
                />
            );
    }
}

function EquipmentView({
    node,
    descriptor,
}: {
    node: PrimitiveNode;
    descriptor: DocumentBindingDescriptor;
}) {
    if (descriptor.kind !== 'equipment') {
        return <DegradedBinding bindingKey={node.bindingKey} reason="wrong-binding-kind" />;
    }
    return <EquipmentBody sectionId={descriptor.sectionId} />;
}

// ---------------------------------------------------------------------------
// Primitive leaves (traits, resources, tracks, identity fields).
// ---------------------------------------------------------------------------

function PrimitiveTraitBody({
    node,
    descriptor,
}: {
    node: PrimitiveNode;
    descriptor: Extract<DocumentBindingDescriptor, { kind: 'trait' }>;
}) {
    const bound = useBoundDocument();
    if (!bound) {
        return <DegradedBinding bindingKey={node.bindingKey} reason="no-document" />;
    }
    const { readOnly } = bound;
    const label = node.label ?? descriptor.label;
    const record = bound.data[descriptor.map] as Record<string, TraitValue> | undefined;
    const trait: TraitValue = record?.[descriptor.traitKey] ?? {
        ...DEFAULT_ATTRIBUTE_VALUE,
        value: descriptor.defaultValue,
    };
    const patch = (updates: Partial<TraitValue>) =>
        bound.update({
            [descriptor.map]: {
                ...(record ?? {}),
                [descriptor.traitKey]: { ...trait, ...updates },
            },
        });
    if (node.compact) {
        return (
            <CompactRating
                label={label}
                value={trait.value}
                max={descriptor.maximum}
                disabled={readOnly}
                onChange={(next) => patch({ value: next })}
            />
        );
    }
    return (
        <TraitRowWithInput
            name={label}
            specializationText={trait.specializationText}
            value={trait.value}
            disabled={readOnly}
            onChange={(value, specialization, experienced, practiced) =>
                patch({
                    value,
                    specialization: specialization ?? trait.specialization ?? false,
                    experienced: experienced ?? trait.experienced ?? false,
                    practiced: practiced ?? trait.practiced ?? false,
                })
            }
            onSpecializationTextChange={(text) => patch({ specializationText: text })}
            size="md"
            minimal={descriptor.minimum}
            maxValue={descriptor.maximum}
            showFlags
            specialization={trait.specialization ?? false}
            experienced={trait.experienced ?? false}
            practiced={trait.practiced ?? false}
            onDiceRoll={buildDiceNotation}
            characterName={bound.name}
        />
    );
}

/**
 * System resource primitive with `maxFrom` support (feature 006 T026): the computed maximum
 * caps the displayed range; editing the current value clamps to the cap (write clamp applies
 * only to the bounded value itself — A4).
 */
function PrimitiveResourceBody({
    node,
    descriptor,
    maxState,
}: {
    node: PrimitiveNode;
    descriptor: Extract<DocumentBindingDescriptor, { kind: 'resource' }>;
    maxState?: PrimitiveMaxState;
}) {
    const bound = useBoundDocument();
    if (!bound) {
        return <DegradedBinding bindingKey={node.bindingKey} reason="no-document" />;
    }
    const { readOnly } = bound;
    const label = node.label ?? descriptor.label;
    const effectiveMax =
        maxState?.degraded === true || maxState?.resolvedMax === undefined
            ? descriptor.maximum
            : Math.min(maxState.resolvedMax, descriptor.maximum);
    const stored = bound.data[descriptor.dataKey];
    const pair =
        descriptor.mode === 'rating'
            ? { current: typeof stored === 'number' ? stored : 0, max: descriptor.maximum }
            : ((stored as { current: number; max: number } | undefined) ?? {
                  current: 0,
                  max: descriptor.maximum,
              });
    const editsMax = descriptor.mode === 'pool' && node.part === 'max';
    const shown = editsMax ? pair.max : pair.current;
    // Pools cap `current` at their own maximum unless the binding lets current raise it.
    const rowMax =
        descriptor.mode === 'pool' && !editsMax && !descriptor.currentRaisesMax
            ? Math.min(effectiveMax, Math.max(1, pair.max))
            : effectiveMax;
    const minimum = Math.max(0, Math.min(maxState?.resolvedMin ?? 0, rowMax));
    const writeValue = (next: number) => {
        const clamped = Math.max(minimum, Math.min(next, rowMax));
        const update =
            descriptor.mode === 'rating'
                ? clamped
                : editsMax
                  ? { current: Math.min(pair.current, clamped), max: clamped }
                  : { current: clamped, max: Math.max(pair.max, clamped) };
        bound.update({ [descriptor.dataKey]: update });
    };
    const clampedNotice = maxState?.degraded && (
        <p role="alert" className="text-xs text-error">
            {translate(page.formulaClamped)}
        </p>
    );
    if (node.compact) {
        return (
            <div className="grid gap-1">
                {descriptor.mode === 'pool' && !node.part ? (
                    <CompactResource
                        label={label}
                        current={pair.current}
                        maximum={pair.max}
                        limit={effectiveMax}
                        currentLabel={translate(fields.current)}
                        maximumLabel={translate(fields.maximum)}
                        disabled={readOnly}
                        onChange={(current, maximum) =>
                            bound.update({
                                [descriptor.dataKey]: {
                                    current: Math.min(current, maximum),
                                    max: maximum,
                                },
                            })
                        }
                    />
                ) : (
                    <CompactRating
                        label={label}
                        value={Math.min(shown, rowMax)}
                        max={rowMax}
                        disabled={readOnly}
                        onChange={writeValue}
                    />
                )}
                {clampedNotice}
            </div>
        );
    }
    return (
        <div className="grid gap-1">
            <TraitRow
                label={label}
                value={Math.min(shown, rowMax)}
                maxValue={rowMax}
                minimal={minimum > 0 ? minimum : undefined}
                disabled={readOnly}
                onChange={writeValue}
                size={node.compact ? 'sm' : 'md'}
            />
            {maxState?.degraded && (
                <p role="alert" className="text-xs text-error">
                    {translate(page.formulaClamped)}
                </p>
            )}
        </div>
    );
}

function PrimitiveTrackBody({
    node,
    descriptor,
}: {
    node: PrimitiveNode;
    descriptor: Extract<DocumentBindingDescriptor, { kind: 'track' }>;
}) {
    const bound = useBoundDocument();
    if (bound && descriptor.members) {
        return (
            <CohortTrack
                node={node}
                descriptor={descriptor as Parameters<typeof CohortTrack>[0]['descriptor']}
                bound={bound}
            />
        );
    }
    const track = bound?.data[descriptor.dataKey] as { levels: ConditionMark[] } | undefined;
    if (!bound || !track) {
        return (
            <DegradedBinding
                bindingKey={node.bindingKey}
                reason={bound ? 'wrong-binding-kind' : 'no-document'}
            />
        );
    }
    const { readOnly } = bound;
    const label = node.label ?? descriptor.label;
    const levels = node.track
        ? node.track.names.map((name, index) => ({
              id: `level-${index}`,
              label: name,
              penalty: null,
          }))
        : track.levels.map((_, index) => {
              const level = descriptor.levels[Math.min(index, descriptor.levels.length - 1)];
              return {
                  id: level?.id ?? `level-${index}`,
                  label: level?.translation
                      ? translate(level.translation)
                      : (level?.label ?? String(index)),
                  penalty: level?.penalty ?? null,
              };
          });
    const writeMarks = (next: ConditionMark[]) =>
        bound.update({ [descriptor.dataKey]: { ...track, levels: next } });
    // Brief: one line of squares; full: a table with Level / Penalty / mark columns.
    if (node.compact) {
        return (
            <ConditionTrackStrip
                disabled={readOnly}
                label={label}
                levels={levels}
                marks={track.levels}
                onChange={writeMarks}
            />
        );
    }
    return (
        <div className="grid gap-1">
            {!node.hideLabel && (
                <span className="text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    {label}
                </span>
            )}
            <ConditionTrackTable
                disabled={readOnly}
                levels={levels}
                marks={track.levels}
                onChange={writeMarks}
                columnLabels={{
                    level: translate(fields.conditionLevel),
                    penalty: translate(fields.conditionPenalty),
                    mark: translate(fields.damage),
                }}
            />
        </div>
    );
}

function PrimitiveFieldBody({
    node,
    descriptor,
}: {
    node: PrimitiveNode;
    descriptor: Extract<DocumentBindingDescriptor, { kind: 'field' }>;
}) {
    const bound = useBoundDocument();
    if (!bound) {
        return <DegradedBinding bindingKey={node.bindingKey} reason="no-document" />;
    }
    const { readOnly } = bound;
    const label = node.label ?? descriptor.label;
    const raw = readDataPath(bound.data, descriptor.path);
    const value = typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
    const write = (next: string) => {
        bound.update(
            fieldBindingUpdate(
                descriptor,
                bound.data,
                descriptor.valueType === 'number' ? Number(next) : next
            )
        );
        if (descriptor.syncsTitle) bound.setTitle(next);
    };
    if (descriptor.valueType === 'enum' && descriptor.options) {
        return (
            <EnumField
                label={label}
                hideLabel={node.hideLabel}
                compact={node.compact}
                value={value}
                options={descriptor.options}
                disabled={readOnly}
                onChange={write}
            />
        );
    }
    return node.compact ? (
        <CompactTextField label={label} value={value} disabled={readOnly} onChange={write} />
    ) : (
        <IdentityField
            label={label}
            hideLabel={node.hideLabel}
            value={value}
            disabled={readOnly}
            onChange={write}
        />
    );
}

/** Renders one primitive node against its resolved binding (feature 006 element set). */
export function PrimitiveNodeView({
    node,
    systemId,
    documentKind,
    maxState,
}: {
    node: PrimitiveNode;
    systemId: string;
    documentKind: string;
    maxState?: PrimitiveMaxState;
}) {
    const readOnly = useBoundDocument()?.readOnly ?? true;
    const descriptor = resolveDocumentBinding(systemId, documentKind, node.bindingKey);
    if (!descriptor) {
        return <DegradedBinding bindingKey={node.bindingKey} reason="unregistered-binding" />;
    }
    switch (descriptor.kind) {
        case 'trait':
            return <PrimitiveTraitBody node={node} descriptor={descriptor} />;
        case 'resource':
            return (
                <PrimitiveResourceBody node={node} descriptor={descriptor} maxState={maxState} />
            );
        case 'track':
            return <PrimitiveTrackBody node={node} descriptor={descriptor} />;
        case 'field':
            return <PrimitiveFieldBody node={node} descriptor={descriptor} />;
        case 'equipment':
            return <EquipmentView node={node} descriptor={descriptor} />;
        case 'rows':
            return <RowsBody node={node} descriptor={descriptor} />;
        case 'list':
            return (
                <SystemListBody
                    binding={descriptor}
                    disabled={readOnly}
                    title={node.label ?? descriptor.label}
                />
            );
        default:
            return <DegradedBinding bindingKey={node.bindingKey} reason="wrong-binding-kind" />;
    }
}
