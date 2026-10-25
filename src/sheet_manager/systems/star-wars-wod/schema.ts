import { generateId } from '@site/src/shared/utils/random';
import { z } from 'zod';

import { ConditionMarkSchema } from '../../types/condition';
import { ImplantItemSchema, ItemSchema } from '../../types/equipment';
import {
    CustomSkillSchema,
    DEFAULT_ATTRIBUTE_VALUE,
    DEFAULT_SKILL_VALUE,
    TraitValueSchema,
} from '../../types/trait';
import {
    HealthSchema,
    ResourcePairSchema,
    Wod2eCoreShape,
    Wod2eMetadataSchema,
} from '../wod2e/ruleset/schema';

const boundedTextSchema = z.string().max(2_000).default('');
const boundedLabelSchema = z.string().max(120).default('');
const dotValueSchema = z.number().int().min(0).max(5);
const resourceValueSchema = z.number().int().min(0).max(10);

export const CharacterTypeSchema = z.enum(['sentient', 'droid', 'vehicle']);

const engineMetadata = Wod2eMetadataSchema.shape;

/**
 * The WoD 2e engine metadata plus what the Star Wars setting adds to it, in the order the flat
 * character has always listed its fields (the order shows in parse output and exports).
 */
export const CharacterMetadataSchema = z.object({
    name: engineMetadata.name,
    type: CharacterTypeSchema,
    template: z.string().min(1),
    player: engineMetadata.player,
    owner: engineMetadata.owner,
    adventure: engineMetadata.adventure,
    concept: engineMetadata.concept,
    nature: engineMetadata.nature,
    demeanor: engineMetadata.demeanor,
    species: z.string().optional(),
    homeWorld: z.string().optional(),
    age: engineMetadata.age,
    setting: engineMetadata.setting,
    gender: engineMetadata.gender,
    height: engineMetadata.height,
    build: engineMetadata.build,
    hair: engineMetadata.hair,
    eyes: engineMetadata.eyes,
    features: engineMetadata.features,
    biography: engineMetadata.biography,
    imageUrl: engineMetadata.imageUrl,
    portraitId: engineMetadata.portraitId,
    showPortrait: engineMetadata.showPortrait,
});

export const ForcePowerItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    value: dotValueSchema.default(0),
    catalogId: z.string().optional(),
});

/** What the Star Wars setting adds to the engine character. */
export const StarWarsSettingShape = {
    forceSkills: z.record(z.string(), TraitValueSchema).optional(),
    forcePoints: ResourcePairSchema.optional(),
    darkSideResistance: resourceValueSchema.optional(),
    forcePowerItems: z.array(ForcePowerItemSchema).default([]),
    implants: z.array(ImplantItemSchema).default([]),
};

/**
 * The flat character the app stored before documents: the engine and setting fields with the
 * document id inside. Droid data and the character capability are read through it.
 */
export const StarWarsCharacterSchema = z.object({
    id: z.string(),
    metadata: CharacterMetadataSchema,
    attributes: Wod2eCoreShape.attributes,
    skills: Wod2eCoreShape.skills,
    forceSkills: StarWarsSettingShape.forceSkills,
    virtues: Wod2eCoreShape.virtues,
    backgrounds: Wod2eCoreShape.backgrounds,
    merits: Wod2eCoreShape.merits,
    flaws: Wod2eCoreShape.flaws,
    willpower: Wod2eCoreShape.willpower,
    forcePoints: StarWarsSettingShape.forcePoints,
    darkSideResistance: StarWarsSettingShape.darkSideResistance,
    forcePowerItems: StarWarsSettingShape.forcePowerItems,
    health: Wod2eCoreShape.health,
    inventory: Wod2eCoreShape.inventory,
    armor: Wod2eCoreShape.armor,
    weapons: Wod2eCoreShape.weapons,
    implants: StarWarsSettingShape.implants,
    experience: Wod2eCoreShape.experience,
    customTalents: Wod2eCoreShape.customTalents,
    customSkills: Wod2eCoreShape.customSkills,
    customKnowledges: Wod2eCoreShape.customKnowledges,
    notes: Wod2eCoreShape.notes,
});

export type StarWarsCharacter = z.infer<typeof StarWarsCharacterSchema>;

export const CombatScaleSchema = z.enum([
    'death-star',
    'capital',
    'transport',
    'starfighter',
    'walker',
    'speeder',
    'character',
    'vermin',
]);

export const VehicleDamageSchema = z.object({
    levels: z.array(ConditionMarkSchema).length(7),
});

const EMPTY_TRACK = ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'] as const;

export const HealthCohortMemberSchema = z.object({
    id: z.string().min(1).max(128),
    label: boundedLabelSchema,
    health: HealthSchema,
});

export const DamageCohortMemberSchema = z.object({
    id: z.string().min(1).max(128),
    label: boundedLabelSchema,
    damage: VehicleDamageSchema,
});

const PhysicalMentalAttributesSchema = z.object({
    Strength: TraitValueSchema,
    Dexterity: TraitValueSchema,
    Stamina: TraitValueSchema,
    Perception: TraitValueSchema,
    Intelligence: TraitValueSchema,
    Wits: TraitValueSchema,
});

