import { createEvent, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * A stand-in for the browser's DataTransfer, enough for dragging tabs. Testing Library copies its
 * own properties onto a real one, so the effects are left to that one (copied, they could not be
 * set).
 */
export function transfer() {
    const data = new Map<string, string>();
    return {
        types: [] as string[],
        setData(type: string, value: string) {
            data.set(type, value);
            if (!this.types.includes(type)) this.types.push(type);
        },
        getData: (type: string) => data.get(type) ?? '',
    };
}

/**
 * happy-dom lays nothing out: every tab is 100 px wide in its strip, and every other element is a
 * 400 × 400 box at the origin (a group's page, where the edges split it).
 */
export function stubBoxes() {
    return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: HTMLElement
    ) {
        if (this.matches('[data-tab]')) {
            const index = [...(this.parentElement?.querySelectorAll('[data-tab]') ?? [])].indexOf(
                this
            );
            return DOMRect.fromRect({ x: index * 100, y: 0, width: 100, height: 30 });
        }
        return DOMRect.fromRect({ x: 0, y: 0, width: 400, height: 400 });
    });
}

/** The draggable part of a tab (the tab button's frame). */
export const draggableOf = (tab: HTMLElement) => tab.closest<HTMLElement>('[data-tab]')!;

type Transfer = ReturnType<typeof transfer>;
type Point = { clientX: number; clientY: number };

/**
 * Fires a drag event with a point: happy-dom's DragEvent takes no coordinates from its init, so
 * they are set on the event itself.
 */
export function fireDrag(
    type: 'dragOver' | 'drop',
    element: HTMLElement,
    dataTransfer: Transfer,
    point: Point
) {
    const event = createEvent[type](element, { dataTransfer });
    Object.defineProperty(event, 'clientX', { value: point.clientX });
    Object.defineProperty(event, 'clientY', { value: point.clientY });
    return fireEvent(element, event);
}

/** Drags `from` (a tab) over `to` at a point and drops it there, then ends the drag. */
export function dragTab(
    from: HTMLElement,
    to: HTMLElement,
    point: Point,
    { drop = true }: { drop?: boolean } = {}
) {
    const dataTransfer = transfer();
    const source = draggableOf(from);
    fireEvent.dragStart(source, { dataTransfer });
    fireDrag('dragOver', to, dataTransfer, point);
    if (drop) fireDrag('drop', to, dataTransfer, point);
    fireEvent.dragEnd(source, { dataTransfer });
}
