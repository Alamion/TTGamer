import { ARMOR } from '../../../data/armorData';
import { BACKGROUNDS } from '../../../data/backgroundsData';
import { CREATURES } from '../../../data/creatureData';
import { FORCE_POWERS } from '../../../data/forcePowersData';
import { FORCE_SKILLS } from '../../../data/forceSkills';
import { MELEE_WEAPONS } from '../../../data/meleeWeaponsData';
import { MERITS_FLAWS } from '../../../data/meritsFlawsData';
import { RANGED_WEAPONS } from '../../../data/rangedWeaponsData';
import { SPECIES } from '../../../data/speciesData';
import { TOOLS_GEAR } from '../../../data/toolsGearData';
import { VEHICLES } from '../../../data/vehicleData';
import {
    anyCatalog,
    booleanDetail,
    type CatalogBindingEntry,
    defineCatalog,
    numberDetail,
    rowsDetail,
    textDetail,
} from '../catalogs';
import { armorDetails, creatureDetails, vehicleDetails } from './catalogAdapters';

/** Star Wars WoD catalogs: the only path from `src/data` Star Wars data into templates. */

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

export const starWarsCatalogs: readonly CatalogBindingEntry[] = [
    anyCatalog(MELEE_WEAPONS_BINDING),
    anyCatalog(RANGED_WEAPONS_BINDING),
    anyCatalog(ARMOR_BINDING),
    anyCatalog(TOOLS_GEAR_BINDING),
    anyCatalog(FORCE_POWERS_BINDING),
    anyCatalog(FORCE_SKILLS_BINDING),
    anyCatalog(SPECIES_BINDING),
    anyCatalog(MERITS_FLAWS_BINDING),
    anyCatalog(BACKGROUNDS_BINDING),
    anyCatalog(CREATURES_BINDING),
    anyCatalog(VEHICLES_BINDING),
];
