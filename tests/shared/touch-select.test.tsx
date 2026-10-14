// @vitest-environment happy-dom
import { type TreeRowItem, TreeView } from '@site/src/shared/components/tree/TreeView';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rows: TreeRowItem<string>[] = ['one', 'two', 'three'].map((name, index) => ({
    key: name,
    node: name,
    name,
    depth: 1,
    setSize: 3,
    position: index + 1,
    expandable: false,
    expanded: false,
    parentKey: undefined,
}));

function Harness({ onOpen }: { onOpen: (key: string) => void }) {
    const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
    const [selecting, setSelecting] = useState(false);
    return (
        <TreeView
            label="Rows"
            rows={rows}
            selectedKey={[...selection][0]}
            selectedKeys={selecting ? selection : undefined}
            selecting={selecting}
            onLongPress={(key) => {
                setSelecting(true);
                setSelection(new Set([key]));
            }}
            onSelect={(key, extend) =>
                setSelection((current) => {
                    if (extend !== 'toggle') return new Set([key]);
                    const next = new Set(current);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                })
            }
            onRowClick={onOpen}
            onToggle={() => undefined}
            onMenu={() => undefined}
            renderRow={() => ({ menu: false })}
            labels={{ toggle: (name) => name, actions: (name) => name }}
            idPrefix="touch-"
        />
    );
}

const touch = (type: 'pointerDown' | 'pointerMove', target: HTMLElement, x = 0, y = 0) => {
    const event = new Event(type.toLowerCase(), { bubbles: true });
    Object.assign(event, { pointerType: 'touch', clientX: x, clientY: y });
    fireEvent(target, event);
};

describe('selecting rows with a finger (shared tree)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('starts on a long press, then a tap toggles rows without opening them', () => {
        const onOpen = vi.fn();
        render(<Harness onOpen={onOpen} />);
        const [one, two] = ['one', 'two'].map((name) => screen.getByRole('treeitem', { name }));
        touch('pointerDown', one!);
        act(() => vi.advanceTimersByTime(600));
        expect(one!.getAttribute('aria-selected')).toBe('true');
        // The tap that ends the press is not a click on the row.
        fireEvent.click(one!);
        expect(one!.getAttribute('aria-selected')).toBe('true');
        fireEvent.click(two!);
        expect(two!.getAttribute('aria-selected')).toBe('true');
        expect(one!.getAttribute('aria-selected')).toBe('true');
        fireEvent.click(one!);
        expect(one!.getAttribute('aria-selected')).toBe('false');
        expect(onOpen).not.toHaveBeenCalled();
    });

    it('does not start when the finger moves or lifts early', () => {
        render(<Harness onOpen={() => undefined} />);
        const one = screen.getByRole('treeitem', { name: 'one' });
        touch('pointerDown', one);
        touch('pointerMove', one, 40, 0);
        act(() => vi.advanceTimersByTime(600));
        expect(one.getAttribute('aria-selected')).toBe('false');
        touch('pointerDown', one);
        fireEvent.pointerUp(one);
        act(() => vi.advanceTimersByTime(600));
        expect(one.getAttribute('aria-selected')).toBe('false');
    });

    it('ignores a mouse hold', () => {
        render(<Harness onOpen={() => undefined} />);
        const one = screen.getByRole('treeitem', { name: 'one' });
        const event = new Event('pointerdown', { bubbles: true });
        Object.assign(event, { pointerType: 'mouse' });
        fireEvent(one, event);
        act(() => vi.advanceTimersByTime(600));
        expect(one.getAttribute('aria-selected')).toBe('false');
    });
});
