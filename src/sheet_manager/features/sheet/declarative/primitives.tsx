import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useMemo } from 'react';

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
import { termLinkOf } from '../../../components/terms/termLink';
import { reportSheetIssue } from '../../../diagnostics';
import type {
    DocumentBindingDescriptor,
    EquipmentBinding,
    EquipmentSectionId,
    ListBinding,
} from '../../../systems/templateBindings';
import {
    fieldBindingUpdate,
    readBoundNumber,
    readDataPath,
    resolveDocumentBinding,
    trackBoxes,
} from '../../../systems/templateBindings';
import type {
    ArmorItem,
    ConditionMark,
    CustomSkill,
    ImplantItem,
    Item,
    MeritFlawItem,
    TraitValue,
    WeaponItem,
} from '../../../types/character';
import { DEFAULT_ATTRIBUTE_VALUE } from '../../../types/character';
import type { ListNode, PrimitiveNode } from '../../../types/template';
import { listValueKey } from '../../../types/template';
import { ArmorSection } from '../body/ArmorSection';
import {
    createEquipmentItem,
    type EquipmentItem,
    updateEquipmentItem,
} from '../body/equipmentItems';
import { ImplantsSection } from '../body/ImplantsSection';
import { InventorySection } from '../body/InventorySection';
import { WeaponsSection } from '../body/WeaponsSection';
import {
    buildArmorCatalog,
    buildImplantsCatalog,
    buildInventoryCatalog,
    buildWeaponsCatalog,
} from '../data/bodyEquipmentCatalogs';
import {
    CATALOG_BINDINGS,
    type CatalogBindingEntry,
    readCatalogDetails,
} from '../data/catalogBindings';
import { useBodyHandlers } from '../hooks/useBodyHandlers';
import { useBoundDocument } from './boundDocument';
import { CohortTrack } from './CohortTrack';
import { traitRowKind } from './rowKind';
import { EnumField, RowsBody } from './RowsBody';
import { mergeVisibleMarks, resolveComputedTrackLength, visibleMarks } from './trackLength';

const page = uiMessages.sheet.templates.page;
const fields = uiMessages.sheet.documents.fields;
const tracks = uiMessages.sheet.tracks;

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
    catalog: CatalogBindingEntry,
    locale: string,
    filter?: { key: string; value: string }
): CatalogEntry[] {
    return catalog.entries
        .filter(
            (entry) =>
                !filter ||
                (entry as unknown as Record<string, unknown>)[filter.key] === filter.value
        )
        .map((entry) => ({
            id: entry.id,
            name: catalog.pickLabel(entry, locale),
            subtitle: catalog.entryText(entry, 'shortDescription', locale),
        }));
}

