import {
    bodyTarget,
    edgeAt,
    gapAt,
} from '@site/src/sheet_manager/features/sheet/panes/dropTargets';
import { describe, expect, it } from 'vitest';

const box = { left: 100, top: 50, width: 400, height: 200 };

describe('where a dragged tab lands (spec 036, D7)', () => {
    it('picks the edge in its outer quarter, the nearest when two are close', () => {
        expect(edgeAt(box, 110, 150)).toBe('left');
        expect(edgeAt(box, 490, 150)).toBe('right');
        expect(edgeAt(box, 300, 55)).toBe('top');
        expect(edgeAt(box, 300, 245)).toBe('bottom');
        expect(edgeAt(box, 102, 248)).toBe('left');
        expect(edgeAt(box, 300, 150)).toBeNull();
        expect(edgeAt({ ...box, width: 0 }, 100, 50)).toBeNull();
    });

    it('finds the gap of a strip from the middles of its tabs', () => {
        const tabs = [
            { left: 0, width: 100 },
            { left: 100, width: 100 },
            { left: 200, width: 100 },
        ];
        expect(gapAt(tabs, 10)).toBe(0);
        expect(gapAt(tabs, 60)).toBe(1);
        expect(gapAt(tabs, 160)).toBe(2);
        expect(gapAt(tabs, 290)).toBe(3);
        expect(gapAt([], 5)).toBe(0);
    });

    it('drops on the middle where splitting is not allowed', () => {
        expect(bodyTarget('A', 'left', () => true)).toEqual({
            kind: 'edge',
            groupId: 'A',
            side: 'left',
        });
        expect(bodyTarget('A', 'left', () => false)).toEqual({ kind: 'middle', groupId: 'A' });
        expect(bodyTarget('A', null, () => true)).toEqual({ kind: 'middle', groupId: 'A' });
    });
});
