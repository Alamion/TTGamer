import { localizeCatalogEntry } from '@site/src/data/localizeCatalogEntry';

import { ARMOR } from '../../../../data/armorData';
import { BACKGROUNDS } from '../../../../data/backgroundsData';
import { CREATURES } from '../../../../data/creatureData';
import { FORCE_POWERS } from '../../../../data/forcePowersData';
import { FORCE_SKILLS } from '../../../../data/forceSkills';
import { MELEE_WEAPONS } from '../../../../data/meleeWeaponsData';
import { MERITS_FLAWS } from '../../../../data/meritsFlawsData';
import { RANGED_WEAPONS } from '../../../../data/rangedWeaponsData';
import { SPECIES } from '../../../../data/speciesData';
import { TOOLS_GEAR } from '../../../../data/toolsGearData';
import { VEHICLES } from '../../../../data/vehicleData';
import {
    armorDetails,
    creatureDetails,
    vehicleDetails,
} from '../../../systems/star-wars-wod/catalogAdapters';

/**
 * Declared boundary between `src/data` catalogs and declarative template fields
 * (contracts/catalog-binding.md). Templates persist only ids; this registry is the
 * code-owned resolution side, so `data/` stays the single owner of what is bindable.
 */

export type CatalogFillKind = 'text' | 'number' | 'boolean' | 'rows';

export interface CatalogFillableDetail {
    key: string;
    kind: CatalogFillKind;
    label: string;
}

export interface CatalogBindingEntry<TEntry extends { id: string; name: string }> {
    catalogId: string;
    entries: readonly TEntry[];
    entryLabel: (entry: TEntry, lang: string) => string;
    fillableDetails: readonly CatalogFillableDetail[];
    /** Suggested default: every declared detail starts offered; `''` = author picks a target. */
    defaultMapping: Readonly<Record<string, string>>;
    /**
     * Sheet-ready detail values (converted by the owning system). Without it, details are the
     * entry's own scalar properties. `undefined` = leave the target untouched, `null` = clear it.
     */
    resolveDetails?: (entry: TEntry) => Readonly<Record<string, CatalogDetailValue | undefined>>;
}

export type CatalogDetailRow = Readonly<Record<string, string | number | boolean>>;

export type CatalogDetailValue = string | number | boolean | null | readonly CatalogDetailRow[];

interface CatalogLike {
    id: string;
    name: string;
}

function rowsDetail(key: string, label: string): CatalogFillableDetail {
    return { key, kind: 'rows', label };
}

function booleanDetail(key: string, label: string): CatalogFillableDetail {
    return { key, kind: 'boolean', label };
}

function textDetail(key: string, label: string): CatalogFillableDetail {
    return { key, kind: 'text', label };
}

function numberDetail(key: string, label: string): CatalogFillableDetail {
    return { key, kind: 'number', label };
}

function defineCatalog<TEntry extends CatalogLike>(
    catalogId: string,
    entries: readonly TEntry[],
    fillableDetails: readonly CatalogFillableDetail[],
    resolveDetails?: CatalogBindingEntry<TEntry>['resolveDetails']
): CatalogBindingEntry<TEntry> {
    return {
        ...(resolveDetails ? { resolveDetails } : {}),
        catalogId,
        entries,
        entryLabel: (entry, lang) => {
            if (lang !== 'en') {
                const localized = localizeCatalogEntry<Record<string, unknown>>(
                    'catalog',
                    entry.id,
                    lang,
                    { name: entry.name }
                );
                if (typeof localized.name === 'string' && localized.name.length > 0) {
                    return localized.name;
                }
            }
            return entry.name;
        },
        fillableDetails,
        defaultMapping: Object.fromEntries(fillableDetails.map((detail) => [detail.key, ''])),
    };
}

export const MELEE_WEAPONS_BINDING = defineCatalog('melee-weapons', MELEE_WEAPONS, [
    textDetail('name', 'Name'),
    textDetail('damage', 'Damage'),
    numberDetail('difficulty', 'Difficulty'),
    textDetail('conceal', 'Concealability'),
    textDetail('description', 'Description'),
]);

export const RANGED_WEAPONS_BINDING = defineCatalog('ranged-weapons', RANGED_WEAPONS, [
    textDetail('name', 'Name'),
    textDetail('damage', 'Damage'),
    numberDetail('range', 'Range'),
    textDetail('description', 'Description'),
]);

export const ARMOR_BINDING = defineCatalog(
    'armor',
    ARMOR,
    [
        textDetail('name', 'Name'),
        numberDetail('classVal', 'Class'),
        textDetail('ar', 'Armor rating'),
        textDetail('dexPenalty', 'Dexterity penalty'),
        textDetail('description', 'Description'),
    ],
    armorDetails
);

export const CREATURES_BINDING = defineCatalog(
    'creatures',
    CREATURES,
    [
        textDetail('name', 'Species'),
        textDetail('type', 'Type'),
        textDetail('scale', 'Scale'),
        textDetail('size', 'Size'),
        numberDetail('strength', 'Strength'),
        numberDetail('dexterity', 'Dexterity'),
        numberDetail('stamina', 'Stamina'),
        numberDetail('perception', 'Perception'),
        numberDetail('intelligence', 'Intelligence'),
        numberDetail('wits', 'Wits'),
        numberDetail('willpower', 'Willpower'),
        rowsDetail('abilities', 'Abilities'),
        textDetail('armorName', 'Armor'),
        textDetail('armorRating', 'Armor rating'),
        rowsDetail('attacks', 'Attacks'),
        textDetail('movement', 'Movement'),
        rowsDetail('merits', 'Merits'),
        rowsDetail('flaws', 'Flaws'),
        textDetail('description', 'Description'),
        textDetail('source', 'Source'),
    ],
    creatureDetails
);

