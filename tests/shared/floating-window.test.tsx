// @vitest-environment happy-dom
import { FloatingWindow } from '@site/src/shared/components/FloatingWindow';
import {
    defaultLayout,
    fitLayout,
    readLayout,
    resizeLayout,
    type WindowLimits,
} from '@site/src/shared/utils/windowLayout';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const limits: WindowLimits = { minWidth: 400, minHeight: 300, top: 72 };
const viewport = { width: 1280, height: 800 };

describe('window layout rules', () => {
    it('keeps a window on the screen with part of its title bar in reach', () => {
        const wide = { x: 5000, y: 5000, width: 600, height: 400 };
        const fitted = fitLayout(wide, viewport, limits);
        expect(fitted.x).toBeLessThan(viewport.width);
        expect(fitted.x).toBeGreaterThanOrEqual(viewport.width - 96);
        expect(fitted.y).toBeLessThanOrEqual(viewport.height - 40);
        const left = fitLayout({ x: -5000, y: -50, width: 600, height: 400 }, viewport, limits);
        expect(left.x + left.width).toBeGreaterThanOrEqual(96);
        expect(left.y).toBe(0);
    });

    it('holds the size between the minimum and the screen', () => {
        expect(fitLayout({ x: 0, y: 0, width: 50, height: 50 }, viewport, limits)).toMatchObject({
            width: 400,
            height: 300,
        });
        expect(
            fitLayout({ x: 0, y: 0, width: 9000, height: 9000 }, viewport, limits)
        ).toMatchObject({ width: 1280, height: 800 });
        expect(
            fitLayout({ x: 0, y: 0, width: 600, height: 600 }, { width: 320, height: 500 }, limits)
        ).toMatchObject({ width: 320, height: 500 });
    });

    it('starts on the right below the navigation bar, and reads only whole layouts', () => {
        const start = defaultLayout(viewport, limits, { width: 720, height: 560 });
        expect(start).toEqual({ x: 536, y: 72, width: 720, height: 560 });
        expect(readLayout({ x: 1, y: 2, width: 3, height: 4 }, start)).toEqual({
            x: 1,
            y: 2,
            width: 3,
            height: 4,
        });
        expect(readLayout({ x: 1, y: 'two' }, start)).toBe(start);
        expect(readLayout(null, start)).toBe(start);
    });

    it('resizes by an edge and stops at the minimum, pushing the far edge, not the near one', () => {
        const start = { x: 100, y: 100, width: 600, height: 400 };
        expect(resizeLayout(start, 'e', 50, 0, limits)).toMatchObject({ width: 650, x: 100 });
        expect(resizeLayout(start, 'w', 50, 0, limits)).toMatchObject({ width: 550, x: 150 });
        const squeezed = resizeLayout(start, 'w', 500, 0, limits);
        expect(squeezed.width).toBe(400);
        expect(squeezed.x + squeezed.width).toBe(start.x + start.width);
        expect(resizeLayout(start, 'n', 0, 500, limits)).toMatchObject({ height: 300, y: 200 });
    });
});

let narrow = false;
const stored = (id: string) => JSON.parse(localStorage.getItem(`window-layout:${id}`) ?? 'null');

function mount(props: Partial<React.ComponentProps<typeof FloatingWindow>> = {}) {
    const onClose = vi.fn();
    const view = render(
        <>
            <button type="button">Page button</button>
            <FloatingWindow
                open
                onClose={onClose}
                title="Documents"
                closeLabel="Close the window"
                id="test"
                {...props}
            >
                <input aria-label="Inside" />
            </FloatingWindow>
        </>
    );
    return { onClose, ...view };
}

const frame = () => screen.getByRole('dialog', { name: 'Documents' });
const titleBar = () => frame().querySelector<HTMLElement>('[data-window-titlebar]')!;
const edge = (name: string) => frame().querySelector<HTMLElement>(`[data-window-edge="${name}"]`)!;

