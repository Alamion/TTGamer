import { CREATURES } from '@site/src/data/creatureData';
import { VEHICLES } from '@site/src/data/vehicleData';
import {
    arcId,
    creatureDetails,
    diceToDots,
    scaleId,
    splitArmor,
    vehicleDetails,
} from '@site/src/sheet_manager/systems/star-wars-wod/catalogAdapters';
import { leadingInteger } from '@site/src/sheet_manager/systems/star-wars-wod/entityBindings';
import {
    createDefaultCreatureData,
    createDefaultFodderData,
    createDefaultVehicleData,
    CreatureDataSchema,
    FodderDataSchema,
    VehicleDataSchema,
} from '@site/src/sheet_manager/systems/star-wars-wod/schema';
import {
    boundWriteUpdate,
    listDocumentBindings,
    readBoundNumber,
    resolveWritableBinding,
} from '@site/src/sheet_manager/systems/templateBindings';
import { describe, expect, it } from 'vitest';
import type { ZodTypeAny } from 'zod';

import { takeSheetIssues } from '../setup/sheetIssues';

const SYSTEM = 'star-wars-wod';

/** Applies coordinate writes the way a catalog fill does, then re-parses like the store. */
function applyWrites(
    kind: string,
    schema: ZodTypeAny,
    data: Record<string, unknown>,
    writes: Record<string, unknown>
) {
    let next = { ...data };
    for (const [coordinate, value] of Object.entries(writes)) {
        if (value === undefined) continue;
        const binding = resolveWritableBinding(SYSTEM, kind, coordinate);
        expect(binding, `${kind}:${coordinate}`).toBeDefined();
        next = { ...next, ...boundWriteUpdate(binding!, next, value) };
    }
    return schema.parse(next) as Record<string, unknown>;
}

describe('entity document bindings (feature 007)', () => {
    it('declares bindings for every entity kind and none leak across kinds', () => {
        for (const kind of ['creature', 'vehicle', 'group']) {
            expect(listDocumentBindings(SYSTEM, kind).length, kind).toBeGreaterThan(5);
        }
        expect(resolveWritableBinding(SYSTEM, 'creature', 'model')).toBeUndefined();
        expect(resolveWritableBinding(SYSTEM, 'vehicle', 'species')).toBeUndefined();
        expect(resolveWritableBinding(SYSTEM, 'group', 'charisma')).toBeDefined();
        expect(resolveWritableBinding(SYSTEM, 'creature', 'charisma')).toBeUndefined();
    });

    it('round-trips creature values through the kind schema', () => {
        const data = applyWrites('creature', CreatureDataSchema, createDefaultCreatureData(), {
            name: 'Ice fang',
            species: 'Wampa',
            'creature-type': 'Snow predator',
            scale: 'speeder',
            strength: 5,
            willpower: 6,
            'armor-armor-rating': '+1D',
            attacks: [{ name: 'Claw', type: 'L', damage: 'STR+1D' }],
            abilities: [{ label: 'Stealth', value: 3 }],
        });
        expect(data.species).toBe('Wampa');
        expect(data.type).toBe('Snow predator');
        expect(data.scale).toBe('speeder');
        expect((data.attributes as Record<string, { value: number }>).Strength.value).toBe(5);
        expect(data.willpower).toEqual({ current: 6, max: 6 });
        expect((data.armor as { armorRating: string }).armorRating).toBe('+1D');
        expect(data.attacks).toHaveLength(1);
        expect((data.abilities as Array<{ label: string }>)[0]?.label).toBe('Stealth');
    });

    it('round-trips vehicle ratings, enum scale, and weapon rows', () => {
        const data = applyWrites('vehicle', VehicleDataSchema, createDefaultVehicleData(), {
            maneuverability: 3,
            'communications-sensors': 2,
            'cargo-capacity': '110 kg',
            scale: 'starfighter',
            weapons: [{ name: 'Laser cannons', arc: 'front', damage: '6D' }],
        });
        expect(data.maneuverability).toBe(3);
        expect(data.communicationsSensors).toBe(2);
        expect(data.cargoCapacity).toBe('110 kg');
        expect(data.scale).toBe('starfighter');
        expect((data.weapons as Array<{ arc: string }>)[0]?.arc).toBe('front');
    });

    it('keeps an unknown scale unchanged and clamps ratings to the sheet range', () => {
        const data = applyWrites('vehicle', VehicleDataSchema, createDefaultVehicleData(), {
            scale: 'not-a-scale',
            durability: 9,
        });
        expect(data.scale).toBe('speeder');
        expect(data.durability).toBe(5);
    });

    it('reads formula numbers from traits and dice labels', () => {
        const creature = createDefaultCreatureData();
        creature.attributes.Stamina.value = 4;
        creature.armor.armorRating = '+2D';
        expect(readBoundNumber(SYSTEM, 'creature', creature, 'stamina')).toEqual({
            bound: true,
            value: 4,
        });
        expect(readBoundNumber(SYSTEM, 'creature', creature, 'armor-armor-rating')).toEqual({
            bound: true,
            value: 2,
        });
        expect(leadingInteger('')).toBe(0);
        expect(leadingInteger('-2D')).toBe(-2);
        expect(leadingInteger('hide')).toBeUndefined();
    });

    it('parses fodder groups saved before track lengths with the full track', () => {
        const legacy = { ...createDefaultFodderData() } as Record<string, unknown>;
        delete legacy.trackLength;
        const members = [
            {
                id: 'm1',
                label: 'A',
                health: {
                    levels: ['cross', 'cross', 'cross', 'cross', 'slash', 'empty', 'empty'],
                },
            },
        ];
        const parsed = FodderDataSchema.parse({ ...legacy, members });
        expect(parsed.trackLength).toBe(7);
        expect(parsed.members[0]?.health.levels.slice(0, 5)).toEqual([
            'cross',
            'cross',
            'cross',
            'cross',
            'slash',
        ]);
        expect(createDefaultFodderData().trackLength).toBe(3);
        expect(FodderDataSchema.safeParse({ ...legacy, members, trackLength: 4 }).success).toBe(
            false
        );
    });
});

