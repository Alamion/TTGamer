import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

/**
 * Names the draw rule below in stored shared rolls (spec 030, D7): a viewer recomputes a roll only
 * when it knows the algorithm, so a later change to the draw order never makes old rolls look
 * forged.
 */
export const SEEDED_ROLL_ALGORITHM = 'ttg-sha256-ctr-1';

/**
 * A deterministic random source for shared rolls, fixed by the cloud API contract: draw `i` (from
 * 0) is the first four bytes of SHA-256 over the UTF-8 text `seed:i`, big-endian, divided by 2^32,
 * so it is always below 1. A counter rather than one hash per seed, because explosions and rerolls
 * need as many draws as the dice ask for. Synchronous, as the evaluator draws synchronously.
 */
export function createSeededRandom(seed: string): () => number {
    let draw = 0;
    return () => {
        const hash = sha256(utf8ToBytes(`${seed}:${draw++}`));
        return new DataView(hash.buffer, hash.byteOffset, 4).getUint32(0) / 2 ** 32;
    };
}
