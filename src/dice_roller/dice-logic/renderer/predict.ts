import { Quaternion } from 'three';

import {
    ANGULAR_VELOCITY_THRESHOLD,
    MAX_ROLL_SECONDS,
    REST_SECONDS,
    REST_WAKE_FACTOR,
    VELOCITY_THRESHOLD,
} from '../../utils/constants';
import type { PhysicsWorld } from './physics';
import type { DiceShape } from './shapes';

/**
 * Replays the world from its current state in a copy until `dice` rest by the renderer's own
 * rule (still for REST_SECONDS, woken only when knocked) or MAX_ROLL_SECONDS pass, and
 * returns the face each die's body then has up, before any face offset. Deterministic: the
 * live world takes the same fixed steps from the same state, so it lands the same way unless
 * something outside the throw — a click, another roll — touches the dice.
 */
export function predictRestingFaces(
    world: PhysicsWorld,
    dice: DiceShape[],
    step: number
): number[] {
    const { world: copy, bodies } = world.cloneForPrediction();
    const replayed = dice.map((die) => bodies.get(die.body)!);
    const restingSince: (number | null)[] = dice.map(() => null);
    const stopped = dice.map(() => false);

    for (let elapsed = step; elapsed <= MAX_ROLL_SECONDS; elapsed += step) {
        copy.world.step(step);
        replayed.forEach((body, index) => {
            const slack = stopped[index] ? REST_WAKE_FACTOR : 1;
            const { x, y } = body.angularVelocity;
            const still =
                body.velocity.length() < VELOCITY_THRESHOLD * slack &&
                Math.hypot(x, y) < ANGULAR_VELOCITY_THRESHOLD * slack;
            if (!still) {
                stopped[index] = false;
                restingSince[index] = null;
            } else if (restingSince[index] === null) {
                restingSince[index] = elapsed;
            } else if (elapsed - restingSince[index]! >= REST_SECONDS) {
                stopped[index] = true;
            }
        });
        if (stopped.every(Boolean)) break;
    }

    return dice.map((die, index) => {
        const { x, y, z, w } = replayed[index].quaternion;
        return die.upFace(new Quaternion(x, y, z, w));
    });
}