describe('Star Wars catalog adapters (feature 007)', () => {
    const context = { catalogId: 'test', entryId: 'entry', detail: 'value' };

    it('converts dice labels to dots and reports clamping', () => {
        expect(diceToDots('5D', context)).toBe(5);
        expect(diceToDots('3D+2', context)).toBe(3);
        expect(diceToDots('STR+1D', context)).toBeUndefined();
        expect(diceToDots('8D', context)).toBe(5);
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['catalog-detail-out-of-range']);
    });

    it('maps scale names, armor labels, and arcs', () => {
        expect(scaleId('Speeder', context)).toBe('speeder');
        expect(scaleId('Death Star', context)).toBe('death-star');
        expect(splitArmor('Tough hide +1D')).toEqual({ name: 'Tough hide', rating: '+1D' });
        expect(splitArmor('Leather')).toEqual({ name: 'Leather', rating: null });
        expect(splitArmor(null)).toEqual({ name: null, rating: null });
        expect(arcId('Front')).toBe('front');
        expect(arcId('Forward/left')).toBe('Forward/left');
        expect(takeSheetIssues()).toEqual([]);
    });

    it('turns every bestiary entry into schema-valid creature values', () => {
        for (const entry of CREATURES) {
            const details = creatureDetails(entry);
            const data = applyWrites('creature', CreatureDataSchema, createDefaultCreatureData(), {
                species: details.name,
                'creature-type': details.type,
                scale: details.scale,
                size: details.size,
                strength: details.strength,
                dexterity: details.dexterity,
                stamina: details.stamina,
                perception: details.perception,
                intelligence: details.intelligence,
                wits: details.wits,
                willpower: details.willpower,
                abilities: details.abilities,
                'armor-name': details.armorName,
                'armor-armor-rating': details.armorRating,
                attacks: details.attacks,
            });
            expect(data.species, entry.id).toBe(entry.name);
        }
        takeSheetIssues();
        const wampa = creatureDetails(CREATURES.find(({ id }) => id === 'wampa')!);
        expect(wampa.strength).toBe(5);
        expect(wampa.willpower).toBe(5);
        expect(wampa.armorName).toBe('Tough hide');
        expect(wampa.merits).toHaveLength(3);
    });

    it('turns every catalog vehicle into schema-valid vehicle values', () => {
        for (const entry of VEHICLES) {
            const details = vehicleDetails(entry);
            const data = applyWrites('vehicle', VehicleDataSchema, createDefaultVehicleData(), {
                model: details.model,
                scale: details.scale,
                crew: details.crew,
                'cargo-capacity': details.cargo,
                consumables: details.consumables,
                maneuverability: details.maneuverability,
                durability: details.durability,
                hyperdrive: details.hyperdrive,
                'communications-sensors': details.commSensors,
                'sensor-range': details.sensorRange,
                shields: details.shields,
                speed: details.speed,
                weapons: details.weapons,
            });
            expect(data.model, entry.id).toBe(entry.model);
        }
        takeSheetIssues();
        const xwing = vehicleDetails(VEHICLES.find(({ id }) => id === 'x-wing')!);
        expect(xwing.scale).toBe('starfighter');
        expect((xwing.weapons as Array<{ arc: string }>)[0]?.arc).toBe('front');
    });
});