describe('floating window (spec 032, FR-002 to FR-004)', () => {
    beforeEach(() => {
        narrow = false;
        localStorage.clear();
        window.innerWidth = 1280;
        window.innerHeight = 800;
        window.matchMedia = ((query: string) => ({
            matches: query.includes('767') ? narrow : false,
            media: query,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
        })) as unknown as typeof window.matchMedia;
    });
    afterEach(cleanup);

    it('is a dialog that does not block the page and takes focus when it opens', () => {
        mount();
        expect(frame().getAttribute('aria-modal')).toBeNull();
        expect(document.activeElement).toBe(frame());
        const onClick = vi.fn();
        const button = screen.getByRole('button', { name: 'Page button' });
        button.addEventListener('click', onClick);
        fireEvent.click(button);
        expect(onClick).toHaveBeenCalled();
        expect(document.querySelector('[data-radix-focus-guard]')).toBeNull();
    });

    it('draws inside the Tailwind root so its utility classes apply', () => {
        const root = document.createElement('div');
        root.id = 'modal-root';
        root.className = 'tailwind-root';
        document.body.append(root);
        mount();
        expect(frame().closest('.tailwind-root')).toBe(root);
        root.remove();
    });

    it('keeps the page behind a phone window from scrolling, and lets it scroll again', () => {
        narrow = true;
        const view = mount();
        expect(document.body.style.overflow).toBe('hidden');
        expect(document.documentElement.style.overflow).toBe('hidden');
        view.unmount();
        expect(document.body.style.overflow).toBe('');
        narrow = false;
        mount();
        expect(document.body.style.overflow).toBe('');
    });

    it('closes from its button and with Escape inside it, not with Escape that was handled', () => {
        const { onClose } = mount();
        fireEvent.click(screen.getByRole('button', { name: 'Close the window' }));
        expect(onClose).toHaveBeenCalledTimes(1);
        fireEvent.keyDown(screen.getByLabelText('Inside'), { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(2);
        const handled = new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
            cancelable: true,
        });
        handled.preventDefault();
        screen.getByLabelText('Inside').dispatchEvent(handled);
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('follows the pointer by its title bar, stays on screen, and is remembered', () => {
        mount();
        const before = frame().getBoundingClientRect;
        void before;
        const start = { left: frame().style.left, top: frame().style.top };
        fireEvent.pointerDown(titleBar(), { button: 0, pointerId: 1, clientX: 600, clientY: 100 });
        fireEvent.pointerMove(titleBar(), { pointerId: 1, clientX: 500, clientY: 160 });
        expect(frame().style.left).not.toBe(start.left);
        expect(stored('test')).toBeNull();
        fireEvent.pointerUp(titleBar(), { pointerId: 1, clientX: 500, clientY: 160 });
        const layout = stored('test');
        expect(layout.x).toBe(Number.parseInt(start.left, 10) - 100);
        expect(layout.y).toBe(Number.parseInt(start.top, 10) + 60);

        fireEvent.pointerDown(titleBar(), { button: 0, pointerId: 1, clientX: 500, clientY: 160 });
        fireEvent.pointerMove(titleBar(), { pointerId: 1, clientX: 90000, clientY: 90000 });
        fireEvent.pointerUp(titleBar(), { pointerId: 1, clientX: 90000, clientY: 90000 });
        expect(stored('test').x).toBeLessThan(1280);
        expect(stored('test').y).toBeLessThan(800);

        cleanup();
        mount();
        expect(frame().style.left).toBe(`${stored('test').x}px`);
    });

    it('does not start a move from its buttons', () => {
        mount();
        const close = screen.getByRole('button', { name: 'Close the window' });
        fireEvent.pointerDown(close, { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
        fireEvent.pointerMove(titleBar(), { pointerId: 1, clientX: 200, clientY: 200 });
        fireEvent.pointerUp(titleBar(), { pointerId: 1, clientX: 200, clientY: 200 });
        expect(stored('test')).toBeNull();
    });

    it('resizes by an edge within its minimum and returns a cancelled drag to its place', () => {
        mount({ minWidth: 480 });
        const width = Number.parseInt(frame().style.width, 10);
        fireEvent.pointerDown(edge('se'), { button: 0, pointerId: 1, clientX: 900, clientY: 600 });
        fireEvent.pointerMove(edge('se'), { pointerId: 1, clientX: 940, clientY: 640 });
        expect(Number.parseInt(frame().style.width, 10)).toBe(width + 40);
        fireEvent.pointerCancel(edge('se'), { pointerId: 1 });
        expect(frame().style.width).toBe(`${width}px`);
        expect(stored('test')).toBeNull();

        fireEvent.pointerDown(edge('e'), { button: 0, pointerId: 1, clientX: 900, clientY: 600 });
        fireEvent.pointerMove(edge('e'), { pointerId: 1, clientX: -5000, clientY: 600 });
        fireEvent.pointerUp(edge('e'), { pointerId: 1, clientX: -5000, clientY: 600 });
        expect(stored('test').width).toBe(480);
    });

    it('repairs a remembered layout the screen no longer holds, without overwriting it', () => {
        localStorage.setItem(
            'window-layout:test',
            JSON.stringify({ x: 900, y: 700, width: 800, height: 600 })
        );
        window.innerWidth = 700;
        window.innerHeight = 500;
        mount();
        const left = Number.parseInt(frame().style.left, 10);
        expect(left).toBeLessThan(700);
        expect(Number.parseInt(frame().style.width, 10)).toBeLessThanOrEqual(700);
        expect(Number.parseInt(frame().style.top, 10)).toBeLessThanOrEqual(500 - 40);
        expect(stored('test').x).toBe(900);

        act(() => {
            window.innerWidth = 1600;
            window.innerHeight = 1000;
            window.dispatchEvent(new Event('resize'));
        });
        expect(frame().style.left).toBe('900px');
    });

    it('resets its place with a double click on the title bar', () => {
        mount();
        fireEvent.pointerDown(titleBar(), { button: 0, pointerId: 1, clientX: 600, clientY: 100 });
        fireEvent.pointerMove(titleBar(), { pointerId: 1, clientX: 400, clientY: 100 });
        fireEvent.pointerUp(titleBar(), { pointerId: 1, clientX: 400, clientY: 100 });
        expect(stored('test')).not.toBeNull();
        fireEvent.doubleClick(titleBar());
        expect(stored('test')).toBeNull();
    });

    it('fills the screen on a phone: no handles, no move, a close button, a modal dialog', () => {
        narrow = true;
        mount();
        expect(frame().getAttribute('aria-modal')).toBe('true');
        expect(frame().style.width).toBe('');
        expect(frame().className).toContain('inset-0');
        expect(frame().querySelectorAll('[data-window-edge]')).toHaveLength(0);
        fireEvent.pointerDown(titleBar(), { button: 0, pointerId: 1, clientX: 600, clientY: 100 });
        fireEvent.pointerUp(titleBar(), { pointerId: 1, clientX: 400, clientY: 100 });
        expect(stored('test')).toBeNull();
        expect(screen.getByRole('button', { name: 'Close the window' })).toBeTruthy();
    });

    it('tells its owner when it is pressed, and draws nothing while closed', () => {
        const onFocus = vi.fn();
        mount({ onFocus });
        fireEvent.pointerDown(frame().querySelector('input')!);
        expect(onFocus).toHaveBeenCalled();
        cleanup();
        mount({ open: false });
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    describe('owned by a layout (spec 036)', () => {
        const owned = (extra: Partial<React.ComponentProps<typeof FloatingWindow>> = {}) => {
            const onLayoutChange = vi.fn();
            mount({
                layout: { x: 100, y: 100, width: 600, height: 400 },
                onLayoutChange,
                moveLabel: 'Move Documents',
                zIndex: 905,
                ...extra,
            });
            return onLayoutChange;
        };

        it('shows the place it is given, reports moves, and stores nothing itself', () => {
            const onLayoutChange = owned();
            expect(frame().style.left).toBe('100px');
            expect(frame().style.zIndex).toBe('905');
            fireEvent.pointerDown(titleBar(), {
                button: 0,
                pointerId: 1,
                clientX: 300,
                clientY: 110,
            });
            fireEvent.pointerMove(titleBar(), { pointerId: 1, clientX: 350, clientY: 130 });
            fireEvent.pointerUp(titleBar(), { pointerId: 1, clientX: 350, clientY: 130 });
            expect(onLayoutChange).toHaveBeenLastCalledWith({
                x: 150,
                y: 120,
                width: 600,
                height: 400,
            });
            expect(stored('test')).toBeNull();
        });

        it('moves with the arrows, resizes with Shift, and goes back with Home', () => {
            const onLayoutChange = owned();
            const handle = screen.getByLabelText('Move Documents');
            expect(handle.tabIndex).toBe(0);
            fireEvent.keyDown(handle, { key: 'ArrowRight' });
            expect(onLayoutChange).toHaveBeenLastCalledWith({
                x: 110,
                y: 100,
                width: 600,
                height: 400,
            });
            fireEvent.keyDown(handle, { key: 'ArrowDown', shiftKey: true });
            expect(onLayoutChange).toHaveBeenLastCalledWith({
                x: 100,
                y: 100,
                width: 600,
                height: 410,
            });
            fireEvent.keyDown(handle, { key: 'Home' });
            expect(onLayoutChange).toHaveBeenLastCalledWith(null);
        });

        it('lets the owner take the window where its title bar is let go', () => {
            const onDragMove = vi.fn();
            const onDragEnd = vi.fn(() => true);
            const onLayoutChange = owned({ onDragMove, onDragEnd });
            fireEvent.pointerDown(titleBar(), {
                button: 0,
                pointerId: 1,
                clientX: 300,
                clientY: 110,
            });
            fireEvent.pointerMove(titleBar(), { pointerId: 1, clientX: 20, clientY: 300 });
            expect(onDragMove).toHaveBeenLastCalledWith({ x: 20, y: 300 });
            fireEvent.pointerUp(titleBar(), { pointerId: 1, clientX: 20, clientY: 300 });
            expect(onDragEnd).toHaveBeenCalledWith({ x: 20, y: 300 });
            expect(onLayoutChange).not.toHaveBeenCalled();
        });

        it('tells its owner when focus moves into it, for the stack', () => {
            const onFocus = vi.fn();
            owned({ onFocus });
            screen.getByLabelText('Inside').focus();
            expect(onFocus).toHaveBeenCalled();
        });
    });
});
