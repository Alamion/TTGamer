import { Wod2eCharacterDataSchema } from './schema';

/** Version 1 called crosses lethal: neither old mark establishes an aggravated wound. */
export function migrateWod2eCharacter(data: unknown, fromVersion: number): unknown {
    if (fromVersion !== 1) return undefined;
    const previous = Wod2eCharacterDataSchema.parse(data);
    return {
        ...previous,
        legacyHealth: previous.health,
        health: {
            levels: previous.health.levels.map((mark) => (mark === 'empty' ? 'empty' : 'slash')),
        },
    };
}