const FullAttributesSchema = PhysicalMentalAttributesSchema.extend({
    Charisma: TraitValueSchema,
    Manipulation: TraitValueSchema,
    Appearance: TraitValueSchema,
});

const ArmorProfileSchema = z.object({
    name: boundedLabelSchema,
    armorRating: boundedLabelSchema,
    dexterityModifier: boundedLabelSchema,
});

const AttackProfileSchema = z.object({
    id: z.string().min(1).max(128),
    name: boundedLabelSchema,
    type: boundedLabelSchema,
    damage: boundedLabelSchema,
    range: boundedLabelSchema.optional(),
});

const StarWarsCharacterMetadataSchema = CharacterMetadataSchema.extend({
    type: z.literal('sentient'),
});

/**
 * A Star Wars character is the WoD 2e engine character plus the setting's own fields (spec 012):
 * the same keys, limits, and defaults as the flat legacy shape it has always stored.
 */
export const StarWarsCharacterDataSchema = z.object({
    ...Wod2eCoreShape,
    ...StarWarsSettingShape,
    metadata: StarWarsCharacterMetadataSchema,
});

export const DroidDataSchema = StarWarsCharacterSchema.omit({
    id: true,
    forceSkills: true,
    health: true,
}).extend({
    metadata: CharacterMetadataSchema.extend({ type: z.literal('droid') }),
    builtInEquipment: z.array(ItemSchema).max(100).default([]),
    damage: VehicleDamageSchema,
});

export const CreatureDataSchema = z.object({
    name: boundedLabelSchema,
    species: boundedLabelSchema,
    type: boundedLabelSchema,
    scale: CombatScaleSchema.default('character'),
    size: boundedLabelSchema,
    owner: boundedLabelSchema,
    attributes: PhysicalMentalAttributesSchema,
    abilities: z.array(CustomSkillSchema).max(60).default([]),
    willpower: ResourcePairSchema,
    armor: ArmorProfileSchema,
    attacks: z.array(AttackProfileSchema).max(50).default([]),
    notes: boundedTextSchema,
    members: z.array(HealthCohortMemberSchema).min(1).max(24),
});

const VehicleConfigurationSchema = z.object({
    id: z.string().min(1).max(128),
    label: boundedLabelSchema,
});

const VehicleWeaponSchema = AttackProfileSchema.extend({
    arc: boundedLabelSchema,
});

export const VehicleDataSchema = z.object({
    name: boundedLabelSchema,
    model: boundedLabelSchema,
    owner: boundedLabelSchema,
    scale: CombatScaleSchema.default('speeder'),
    crew: boundedLabelSchema,
    length: boundedLabelSchema,
    cargoCapacity: boundedLabelSchema,
    passengers: boundedLabelSchema,
    consumables: boundedLabelSchema,
    durability: dotValueSchema,
    maneuverability: dotValueSchema,
    speed: boundedLabelSchema,
    altitude: boundedLabelSchema,
    communicationsSensors: dotValueSchema,
    sensorRange: boundedLabelSchema,
    hyperdrive: dotValueSchema,
    navigationComputer: boundedLabelSchema,
    shields: dotValueSchema,
    frontShields: dotValueSchema,
    rearShields: dotValueSchema,
    configuration: z.array(VehicleConfigurationSchema).max(20).default([]),
    weapons: z.array(VehicleWeaponSchema).max(50).default([]),
    notes: boundedTextSchema,
    members: z.array(DamageCohortMemberSchema).min(1).max(24),
});

export const FodderDataSchema = z.object({
    concept: boundedLabelSchema,
    notes: boundedTextSchema,
    attributes: FullAttributesSchema,
    abilities: z.array(CustomSkillSchema).max(30).default([]),
    willpower: resourceValueSchema,
    armor: ArmorProfileSchema,
    weapons: z.array(AttackProfileSchema).max(10).default([]),
    members: z.array(HealthCohortMemberSchema).min(1).max(24),
    /**
     * Visible health levels per member (typical fodder 3, tough 5, full 7). Groups saved before
     * the setting existed parse as 7 so no recorded damage is hidden; new groups start at 3.
     */
    trackLength: z.union([z.literal(3), z.literal(5), z.literal(7)]).default(7),
});

export type StarWarsCharacterData = z.infer<typeof StarWarsCharacterDataSchema>;
export type DroidData = z.infer<typeof DroidDataSchema>;
export type CreatureData = z.infer<typeof CreatureDataSchema>;
export type VehicleData = z.infer<typeof VehicleDataSchema>;
export type FodderData = z.infer<typeof FodderDataSchema>;

function createHealthMember(label = 'A') {
    return { id: generateId(), label, health: { levels: [...EMPTY_TRACK] } };
}

function createDamageMember(label = 'A') {
    return { id: generateId(), label, damage: { levels: [...EMPTY_TRACK] } };
}

