import {
    fitSizes,
    moveDivider,
    weightsOf,
} from '@site/src/sheet_manager/features/sheet/panes/layout';
import { describe, expect, it } from 'vitest';

describe('sizes along one axis', () => {
    it('are equal for equal weights and follow the weights otherwise', () => {
        expect(fitSizes([1, 1], 994)).toEqual([497, 497]);
        expect(fitSizes([3, 1], 1000)).toEqual([680, 320]);
        const [left, right] = fitSizes([2, 1], 1000);
        expect(left! / right!).toBeGreaterThan(1.99);
    });

    it('lift a small child to its minimum and take the difference from the others', () => {
        const sizes = fitSizes([0.1, 1, 1], 988);
        expect(sizes[0]).toBe(320);
        expect(sizes.reduce((a, b) => a + b, 0)).toBe(988);
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(320);
    });

    it('respect a minimum per child (a row of three groups inside a column)', () => {
        const sizes = fitSizes([1, 1], 1300, [972, 320]);
        expect(sizes).toEqual([972, 328]);
    });

    it('keep a divider drag between the neighbours and above their minimums', () => {
        expect(moveDivider([400, 400, 400], 0, 440)).toEqual([440, 360, 400]);
        expect(moveDivider([400, 400, 400], 0, 900)).toEqual([480, 320, 400]);
        expect(moveDivider([400, 400, 400], 1, 100)).toEqual([400, 320, 480]);
        expect(moveDivider([300, 300], 0, 10, [200, 200])).toEqual([200, 400]);
    });

    it('average one when stored', () => {
        const weights = weightsOf([500, 250, 250]);
        expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(3, 2);
    });
});
