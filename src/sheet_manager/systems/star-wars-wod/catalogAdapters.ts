import type { ArmorEntry } from '../../../data/armorData';
import type { CreatureEntry } from '../../../data/creatureData';
import type { VehicleEntry } from '../../../data/vehicleData';
import { reportSheetIssue } from '../../diagnostics';
import { toCoordinate } from '../wod-like/templateBindings';
import { ARC_OPTIONS } from './entityBindings';
import { CombatScaleSchema } from './schema';

/**
 * Converts Star Wars catalog entries (WEG-style dice labels, display names) into sheet-ready
 * values for catalog fills. `undefined` leaves a target untouched, `null` clears it.
 */

type DetailValue =
    | string
    | number
    | boolean
    | null
    | ReadonlyArray<Readonly<Record<string, string | number | boolean>>>;

export type CatalogDetails = Record<string, DetailValue | undefined>;

const DOTS_MAX = 5;

/** `'5D'` / `'5D+2'` → 5 (pips ignored), clamped to the sheet's dots; non-dice → undefined. */
export function diceToDots(
    label: unknown,
    context: { catalogId: string; entryId: string; detail: string },
    maximum = DOTS_MAX
): number | undefined {
    if (typeof label === 'number') return clamp(label, maximum, context);
    if (typeof label !== 'string') return undefined;
    const match = label.trim().match(/^(\d+)\s*D/i);
    if (!match) return undefined;
    return clamp(Number(match[1]), maximum, context);
}

function clamp(
    value: number,
    maximum: number,
    context: { catalogId: string; entryId: string; detail: string }
): number {
    if (value <= maximum && value >= 0) return value;
    reportSheetIssue({
        code: 'catalog-detail-out-of-range',
        message: 'Catalog value exceeds the sheet range and was clamped',
        details: { ...context, value, maximum },
    });
    return Math.max(0, Math.min(value, maximum));
}

/** Catalog scale name → combat scale id (`'Speeder'` → `speeder`); unknown → undefined. */
export function scaleId(
    name: unknown,
    context: { catalogId: string; entryId: string }
): string | undefined {
    if (typeof name !== 'string') return undefined;
    const candidate = toCoordinate(name);
    if ((CombatScaleSchema.options as readonly string[]).includes(candidate)) return candidate;
    reportSheetIssue({
        code: 'catalog-detail-out-of-range',
        message: 'Catalog scale has no sheet equivalent; scale left unchanged',
        details: { ...context, detail: 'scale', value: name },
    });
    return undefined;
}

/** `'Tough hide +1D'` → name `Tough hide`, rating `+1D`; no rating → name only. */
export function splitArmor(label: string | null): { name: string | null; rating: string | null } {
    if (!label) return { name: null, rating: null };
    const match = label.match(/^(.*?)\s*([+-]\d+D(?:\+\d+)?)\s*$/i);
    if (!match) return { name: label.trim(), rating: null };
    return { name: match[1]!.trim() || label.trim(), rating: match[2]! };
}

/** Catalog arc name → arc id; an unknown arc keeps its text. */
export function arcId(arc: string): string {
    const candidate = arc.trim().toLowerCase();
    return ARC_OPTIONS.some((option) => option.id === candidate) ? candidate : arc;
}

const ATTRIBUTE_DETAILS = [
    'strength',
    'dexterity',
    'stamina',
    'perception',
    'intelligence',
    'wits',
] as const;

export function creatureDetails(entry: CreatureEntry): CatalogDetails {
    const context = { catalogId: 'creatures', entryId: entry.id };
    const armor = splitArmor(entry.armor);
    const details: CatalogDetails = {
        name: entry.name,
        type: entry.type,
        scale: scaleId(entry.scale, context),
        size: entry.size,
        willpower: diceToDots(entry.willpower, { ...context, detail: 'willpower' }, 10),
        abilities: entry.abilities.map((ability, index) => ({
            id: `${entry.id}-ability-${index}`,
            label: ability.name,
            value: diceToDots(ability.dice, { ...context, detail: 'abilities' }) ?? 0,
        })),
        armorName: armor.name ?? '',
        armorRating: armor.rating ?? '',
        attacks: entry.attacks.map((attack) => ({
            name: attack.name,
            type: attack.type,
            damage: attack.damage,
            range: '',
        })),
        movement: entry.movement,
        merits: entry.merits.map((merit, index) => ({
            id: `${entry.id}-merit-${index}`,
            label: merit.name,
            value: 0,
        })),
        flaws: entry.flaws.map((flaw, index) => ({
            id: `${entry.id}-flaw-${index}`,
            label: flaw.name,
            value: 0,
        })),
        description: entry.description,
        source: entry.source,
    };
    for (const key of ATTRIBUTE_DETAILS) {
        details[key] = diceToDots(entry[key], { ...context, detail: key });
    }
    return details;
}

export function vehicleDetails(entry: VehicleEntry): CatalogDetails {
    const context = { catalogId: 'vehicles', entryId: entry.id };
    const dots = (value: number | null, detail: string) =>
        value === null ? 0 : diceToDots(value, { ...context, detail });
    return {
        name: entry.name,
        model: entry.model,
        scale: scaleId(entry.scale, context),
        category: entry.category,
        crew: entry.crew,
        passengers: entry.passengers,
        cargo: entry.cargo,
        consumables: entry.consumables,
        length: entry.length,
        maneuverability: dots(entry.maneuverability, 'maneuverability'),
        durability: dots(entry.durability, 'durability'),
        durabilityReroll: entry.durabilityReroll,
        speed: String(entry.speed),
        altitude: entry.altitude,
        hyperdrive: dots(entry.hyperdrive, 'hyperdrive'),
        navComputer: entry.navComputer,
        commSensors: dots(entry.commSensors, 'commSensors'),
        sensorRange: entry.sensorRange === null ? null : String(entry.sensorRange),
        shields: dots(entry.shields, 'shields'),
        weapons: entry.weapons.map((weapon) => ({
            name: weapon.name,
            arc: arcId(weapon.arc),
            damage: weapon.damage,
            range: '',
        })),
        description: entry.description,
    };
}

/** Armor fills keep the catalog's own scalar details and add the sheet's split fields. */
export function armorDetails(entry: ArmorEntry): CatalogDetails {
    return {
        name: entry.name,
        classVal: entry.classVal,
        ar: entry.ar,
        description: entry.description,
        dexPenalty: entry.dexPenalty,
    };
}
