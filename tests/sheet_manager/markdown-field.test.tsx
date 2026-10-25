// @vitest-environment happy-dom
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { TEMPLATE_VALUES_LIMITS } from '@site/src/sheet_manager/types/templateValues';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** The markdown field on a page (spec 043, Foundation and US1). */

vi.setConfig({ testTimeout: 20_000 });

let paneWidth = 500;

/** Reports `paneWidth` for every observed element (happy-dom lays nothing out). */
class FixedResizeObserver {
    private readonly callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
    }
    observe() {
        this.callback(
            [{ contentRect: { width: paneWidth } } as ResizeObserverEntry],
            this as unknown as ResizeObserver
        );
    }
    unobserve() {}
    disconnect() {}
}

const template = CustomTemplateSchema.parse({
    id: 'markdown-kit',
    name: 'Markdown Kit',
    documentKind: 'character',
    schemaVersion: 4,
    children: [{ id: 'body', type: 'markdown', label: 'Body' }],
});

function mount(body: unknown) {
    const document = {
        id: 'doc-md',
        kind: 'character',
        systemId: 'star-wars-wod',
        definitionId: 'star-wars-wod-character',
        schemaVersion: 1,
        metadata: { title: 'Plan', tags: [] },
        templateValues: body === undefined ? {} : { body },
        data: { metadata: { name: 'Plan', type: 'sentient' } },
    } as never;
    useTemplateStore.setState({ templates: [template], quarantine: [] });
    useDocumentStore.setState({ documents: [document], currentDocumentId: 'doc-md' });
    return render(createElement(DeclarativeSheetView, { template }));
}

const stored = () => useDocumentStore.getState().documents[0]?.templateValues.body;
const textarea = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Body' });
const select = (start: number, end: number) => {
    textarea().focus();
    textarea().setSelectionRange(start, end);
};

beforeEach(() => {
    paneWidth = 500;
    vi.stubGlobal('ResizeObserver', FixedResizeObserver);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('markdown field', () => {
    it('shows written text in reading mode with an Edit button', () => {
        mount({ text: '# Scene one\n**Ambush** at the docks' });
        expect(screen.getByRole('heading', { name: 'Scene one' })).toBeTruthy();
        expect(screen.getByText('Ambush').tagName).toBe('STRONG');
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(screen.getByRole('button', { name: /Edit/ })).toBeTruthy();
    });

    it('opens an empty field in edit mode', () => {
        mount(undefined);
        expect(textarea()).toBeTruthy();
    });

    it('switches modes with Edit and Done, Ctrl+E, and Esc', () => {
        mount({ text: 'line' });
        fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
        expect(textarea()).toBeTruthy();
        fireEvent.keyDown(textarea(), { key: 'Escape' });
        expect(screen.queryByRole('textbox')).toBeNull();
        fireEvent.keyDown(screen.getByRole('button', { name: /Edit/ }), {
            key: 'e',
            ctrlKey: true,
        });
        expect(textarea()).toBeTruthy();
        fireEvent.keyDown(textarea(), { key: 'e', metaKey: true });
        expect(screen.queryByRole('textbox')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
        fireEvent.click(screen.getByRole('button', { name: /Done/ }));
        expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('writes what is typed into the document', () => {
        mount(undefined);
        fireEvent.change(textarea(), { target: { value: '- [ ] buy dice' } });
        expect(stored()).toEqual({ text: '- [ ] buy dice' });
    });

    it('shows source and result side by side on a wide pane and as a toggle on a narrow one', () => {
        paneWidth = 900;
        const wide = mount({ text: '' });
        expect(screen.getByRole('separator')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Result' })).toBeNull();
        wide.unmount();
        paneWidth = 400;
        mount({ text: '' });
        expect(screen.queryByRole('separator')).toBeNull();
        fireEvent.change(textarea(), { target: { value: '**hi**' } });
        fireEvent.click(screen.getByRole('button', { name: 'Result' }));
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(screen.getByText('hi').tagName).toBe('STRONG');
    });

    it('wraps the selection with shortcuts and toolbar buttons', () => {
        mount({ text: '' });
        fireEvent.change(textarea(), { target: { value: 'go now' } });
        select(0, 2);
        fireEvent.keyDown(textarea(), { key: 'b', ctrlKey: true });
        expect(stored()).toEqual({ text: '**go** now' });
        select(7, 10);
        fireEvent.click(screen.getByRole('button', { name: /Italic/ }));
        expect(stored()).toEqual({ text: '**go** *now*' });
        select(0, 0);
        fireEvent.keyDown(textarea(), { key: 'l', ctrlKey: true });
        expect(stored()).toEqual({ text: '- [ ] **go** *now*' });
        select(0, 0);
        fireEvent.keyDown(textarea(), { key: 'k', metaKey: true });
        expect((stored() as { text: string }).text.startsWith('[text](https://)')).toBe(true);
        select(0, 0);
        fireEvent.click(screen.getByRole('button', { name: 'Folded callout' }));
        expect((stored() as { text: string }).text.startsWith('> [!note]- Title\n> ')).toBe(true);
    });

    it('says the text is full at the limit', () => {
        mount({ text: 'a'.repeat(TEMPLATE_VALUES_LIMITS.markdownMaxLength) });
        fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
        expect(screen.getByRole('status').textContent).toMatch(/full/);
        expect(textarea().maxLength).toBe(TEMPLATE_VALUES_LIMITS.markdownMaxLength);
    });

    it('reads a value stored as plain text, as after a type change', () => {
        mount('Plain **old** text');
        expect(screen.getByText('old').tagName).toBe('STRONG');
    });

    it('ticks a checklist item in reading mode', async () => {
        mount({ text: '- [ ] one\n- [x] two' });
        const [first] = screen.getAllByRole('checkbox');
        await act(async () => {
            fireEvent.click(first!);
        });
        expect(stored()).toEqual({ text: '- [x] one\n- [x] two' });
    });
});
