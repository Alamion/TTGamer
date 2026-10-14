// @vitest-environment happy-dom
import type { SelectExtend } from '@site/src/shared/components/tree/TreeRowShell';
import { type TreeRowItem, TreeView } from '@site/src/shared/components/tree/TreeView';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { folder, openWindow, seedDocuments } from '../sheet_manager/helpers/documentsWindow';
import { resetLibraryStores } from '../sheet_manager/helpers/library';
import { openLibrary } from '../sheet_manager/helpers/libraryDialog';

vi.setConfig({ testTimeout: 20_000 });

const rows = () => [...document.querySelectorAll<HTMLElement>('[data-tree-row]')];
const nameOf = (row: HTMLElement) => row.querySelector('span.truncate')?.textContent ?? '';
const press = (key: string, init: Partial<KeyboardEventInit> = {}) =>
    fireEvent.keyDown(document.activeElement!, { key, ...init });
const focusRow = (row: HTMLElement) => {
    fireEvent.click(row);
    row.focus();
};

/** A tree place: how to open it, and what happens when its menu key is pressed. */
interface TreeHost {
    title: string;
    open: () => void;
    prepare?: () => void;
    menuRequested: () => boolean;
    /** The row whose menu key is tried (the first one unless a row type has no menu). */
    menuRow?: (all: HTMLElement[]) => HTMLElement;
}

function describeTreeContract(host: TreeHost) {
    describe(`tree contract: ${host.title}`, () => {
        beforeEach(() => {
            host.prepare?.();
            host.open();
        });
        afterEach(cleanup);

        it('is a labelled tree whose rows carry their place and one is tabbable', () => {
            expect(screen.getByRole('tree').getAttribute('aria-label')).toBeTruthy();
            const all = rows();
            expect(all.length).toBeGreaterThan(1);
            for (const row of all) {
                expect(row.getAttribute('role')).toBe('treeitem');
                expect(Number(row.getAttribute('aria-level'))).toBeGreaterThanOrEqual(1);
                expect(Number(row.getAttribute('aria-posinset'))).toBeGreaterThanOrEqual(1);
                expect(Number(row.getAttribute('aria-setsize'))).toBeGreaterThanOrEqual(
                    Number(row.getAttribute('aria-posinset'))
                );
            }
            expect(all.filter((row) => row.tabIndex === 0)).toHaveLength(1);
        });

        it('moves with the arrows, Home, and End, selection following focus', () => {
            const [first, second] = rows();
            focusRow(first!);
            press('ArrowDown');
            expect(document.activeElement).toBe(second);
            expect(second!.getAttribute('aria-selected')).toBe('true');
            press('ArrowUp');
            expect(document.activeElement).toBe(first);
            press('End');
            expect(document.activeElement).toBe(rows().at(-1));
            press('Home');
            expect(document.activeElement).toBe(rows()[0]);
        });

        it('opens a branch, enters it, and walks back out with the side arrows', () => {
            const branch = rows().find((row) => row.getAttribute('aria-expanded') === 'false')!;
            const level = Number(branch.getAttribute('aria-level'));
            focusRow(branch);
            press('ArrowRight');
            expect(document.activeElement!.getAttribute('aria-expanded')).toBe('true');
            press('ArrowRight');
            expect(Number(document.activeElement!.getAttribute('aria-level'))).toBe(level + 1);
            press('ArrowLeft');
            expect(Number(document.activeElement!.getAttribute('aria-level'))).toBe(level);
            press('ArrowLeft');
            expect(document.activeElement!.getAttribute('aria-expanded')).toBe('false');
        });

        it('jumps to the row whose name starts with the typed letters', () => {
            const target = rows().at(-1)!;
            const word = nameOf(target).toLowerCase().slice(0, 2);
            focusRow(rows()[0]!);
            for (const letter of word) press(letter);
            expect(
                nameOf(document.activeElement as HTMLElement)
                    .toLowerCase()
                    .startsWith(word)
            ).toBe(true);
        });

        it('asks for the row menu from the keyboard', () => {
            focusRow(host.menuRow ? host.menuRow(rows()) : rows()[0]!);
            press('ContextMenu');
            expect(host.menuRequested()).toBe(true);
        });
    });
}

describeTreeContract({
    title: 'the library dialog',
    prepare: resetLibraryStores,
    open: () => void openLibrary(),
    menuRequested: () => screen.queryByRole('menu') !== null,
});

describeTreeContract({
    title: 'the documents window',
    prepare: () => {
        localStorage.clear();
        seedDocuments(['Ana', 'Bruno', 'Cleo'], {
            folders: [folder('camp', 'Campaign')],
            placed: { Bruno: 'camp' },
        });
    },
    open: () => void openWindow(),
    menuRequested: () => screen.queryByRole('menu') !== null,
    menuRow: (all) => all.at(-1)!,
});

