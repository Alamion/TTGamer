import { z } from 'zod';

import { ABILITIES } from '../src/data/abilities';
import { ARMOR } from '../src/data/armorData';
import { ATTRIBUTES } from '../src/data/attributes';
import { BACKGROUNDS } from '../src/data/backgroundsData';
import { CONSUMABLE_WEAPONS } from '../src/data/consumableWeaponsData';
import { CREATURES } from '../src/data/creatureData';
import { FORCE_POWERS } from '../src/data/forcePowersData';
import { FORCE_SKILLS } from '../src/data/forceSkills';
import { MELEE_WEAPONS } from '../src/data/meleeWeaponsData';
import { MERITS_FLAWS } from '../src/data/meritsFlawsData';
import { RANGED_WEAPONS } from '../src/data/rangedWeaponsData';
import { ALL_ERAS, SPECIES } from '../src/data/speciesData';
import { TERMINOLOGY } from '../src/data/terminologyData';
import { TOOLS_GEAR } from '../src/data/toolsGearData';
import { VEHICLES } from '../src/data/vehicleData';

const namedEntrySchema = z
    .object({
        id: z.string().trim().min(1),
        name: z.string().trim().min(1),
    })
    .passthrough();

const terminologyEntrySchema = z
    .object({
        id: z.string().trim().min(1),
        english: z.string().trim().min(1),
        russian: z.string().trim().min(1),
    })
    .passthrough();

const catalogs = {
    abilities: ABILITIES,
    armor: ARMOR,
    attributes: ATTRIBUTES,
    backgrounds: BACKGROUNDS,
    consumableWeapons: CONSUMABLE_WEAPONS,
    creatures: CREATURES,
    forcePowers: FORCE_POWERS,
    forceSkills: FORCE_SKILLS,
    meleeWeapons: MELEE_WEAPONS,
    meritsFlaws: MERITS_FLAWS,
    rangedWeapons: RANGED_WEAPONS,
    species: SPECIES,
    toolsGear: TOOLS_GEAR,
    vehicles: VEHICLES,
} as const;

const errors: string[] = [];

function validateUniqueIds(name: string, entries: readonly { id: string }[]) {
    const seen = new Set<string>();

    for (const entry of entries) {
        if (seen.has(entry.id)) {
            errors.push(`${name}: duplicate id "${entry.id}"`);
        }
        seen.add(entry.id);
    }
}

function validateUniqueNames(name: string, entries: readonly { name: string }[]) {
    const seen = new Set<string>();
    for (const entry of entries) {
        const normalized = entry.name.trim().toLocaleLowerCase('en');
        if (seen.has(normalized)) errors.push(`${name}: duplicate normalized name "${entry.name}"`);
        seen.add(normalized);
    }
}

function validateFiniteNumbers(name: string, value: unknown, path = name): void {
    if (typeof value === 'number' && !Number.isFinite(value)) {
        errors.push(`${path}: numeric value must be finite`);
    } else if (Array.isArray(value)) {
        value.forEach((item, index) => validateFiniteNumbers(name, item, `${path}[${index}]`));
    } else if (value !== null && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
            validateFiniteNumbers(name, child, `${path}.${key}`);
        }
    }
}

for (const [name, entries] of Object.entries(catalogs)) {
    const result = z.array(namedEntrySchema).safeParse(entries);
    if (!result.success) {
        errors.push(`${name}: ${result.error.issues.map((issue) => issue.message).join(', ')}`);
    }
    validateUniqueIds(name, entries);
    if (name !== 'species') validateUniqueNames(name, entries);
    validateFiniteNumbers(name, entries);
}

const terminologyResult = z.array(terminologyEntrySchema).safeParse(TERMINOLOGY);
if (!terminologyResult.success) {
    errors.push(
        `terminology: ${terminologyResult.error.issues.map((issue) => issue.message).join(', ')}`
    );
}
validateUniqueIds('terminology', TERMINOLOGY);

const meritFlawIds = new Set(MERITS_FLAWS.map(({ id }) => id));
const eraNames = new Set(ALL_ERAS);
for (const species of SPECIES) {
    for (const reference of [...species.merits, ...species.flaws]) {
        if (!meritFlawIds.has(reference)) {
            errors.push(`species/${species.id}: unknown merit or flaw "${reference}"`);
        }
    }
    for (const era of species.eras) {
        if (!eraNames.has(era)) {
            errors.push(`species/${species.id}: unknown era "${era}"`);
        }
    }
}

const forceSkillNames = new Set(FORCE_SKILLS.map(({ name }) => name));
for (const power of FORCE_POWERS) {
    for (const skill of power.skills) {
        if (!forceSkillNames.has(skill)) {
            errors.push(`forcePowers/${power.id}: unknown Force skill "${skill}"`);
        }
    }
}

const creatureScales = new Set([
    'Death Star',
    'Capital',
    'Transport',
    'Starfighter',
    'Walker',
    'Speeder',
    'Character',
    'Vermin',
]);
for (const creature of CREATURES) {
    if (!creatureScales.has(creature.scale)) {
        errors.push(`creatures/${creature.id}: unknown scale "${creature.scale}"`);
    }
}

for (const vehicle of VEHICLES) {
    if (!['Speeder', 'Walker', 'Starfighter', 'Transport', 'Capital'].includes(vehicle.scale)) {
        errors.push(`vehicles/${vehicle.id}: unknown scale "${vehicle.scale}"`);
    }
    for (const era of vehicle.eras) {
        if (!eraNames.has(era)) {
            errors.push(`vehicles/${vehicle.id}: unknown era "${era}"`);
        }
    }
}

if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
} else {
    console.log(`Validated ${Object.keys(catalogs).length + 1} catalogs.`);
}