function createPhysicalMentalAttributes() {
    return {
        Strength: { ...DEFAULT_ATTRIBUTE_VALUE },
        Dexterity: { ...DEFAULT_ATTRIBUTE_VALUE },
        Stamina: { ...DEFAULT_ATTRIBUTE_VALUE },
        Perception: { ...DEFAULT_ATTRIBUTE_VALUE },
        Intelligence: { ...DEFAULT_ATTRIBUTE_VALUE },
        Wits: { ...DEFAULT_ATTRIBUTE_VALUE },
    };
}

function createFullAttributes() {
    return {
        ...createPhysicalMentalAttributes(),
        Charisma: { ...DEFAULT_ATTRIBUTE_VALUE },
        Manipulation: { ...DEFAULT_ATTRIBUTE_VALUE },
        Appearance: { ...DEFAULT_ATTRIBUTE_VALUE },
    };
}

export function createDefaultCharacter(): StarWarsCharacter {
    return {
        id: generateId(),
        metadata: {
            name: '',
            type: 'sentient',
            template: 'standard',
            player: '',
            owner: '',
            adventure: '',
            concept: '',
            nature: '',
            demeanor: '',
            species: '',
            homeWorld: '',
            age: '',
            setting: 'Star Wars WoD 2e',
            gender: '',
            height: '',
            build: '',
            hair: '',
            eyes: '',
            features: '',
            biography: '',
            imageUrl: '',
        },
        attributes: {
            Strength: { ...DEFAULT_ATTRIBUTE_VALUE },
            Dexterity: { ...DEFAULT_ATTRIBUTE_VALUE },
            Stamina: { ...DEFAULT_ATTRIBUTE_VALUE },
            Charisma: { ...DEFAULT_ATTRIBUTE_VALUE },
            Manipulation: { ...DEFAULT_ATTRIBUTE_VALUE },
            Appearance: { ...DEFAULT_ATTRIBUTE_VALUE },
            Perception: { ...DEFAULT_ATTRIBUTE_VALUE },
            Intelligence: { ...DEFAULT_ATTRIBUTE_VALUE },
            Wits: { ...DEFAULT_ATTRIBUTE_VALUE },
        },
        skills: {},
        forceSkills: {},
        virtues: {
            Conscience: { ...DEFAULT_ATTRIBUTE_VALUE },
            Passion: { ...DEFAULT_ATTRIBUTE_VALUE },
            'Self Control': { ...DEFAULT_ATTRIBUTE_VALUE },
        },
        backgrounds: [],
        merits: [],
        flaws: [],
        willpower: { current: 5, max: 5 },
        forcePoints: { current: 0, max: 0 },
        darkSideResistance: 5,
        forcePowerItems: [],
        health: {
            levels: ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
        },
        inventory: [],
        armor: [],
        weapons: [],
        implants: [],
        experience: { total: 0, spent: 0 },
        customTalents: [],
        customSkills: [],
        customKnowledges: [],
        notes: '',
    };
}

export function createDefaultStarWarsCharacterData(): StarWarsCharacterData {
    const data = StarWarsCharacterDataSchema.parse(createDefaultCharacter());
    return { ...data, metadata: { ...data.metadata, type: 'sentient' } };
}

export function createDefaultDroidData(): DroidData {
    const character = createDefaultCharacter();
    return DroidDataSchema.parse({
        ...character,
        metadata: { ...character.metadata, type: 'droid' },
        builtInEquipment: [],
        damage: character.health,
    });
}

export function createDefaultCreatureData(): CreatureData {
    return {
        name: '',
        species: '',
        type: '',
        scale: 'character',
        size: '',
        owner: '',
        attributes: createPhysicalMentalAttributes(),
        abilities: [],
        willpower: { current: 1, max: 1 },
        armor: { name: '', armorRating: '', dexterityModifier: '' },
        attacks: [],
        notes: '',
        members: [createHealthMember()],
    };
}

export function createDefaultVehicleData(): VehicleData {
    return {
        name: '',
        model: '',
        owner: '',
        scale: 'speeder',
        crew: '',
        length: '',
        cargoCapacity: '',
        passengers: '',
        consumables: '',
        durability: 0,
        maneuverability: 0,
        speed: '',
        altitude: '',
        communicationsSensors: 0,
        sensorRange: '',
        hyperdrive: 0,
        navigationComputer: '',
        shields: 0,
        frontShields: 0,
        rearShields: 0,
        configuration: [],
        weapons: [],
        notes: '',
        members: [createDamageMember()],
    };
}

export function createDefaultFodderData(): FodderData {
    return {
        concept: '',
        notes: '',
        attributes: createFullAttributes(),
        abilities: [
            'Alertness',
            'Athletics',
            'Blaster',
            'Brawl',
            'Dodge',
            'Gunnery',
            'Melee',
            'Pilot',
            'Stealth',
        ].map((label) => ({ id: generateId(), label, ...DEFAULT_SKILL_VALUE })),
        willpower: 1,
        armor: { name: '', armorRating: '', dexterityModifier: '' },
        weapons: [],
        members: [createHealthMember()],
        trackLength: 3,
    };
}
