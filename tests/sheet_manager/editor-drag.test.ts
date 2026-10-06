import {
    DRAG_THRESHOLD_PX,
    type DragPhase,
    dragTransition,
    type DropSlot,
    nearestPlacement,
    parseSlotKey,
    PREVIEW_DWELL_MS,
    type Rect,
    slotKey,
} from '@site/src/sheet_manager/features/template-editor/useEditorDrag';
import { describe, expect, it } from 'vitest';

const rect = (left: number, top: number, right: number, bottom: number): Rect => ({
    left,
    top,
    right,
    bottom,
});

const slot = (key: string, rectangle: Rect): DropSlot => ({
    key,
    placement: parseSlotKey(key)!,
    rect: rectangle,
});

describe('slot keys', () => {
    it('round-trip placements', () => {
        for (const placement of [
            { parentId: null, index: 0, column: null },
            { parentId: 'sec-a1', index: 3, column: 2 },
        ]) {
            expect(parseSlotKey(slotKey(placement))).toEqual(placement);
        }
        expect(parseSlotKey('nonsense')).toBeUndefined();
    });
});

describe('nearestPlacement (spec 022, R5)', () => {
    // A page with a group "box" (100–300) between two root slots, and an empty column zone.
    const containers = new Map<string, Rect>([
        ['root', rect(0, 0, 400, 600)],
        ['box', rect(0, 100, 400, 300)],
    ]);
    const slots = [
        slot('root:0:-', rect(0, 90, 400, 92)),
        slot('box:0:-', rect(0, 120, 400, 122)),
        slot('box:1:-', rect(0, 200, 400, 202)),
        slot('root:1:-', rect(0, 310, 400, 312)),
        slot('root:2:2', rect(200, 400, 400, 460)),
    ];

    it('prefers the slots of the innermost container under the pointer', () => {
        // Closer to the root slot below the box, but inside the box.
        expect(nearestPlacement(slots, { x: 50, y: 290 }, containers)?.key).toBe('box:1:-');
        expect(nearestPlacement(slots, { x: 50, y: 125 }, containers)?.key).toBe('box:0:-');
    });

    it('uses the root slots between containers and the empty column zone', () => {
        expect(nearestPlacement(slots, { x: 50, y: 330 }, containers)?.key).toBe('root:1:-');
        expect(nearestPlacement(slots, { x: 300, y: 430 }, containers)?.key).toBe('root:2:2');
    });

    it('skips refused slots: the dragged subtree and no-op neighbours', () => {
        const refuseBox = (candidate: DropSlot) => candidate.placement.parentId !== 'box';
        expect(nearestPlacement(slots, { x: 50, y: 200 }, containers, refuseBox)?.key).toBe(
            'root:0:-'
        );
        const notNoOp = (candidate: DropSlot) => candidate.key !== 'root:1:-';
        expect(nearestPlacement(slots, { x: 50, y: 330 }, containers, notNoOp)?.key).toBe(
            'root:2:2'
        );
    });

    it('falls back to the nearest slot outside every container', () => {
        expect(nearestPlacement(slots, { x: 50, y: 900 }, containers)?.key).toBe('root:2:2');
        expect(nearestPlacement([], { x: 0, y: 0 }, containers)).toBeUndefined();
    });
});

describe('drag state machine (data-model.md, DragState)', () => {
    type Target = { key: string };
    const a: Target = { key: 'a' };
    const b: Target = { key: 'b' };
    const down = (): DragPhase<Target> =>
        dragTransition<Target>(
            { phase: 'idle' },
            { type: 'down', nodeId: 'n', point: { x: 0, y: 0 } }
        );

    it('waits for the threshold before dragging', () => {
        const pending = down();
        expect(pending.phase).toBe('pending');
        const still = dragTransition(pending, {
            type: 'move',
            point: { x: DRAG_THRESHOLD_PX, y: 0 },
            now: 10,
            target: a,
        });
        expect(still.phase).toBe('pending');
        const dragging = dragTransition(pending, {
            type: 'move',
            point: { x: DRAG_THRESHOLD_PX + 1, y: 0 },
            now: 10,
            target: a,
        });
        expect(dragging).toMatchObject({ phase: 'dragging', target: a, since: 10 });
    });

    it('previews after resting on one target, and only then', () => {
        let state = dragTransition(down(), {
            type: 'move',
            point: { x: 20, y: 0 },
            now: 0,
            target: a,
        });
        state = dragTransition(state, { type: 'tick', now: PREVIEW_DWELL_MS - 1 });
        expect(state.phase).toBe('dragging');
        state = dragTransition(state, {
            type: 'move',
            point: { x: 21, y: 0 },
            now: 200,
            target: b,
        });
        state = dragTransition(state, { type: 'tick', now: 200 + PREVIEW_DWELL_MS - 1 });
        expect(state.phase).toBe('dragging');
        state = dragTransition(state, { type: 'tick', now: 200 + PREVIEW_DWELL_MS });
        expect(state).toMatchObject({ phase: 'previewing', target: b });
    });

    it('keeps the preview until another target is nearest and the pointer moved 8 px', () => {
        let state = dragTransition(down(), {
            type: 'move',
            point: { x: 20, y: 0 },
            now: 0,
            target: a,
        });
        state = dragTransition(state, { type: 'tick', now: PREVIEW_DWELL_MS });
        expect(state.phase).toBe('previewing');
        state = dragTransition(state, {
            type: 'move',
            point: { x: 25, y: 0 },
            now: 400,
            target: b,
        });
        expect(state).toMatchObject({ phase: 'previewing', target: a });
        state = dragTransition(state, {
            type: 'move',
            point: { x: 29, y: 0 },
            now: 410,
            target: b,
        });
        expect(state).toMatchObject({ phase: 'dragging', target: b, since: 410 });
    });

    it('returns to idle on cancel from any phase', () => {
        const dragging = dragTransition(down(), {
            type: 'move',
            point: { x: 20, y: 0 },
            now: 0,
            target: a,
        });
        for (const state of [down(), dragging]) {
            expect(dragTransition(state, { type: 'cancel' })).toEqual({ phase: 'idle' });
        }
    });
});