interface Sample {
    id: string;
    name: string;
    children: Sample[];
}

const sampleTree = (): Sample[] => [
    {
        id: 'campaign',
        name: 'Campaign',
        children: [
            {
                id: 'arc',
                name: 'Arc one',
                children: [{ id: 'scene', name: 'Scene', children: [] }],
            },
            { id: 'faction', name: 'Faction', children: [] },
        ],
    },
    { id: 'notes', name: 'Notes', children: [] },
    { id: 'zeta', name: 'Zeta', children: [] },
];

function flatten(
    nodes: readonly Sample[],
    open: ReadonlySet<string>,
    depth = 1,
    parentKey?: string
): TreeRowItem<Sample>[] {
    return nodes.flatMap((node, index) => [
        {
            key: node.id,
            node,
            name: node.name,
            depth,
            setSize: nodes.length,
            position: index + 1,
            expandable: node.children.length > 0,
            expanded: open.has(node.id),
            parentKey,
        },
        ...(open.has(node.id) ? flatten(node.children, open, depth + 1, node.id) : []),
    ]);
}

let menuAsked = false;
let rowClicks: string[] = [];
let lastSelection = new Set<string>();

/** The documents window's tree before the window exists (US1 runs this contract on the window). */
function SampleTree({ multi = false }: { multi?: boolean }) {
    const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
    const [focused, setFocused] = useState<string | undefined>(undefined);
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
    const [anchor, setAnchor] = useState<string | undefined>(undefined);
    const items = flatten(sampleTree(), open);
    const select = (key: string, extend: SelectExtend) => {
        setFocused(key);
        if (!multi) return;
        const keys = items.map((item) => item.key);
        if (extend === 'toggle') {
            const next = new Set(selected);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            setSelected(next);
            setAnchor(key);
            lastSelection = next;
        } else if (extend === 'range' && anchor) {
            const [from, to] = [keys.indexOf(anchor), keys.indexOf(key)].sort((a, b) => a - b);
            const next = new Set(keys.slice(from, to! + 1));
            setSelected(next);
            lastSelection = next;
        } else {
            const next = new Set([key]);
            setSelected(next);
            setAnchor(key);
            lastSelection = next;
        }
    };
    return (
        <TreeView
            label="Sample"
            rows={items}
            selectedKey={focused}
            selectedKeys={multi ? selected : undefined}
            onSelect={select}
            onToggle={(key, force) =>
                setOpen((current) => {
                    const next = new Set(current);
                    if (force ?? !next.has(key)) next.add(key);
                    else next.delete(key);
                    return next;
                })
            }
            onRowClick={(key) => rowClicks.push(key)}
            onMenu={() => {
                menuAsked = true;
            }}
            renderRow={(item) => (item.key === 'zeta' ? { menu: false } : undefined)}
            labels={{ toggle: (name) => `Toggle ${name}`, actions: (name) => `Actions ${name}` }}
            idPrefix="sample-"
        />
    );
}

describeTreeContract({
    title: 'a plain tree',
    prepare: () => {
        menuAsked = false;
    },
    open: () => void render(<SampleTree />),
    menuRequested: () => menuAsked,
});

describeTreeContract({
    title: 'a tree with several selected rows',
    prepare: () => {
        menuAsked = false;
    },
    open: () => void render(<SampleTree multi />),
    menuRequested: () => menuAsked,
});

describe('the row menu', () => {
    beforeEach(() => {
        menuAsked = false;
        rowClicks = [];
    });
    afterEach(cleanup);

    it('opens from its button without selecting the row or counting as a click on it', () => {
        render(<SampleTree />);
        fireEvent.click(screen.getByRole('button', { name: 'Actions Notes' }));
        expect(menuAsked).toBe(true);
        expect(rowClicks).toEqual([]);
        expect(rows().filter((row) => row.getAttribute('aria-selected') === 'true')).toEqual([]);
    });

    it('selects the row on a right click, without counting it as a click', () => {
        render(<SampleTree />);
        fireEvent.contextMenu(rows()[1]!);
        expect(menuAsked).toBe(true);
        expect(rows()[1]!.getAttribute('aria-selected')).toBe('true');
        expect(rowClicks).toEqual([]);
    });

    it('is absent on a row with nothing to offer, whose keys and right click do nothing', () => {
        render(<SampleTree />);
        const zeta = rows().find((row) => row.getAttribute('data-tree-row') === 'zeta')!;
        expect(screen.queryByRole('button', { name: 'Actions Zeta' })).toBeNull();
        focusRow(zeta);
        press('ContextMenu');
        press('F10', { shiftKey: true });
        fireEvent.contextMenu(zeta);
        expect(menuAsked).toBe(false);
    });

    it('a click on the row still counts as a click on it', () => {
        render(<SampleTree />);
        fireEvent.click(rows()[0]!);
        expect(rowClicks).toEqual(['campaign']);
    });
});