export const VEHICLES_BINDING = defineCatalog(
    'vehicles',
    VEHICLES,
    [
        textDetail('model', 'Model'),
        textDetail('scale', 'Scale'),
        textDetail('category', 'Category'),
        textDetail('crew', 'Crew'),
        textDetail('passengers', 'Passengers'),
        textDetail('cargo', 'Cargo'),
        textDetail('consumables', 'Consumables'),
        textDetail('length', 'Length'),
        numberDetail('maneuverability', 'Maneuverability'),
        numberDetail('durability', 'Durability'),
        booleanDetail('durabilityReroll', 'Durability reroll'),
        textDetail('speed', 'Speed'),
        textDetail('altitude', 'Altitude'),
        numberDetail('hyperdrive', 'Hyperdrive'),
        textDetail('navComputer', 'Navigation computer'),
        numberDetail('commSensors', 'Communications / Sensors'),
        textDetail('sensorRange', 'Sensor range'),
        numberDetail('shields', 'Shields'),
        rowsDetail('weapons', 'Weapons'),
        textDetail('description', 'Description'),
    ],
    vehicleDetails
);

export const TOOLS_GEAR_BINDING = defineCatalog('tools-gear', TOOLS_GEAR, [
    textDetail('name', 'Name'),
    textDetail('cost', 'Cost'),
    textDetail('effect', 'Effect'),
    textDetail('description', 'Description'),
]);

export const FORCE_POWERS_BINDING = defineCatalog('force-powers', FORCE_POWERS, [
    textDetail('name', 'Name'),
    textDetail('shortDescription', 'Summary'),
    textDetail('description', 'Description'),
]);

export const FORCE_SKILLS_BINDING = defineCatalog('force-skills', FORCE_SKILLS, [
    textDetail('name', 'Name'),
    textDetail('description', 'Description'),
]);

export const SPECIES_BINDING = defineCatalog('species', SPECIES, [
    textDetail('name', 'Name'),
    textDetail('shortDescription', 'Summary'),
    textDetail('description', 'Description'),
]);

export const MERITS_FLAWS_BINDING = defineCatalog('merits-flaws', MERITS_FLAWS, [
    textDetail('name', 'Name'),
    textDetail('shortDescription', 'Summary'),
    textDetail('description', 'Description'),
]);

export const BACKGROUNDS_BINDING = defineCatalog('backgrounds', BACKGROUNDS, [
    textDetail('name', 'Name'),
    textDetail('shortDescription', 'Summary'),
    textDetail('description', 'Description'),
]);

interface AnyCatalogEntry {
    id: string;
    name: string;
}

const CATALOG_LIST: readonly CatalogBindingEntry<AnyCatalogEntry>[] = [
    MELEE_WEAPONS_BINDING as unknown as CatalogBindingEntry<AnyCatalogEntry>,
    RANGED_WEAPONS_BINDING as unknown as CatalogBindingEntry<AnyCatalogEntry>,
    ARMOR_BINDING as unknown as CatalogBindingEntry<AnyCatalogEntry>,
    TOOLS_GEAR_BINDING as unknown as CatalogBindingEntry<AnyCatalogEntry>,
    FORCE_POWERS_BINDING as unknown as CatalogBindingEntry<AnyCatalogEntry>,
    FORCE_SKILLS_BINDING as unknown as CatalogBindingEntry<AnyCatalogEntry>,
    SPECIES_BINDING as unknown as CatalogBindingEntry<AnyCatalogEntry>,
    MERITS_FLAWS_BINDING as unknown as CatalogBindingEntry<AnyCatalogEntry>,
    BACKGROUNDS_BINDING as unknown as CatalogBindingEntry<AnyCatalogEntry>,
    CREATURES_BINDING as unknown as CatalogBindingEntry<AnyCatalogEntry>,
    VEHICLES_BINDING as unknown as CatalogBindingEntry<AnyCatalogEntry>,
];

export const CATALOG_BINDINGS: ReadonlyMap<string, CatalogBindingEntry<AnyCatalogEntry>> = new Map(
    CATALOG_LIST.map((binding) => [binding.catalogId, binding])
);

/** Every fillable detail of one catalog entry, converted by the catalog's resolver when set. */
export function readCatalogDetails(
    catalogId: string,
    entryId: string
): Readonly<Record<string, CatalogDetailValue | undefined>> | undefined {
    const binding = CATALOG_BINDINGS.get(catalogId);
    const entry = binding?.entries.find((candidate) => candidate.id === entryId);
    if (!binding || !entry) return undefined;
    if (binding.resolveDetails) return binding.resolveDetails(entry);
    return Object.fromEntries(
        binding.fillableDetails.map((detail) => [detail.key, readDetailValue(entry, detail.key)])
    );
}

/** Stable detail extraction used by the copy-on-select runtime. */
export function readDetailValue(entry: AnyCatalogEntry, key: string): string | number | undefined {
    const value = (entry as unknown as Record<string, unknown>)[key];
    if (typeof value === 'string' || typeof value === 'number') return value;
    return undefined;
}

/** Closed-set validation for fill mappings (used by editor and import paths). */
export function validateBindingFills(
    catalogId: string,
    fills: Record<string, unknown>
): { ok: true } | { ok: false; unknownKeys: string[] } {
    const binding = CATALOG_BINDINGS.get(catalogId);
    if (!binding) return { ok: false, unknownKeys: Object.keys(fills) };
    const allowed = new Set(binding.fillableDetails.map((detail) => detail.key));
    const unknownKeys = Object.keys(fills).filter((key) => !allowed.has(key));
    return unknownKeys.length === 0 ? { ok: true } : { ok: false, unknownKeys };
}