/** Catalog entries for a bound list (registry-declared catalog + filter), localized. */
function listCatalog(binding: ListBinding, locale: string): CatalogEntry[] | undefined {
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
    return toCatalogEntries(catalog, locale, catalogFilter);
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
    const locale = useDocusaurusContext().i18n.currentLocale;
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
            catalog={listCatalog(binding, locale)}
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
    const locale = useDocusaurusContext().i18n.currentLocale;
    const bound = useBoundDocument();
    const { dataKey } = binding;
    const raw = (bound?.data[dataKey] as unknown[] | undefined) ?? [];

    const write = (next: unknown[]) => bound?.update({ [dataKey]: next });

    if (binding.entryShape === 'merit-flaw') {
        const items = raw as MeritFlawItem[];
        const isMerit = binding.polarity
            ? binding.polarity === 'positive'
            : binding.catalog?.catalogFilter?.value !== 'Flaw';
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
                catalog={listCatalog(binding, locale)}
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

interface EquipmentSectionProps {
    sectionId: EquipmentSectionId;
    items: unknown[];
    readOnly: boolean;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, field: string, value: string | number | boolean) => void;
    onCatalogSelect: (id: string, entry: CatalogEntry) => void;
    catalog: CatalogEntry[];
}

/** The body-section molecule of one equipment section. */
function EquipmentSection({ sectionId, items, onUpdate, ...rest }: EquipmentSectionProps) {
    const update = onUpdate as never;
    switch (sectionId) {
        case 'inventory':
            return <InventorySection items={items as Item[]} onUpdate={update} {...rest} />;
        case 'armor':
            return <ArmorSection items={items as ArmorItem[]} onUpdate={update} {...rest} />;
        case 'weapons':
            return <WeaponsSection items={items as WeaponItem[]} onUpdate={update} {...rest} />;
        case 'implants':
            return <ImplantsSection items={items as ImplantItem[]} onUpdate={update} {...rest} />;
    }
}

const STAR_WARS_EQUIPMENT_CATALOGS: Record<EquipmentSectionId, () => CatalogEntry[]> = {
    inventory: buildInventoryCatalog,
    armor: buildArmorCatalog,
    weapons: buildWeaponsCatalog,
    implants: buildImplantsCatalog,
};

/** Equipment edited through the character capability (Star Wars items and catalogs). */
function CharacterEquipmentBody({ sectionId }: { sectionId: EquipmentSectionId }) {
    const handlers = useBodyHandlers();
    if (!handlers) {
        return <DegradedBinding bindingKey={`equipment:${sectionId}`} reason="no-body-handlers" />;
    }
    const bySection = {
        inventory: {
            items: handlers.inventory,
            onAdd: handlers.addInventoryItem,
            onRemove: handlers.removeInventoryItem,
            onUpdate: handlers.updateInventoryItem,
            onCatalogSelect: handlers.handleInventoryCatalogSelect,
        },
        armor: {
            items: handlers.armor,
            onAdd: handlers.addArmorItem,
            onRemove: handlers.removeArmorItem,
            onUpdate: handlers.updateArmorItem,
            onCatalogSelect: handlers.handleArmorCatalogSelect,
        },
        weapons: {
            items: handlers.weapons,
            onAdd: handlers.addWeaponItem,
            onRemove: handlers.removeWeaponItem,
            onUpdate: handlers.updateWeaponItem,
            onCatalogSelect: handlers.handleWeaponCatalogSelect,
        },
        implants: {
            items: handlers.implants,
            onAdd: handlers.addImplantItem,
            onRemove: handlers.removeImplantItem,
            onUpdate: handlers.updateImplantItem,
            onCatalogSelect: handlers.handleImplantCatalogSelect,
        },
    }[sectionId];
    return (
        <EquipmentSection
            sectionId={sectionId}
            readOnly={handlers.readOnly}
            catalog={STAR_WARS_EQUIPMENT_CATALOGS[sectionId]()}
            {...(bySection as Omit<EquipmentSectionProps, 'sectionId' | 'readOnly' | 'catalog'>)}
        />
    );
}

/** Equipment stored as a plain item array in document data (any system; free-text names). */
function BoundEquipmentBody({
    sectionId,
    dataKey,
    catalog,
}: {
    sectionId: EquipmentSectionId;
    dataKey: string;
    catalog?: EquipmentBinding['catalog'];
}) {
    const bound = useBoundDocument();
    const locale = useDocusaurusContext().i18n.currentLocale;
    const suggestions = useMemo<CatalogEntry[]>(
        () =>
            (catalog?.catalogIds ?? []).flatMap((catalogId) => {
                const source = CATALOG_BINDINGS.get(catalogId);
                return (source?.entries ?? []).map((entry) => ({
                    id: `${catalogId}/${entry.id}`,
                    name: source!.pickLabel(entry, locale),
                }));
            }),
        [catalog, locale]
    );
    if (!bound) {
        return <DegradedBinding bindingKey={`equipment:${sectionId}`} reason="no-document" />;
    }
    const stored = bound.data[dataKey];
    const items = (Array.isArray(stored) ? stored : []) as Array<EquipmentItem<typeof sectionId>>;
    const write = (next: unknown[]) => bound.update({ [dataKey]: next });
    return (
        <EquipmentSection
            sectionId={sectionId}
            items={items}
            readOnly={bound.readOnly}
            catalog={suggestions}
            onAdd={() => write([...items, createEquipmentItem(sectionId)])}
            onRemove={(id) => write(items.filter((item) => item.id !== id))}
            onUpdate={(id, field, value) =>
                write(updateEquipmentItem(sectionId, items, id, field, value))
            }
            onCatalogSelect={(id, suggestion) => {
                const [catalogId = '', entryId = ''] = suggestion.id.split('/');
                const details = readCatalogDetails(catalogId, entryId);
                if (!catalog || !details) return;
                let next = items;
                for (const [detailKey, field] of Object.entries(catalog.fills)) {
                    const source = CATALOG_BINDINGS.get(catalogId);
                    const entry = source?.entries.find((candidate) => candidate.id === entryId);
                    const localized = entry && source?.entryText(entry, detailKey, locale);
                    const detail =
                        detailKey === 'name' ? suggestion.name : (localized ?? details[detailKey]);
                    if (typeof detail !== 'string' && typeof detail !== 'number') continue;
                    next = updateEquipmentItem(sectionId, next, id, field, detail);
                }
                write(next);
            }}
        />
    );
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
    return descriptor.dataKey ? (
        <BoundEquipmentBody
            sectionId={descriptor.sectionId}
            dataKey={descriptor.dataKey}
            catalog={descriptor.catalog}
        />
    ) : (
        <CharacterEquipmentBody sectionId={descriptor.sectionId} />
    );
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
    const rowKind = traitRowKind(node.compact, descriptor);
    const showSpecialization = descriptor.row?.specialization ?? true;
    const showFlags = descriptor.row?.flags ?? true;
    if (rowKind === 'compact') {
        const specialization = showSpecialization ? trait.specializationText?.trim() : undefined;
        const rating = (
            <CompactRating
                label={label}
                term={termLinkOf(node)}
                value={trait.value}
                max={descriptor.maximum}
                disabled={readOnly}
                onChange={(next) => patch({ value: next })}
            />
        );
        return specialization ? (
            <div className="grid min-w-0 gap-0.5">
                {rating}
                <span className="truncate text-xs text-textSecondary">{specialization}</span>
            </div>
        ) : (
            rating
        );
    }
    if (rowKind === 'trait') {
        return (
            <TraitRow
                label={label}
                term={termLinkOf(node)}
                value={trait.value}
                maxValue={descriptor.maximum}
                minimal={descriptor.minimum > 0 ? descriptor.minimum : undefined}
                disabled={readOnly}
                onChange={(value, specialization, experienced, practiced) =>
                    patch({
                        value,
                        ...(showFlags
                            ? {
                                  specialization: specialization ?? trait.specialization ?? false,
                                  experienced: experienced ?? trait.experienced ?? false,
                                  practiced: practiced ?? trait.practiced ?? false,
                              }
                            : {}),
                    })
                }
                showFlags={showFlags}
                specialization={trait.specialization ?? false}
                experienced={trait.experienced ?? false}
                practiced={trait.practiced ?? false}
                onDiceRoll={buildDiceNotation}
                characterName={bound.name}
            />
        );
    }
    return (
        <TraitRowWithInput
            name={label}
            term={termLinkOf(node)}
            specializationText={trait.specializationText}
            value={trait.value}
            disabled={readOnly}
            onChange={(value, specialization, experienced, practiced) =>
                patch({
                    value,
                    ...(showFlags
                        ? {
                              specialization: specialization ?? trait.specialization ?? false,
                              experienced: experienced ?? trait.experienced ?? false,
                              practiced: practiced ?? trait.practiced ?? false,
                          }
                        : {}),
                })
            }
            onSpecializationTextChange={(text) => patch({ specializationText: text })}
            size="md"
            minimal={descriptor.minimum}
            maxValue={descriptor.maximum}
            showFlags={showFlags}
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
                        term={termLinkOf(node)}
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
                term={termLinkOf(node)}
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
    systemId,
    documentKind,
}: {
    node: PrimitiveNode;
    descriptor: Extract<DocumentBindingDescriptor, { kind: 'track' }>;
    systemId: string;
    documentKind: string;
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
    const track = bound?.data[descriptor.dataKey] as
        | ({ levels?: ConditionMark[] } & Record<string, unknown>)
        | undefined;
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
    const computed = descriptor.length
        ? resolveComputedTrackLength(descriptor.length, track, (path) => {
              const read = readBoundNumber(systemId, documentKind, bound.data, path);
              return read.bound ? read.value : undefined;
          })
        : undefined;
    if (computed?.failed) {
        reportSheetIssue({
            code: 'formula-error',
            message: 'Track length formula could not be evaluated',
            details: { bindingKey: descriptor.key, formula: descriptor.length?.from },
        });
    }
    const levels = computed
        ? trackBoxes(computed.length).map((level) => ({
              ...level,
              label: `${label} ${level.label}`,
          }))
        : node.track
          ? node.track.names.map((name, index) => ({
                id: `level-${index}`,
                label: name,
                penalty: null,
            }))
          : (track.levels ?? []).map((_, index) => {
                const level = descriptor.levels[Math.min(index, descriptor.levels.length - 1)];
                return {
                    id: level?.id ?? `level-${index}`,
                    label: level?.translation
                        ? translate(level.translation)
                        : (level?.label ?? String(index)),
                    penalty: level?.penalty ?? null,
                };
            });
    const marks = computed ? visibleMarks(track.levels, computed.length) : (track.levels ?? []);
    const writeTrack = (updates: Record<string, unknown>) =>
        bound.update({ [descriptor.dataKey]: { ...track, ...updates } });
    const writeMarks = (next: ConditionMark[]) =>
        writeTrack({ levels: computed ? mergeVisibleMarks(track.levels, next) : next });
    const adjustmentKey = descriptor.length?.adjustmentKey;
    const lengthControl =
        computed && adjustmentKey
            ? {
                  onDecrease:
                      computed.shorter === undefined
                          ? undefined
                          : () => writeTrack({ [adjustmentKey]: computed.shorter }),
                  onIncrease:
                      computed.longer === undefined
                          ? undefined
                          : () => writeTrack({ [adjustmentKey]: computed.longer }),
                  decreaseLabel: translate(tracks.length.decrease, { track: label }),
                  increaseLabel: translate(tracks.length.increase, { track: label }),
              }
            : undefined;
    const layout = node.trackLayout ?? (node.compact || computed ? 'strip' : 'table');
    if (layout === 'strip') {
        return (
            <div className="grid gap-1">
                {!node.compact && !node.hideLabel && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-textSecondary">
                        {label}
                    </span>
                )}
                <ConditionTrackStrip
                    disabled={readOnly}
                    label={label}
                    hideLabel={!node.compact || node.hideLabel}
                    size={node.compact ? 'sm' : 'md'}
                    levels={levels}
                    marks={marks}
                    onChange={writeMarks}
                    {...(node.compact ? {} : { lengthControl })}
                />
            </div>
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
                marks={marks}
                onChange={writeMarks}
                lengthControl={lengthControl}
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
    if (descriptor.valueType === 'boolean') {
        return (
            <label className="flex items-center gap-2 text-sm text-textPrimary">
                <input
                    type="checkbox"
                    checked={raw === true}
                    disabled={readOnly}
                    onChange={(event) =>
                        bound.update(
                            fieldBindingUpdate(descriptor, bound.data, event.target.checked)
                        )
                    }
                />
                <span className={node.hideLabel ? 'sr-only' : undefined}>{label}</span>
            </label>
        );
    }
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
            return (
                <PrimitiveTrackBody
                    node={node}
                    descriptor={descriptor}
                    systemId={systemId}
                    documentKind={documentKind}
                />
            );
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
                    title={
                        node.label ??
                        (descriptor.translation
                            ? translate(descriptor.translation)
                            : descriptor.label)
                    }
                />
            );
        default:
            return <DegradedBinding bindingKey={node.bindingKey} reason="wrong-binding-kind" />;
    }
}