describe('selecting several rows', () => {
    afterEach(cleanup);

    it('toggles with Ctrl or Cmd, ranges with Shift, and says it is multiselectable', () => {
        render(<SampleTree multi />);
        expect(screen.getByRole('tree').getAttribute('aria-multiselectable')).toBe('true');
        const [campaign, notes, zeta] = rows();
        fireEvent.click(campaign!);
        fireEvent.click(zeta!, { ctrlKey: true });
        expect([...lastSelection].sort()).toEqual(['campaign', 'zeta']);
        expect(zeta!.getAttribute('aria-selected')).toBe('true');
        expect(notes!.getAttribute('aria-selected')).toBe('false');
        fireEvent.click(zeta!, { metaKey: true });
        expect([...lastSelection]).toEqual(['campaign']);
        fireEvent.click(campaign!);
        fireEvent.click(zeta!, { shiftKey: true });
        expect([...lastSelection]).toEqual(['campaign', 'notes', 'zeta']);
        fireEvent.click(notes!);
        expect([...lastSelection]).toEqual(['notes']);
    });

    it('extends the range with Shift and an arrow', () => {
        render(<SampleTree multi />);
        const [campaign] = rows();
        focusRow(campaign!);
        press('ArrowDown', { shiftKey: true });
        press('ArrowDown', { shiftKey: true });
        expect([...lastSelection]).toEqual(['campaign', 'notes', 'zeta']);
    });

    it('leaves a single-selection tree without the multiselectable claim', () => {
        render(<SampleTree />);
        expect(screen.getByRole('tree').getAttribute('aria-multiselectable')).toBeNull();
    });
});

describe('a long list draws only the rows in view', () => {
    const COUNT = 1000;
    const ROW = 32;
    const VIEW = 320;

    function Long() {
        const scroller = useRef<HTMLDivElement>(null);
        const [focused, setFocused] = useState<string | undefined>('row-0');
        const items: TreeRowItem<null>[] = Array.from({ length: COUNT }, (_, index) => ({
            key: `row-${index}`,
            node: null,
            name: `Row ${index}`,
            depth: 1,
            setSize: COUNT,
            position: index + 1,
            expandable: false,
            expanded: false,
            parentKey: undefined,
        }));
        return (
            <div ref={scroller} data-testid="scroller" style={{ height: VIEW, overflowY: 'auto' }}>
                <TreeView
                    label="Long"
                    rows={items}
                    selectedKey={focused}
                    onSelect={(key) => setFocused(key)}
                    onToggle={() => undefined}
                    onMenu={() => undefined}
                    renderRow={() => undefined}
                    labels={{ toggle: () => 'toggle', actions: () => 'actions' }}
                    idPrefix="long-"
                    scrollRef={scroller}
                />
            </div>
        );
    }

    beforeEach(() => {
        // happy-dom has no layout: give the rows a height, the scroller a size, and let the list
        // move up as the scroller scrolls, the way a browser's rectangles do.
        vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(ROW);
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(VIEW);
    });
    afterEach(() => {
        vi.restoreAllMocks();
        cleanup();
    });

    function mount() {
        render(<Long />);
        const scroller = screen.getByTestId('scroller');
        scroller.scrollTo = (({ top }: { top: number }) => {
            scroller.scrollTop = top;
            fireEvent.scroll(scroller);
        }) as typeof scroller.scrollTo;
        const tree = screen.getByRole('tree');
        tree.getBoundingClientRect = () => ({ top: -scroller.scrollTop }) as DOMRect;
        fireEvent.scroll(scroller);
        return scroller;
    }

    it('keeps the DOM small and the counts true', () => {
        mount();
        expect(rows().length).toBeGreaterThan(5);
        expect(rows().length).toBeLessThan(80);
        expect(rows()[0]!.getAttribute('aria-setsize')).toBe(String(COUNT));
        expect(rows().filter((row) => row.tabIndex === 0)).toHaveLength(1);
    });

    it('reaches a row that is not drawn with the keyboard, and draws it', () => {
        mount();
        focusRow(rows()[0]!);
        press('End');
        const last = rows().at(-1)!;
        expect(last.getAttribute('data-tree-row')).toBe(`row-${COUNT - 1}`);
        expect(document.activeElement).toBe(last);
        expect(rows().length).toBeLessThan(80);
        press('Home');
        expect(document.activeElement!.getAttribute('data-tree-row')).toBe('row-0');
    });

    it('draws other rows after the list is scrolled', () => {
        const scroller = mount();
        scroller.scrollTo({ top: 500 * (ROW + 2) });
        const keys = rows().map((row) => row.getAttribute('data-tree-row'));
        expect(keys).toContain('row-500');
        expect(keys).not.toContain('row-0');
    });
});
