import { RollCancelledError } from '@site/src/dice_roller/dice-logic/errors';
import { describe, expect, it } from 'vitest';

describe('RollCancelledError', () => {
    it('is an instance of Error', () => {
        const err = new RollCancelledError();
        expect(err).toBeInstanceOf(Error);
    });

    it('is an instance of RollCancelledError', () => {
        const err = new RollCancelledError();
        expect(err).toBeInstanceOf(RollCancelledError);
    });

    it('has the correct message', () => {
        const err = new RollCancelledError();
        expect(err.message).toBe('Roll cancelled by user');
    });

    it('has the correct name', () => {
        const err = new RollCancelledError();
        expect(err.name).toBe('RollCancelledError');
    });

    it('can be thrown and caught by type', () => {
        expect(() => {
            throw new RollCancelledError();
        }).toThrow(RollCancelledError);
    });

    it('can be thrown and caught by message', () => {
        expect(() => {
            throw new RollCancelledError();
        }).toThrow('Roll cancelled by user');
    });
});
