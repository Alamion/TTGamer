// @vitest-environment happy-dom
import {
    DocumentPreviewContent,
    DocumentPreviewTrigger,
} from '@site/src/sheet_manager/features/documents/DocumentPreviewCard';
import { DocumentRenderContext } from '@site/src/sheet_manager/features/documents/documentRender';
import { defaultPageOf } from '@site/src/sheet_manager/features/documents/linkSuggestions';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { ReferenceFieldControl } from '@site/src/sheet_manager/features/sheet/declarative/fieldControls';
import { anchorName } from '@site/src/sheet_manager/features/sheet/declarative/sectionAnchors';
import { briefViewOf } from '@site/src/sheet_manager/features/sheet/panes/views';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { noteEnvelope, noteTemplate } from '@site/src/sheet_manager/systems/general/note';
import type { TemplateField } from '@site/src/sheet_manager/types/template';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** The preview card of a linked document (spec 044, US3). */

vi.setConfig({ testTimeout: 20_000 });

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
});

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    useDocumentStore.setState({
        documents: [
            noteEnvelope('docks', 'Docks', '# The docks\nRain at night.\n[[Ines Ruiz]] waits.'),
            noteEnvelope('ines', 'Ines Ruiz', ''),
        ],
        currentDocumentId: 'docks',
    });
});

afterEach(() => {
    vi.useRealTimers();
    cleanup();
});

const advance = (ms: number) =>
    act(() => {
        vi.advanceTimersByTime(ms);
    });

function mountLink(documentId = 'docks', name = 'Docks', onClick = () => undefined) {
    render(
        <DocumentPreviewTrigger documentId={documentId} name={name}>
            <a href="?doc=docks" onClick={onClick}>
                {name}
            </a>
        </DocumentPreviewTrigger>
    );
    return screen.getByRole('link', { name });
}

const card = () => screen.queryByRole('dialog', { name: 'Preview of Docks' });

describe('the preview card', () => {
    it('opens after a pause on hover with the note title and lines, and closes after leaving', () => {
        const link = mountLink();
        fireEvent.pointerEnter(link, { pointerType: 'mouse' });
        advance(300);
        expect(card()).toBeNull();
        advance(150);
        expect(card()?.textContent).toContain('Rain at night.');
        expect(screen.getByRole('link', { name: 'Ines Ruiz' })).toBeTruthy();
        fireEvent.pointerLeave(link, { pointerType: 'mouse' });
        advance(250);
        expect(card()).toBeNull();
    });

    it('opens on keyboard focus, closes on Esc, and leaves focus on the link', () => {
        const link = mountLink();
        act(() => link.focus());
        advance(450);
        expect(card()).toBeTruthy();
        fireEvent.keyDown(document.activeElement ?? link, { key: 'Escape' });
        expect(card()).toBeNull();
        expect(document.activeElement).toBe(link);
    });

    it('opens on a long touch press, and that press does not follow the link', () => {
        const followed = vi.fn();
        const link = mountLink('docks', 'Docks', followed);
        fireEvent.pointerDown(link, { pointerType: 'touch' });
        advance(550);
        expect(card()).toBeTruthy();
        fireEvent.click(link);
        expect(followed).not.toHaveBeenCalled();
        fireEvent.click(link);
        expect(followed).toHaveBeenCalledTimes(1);
    });

    it('takes the place of the browser menu on a long press, stays through taps, and opens', () => {
        const link = mountLink();
        fireEvent.pointerDown(link, { pointerType: 'touch' });
        const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        act(() => void link.dispatchEvent(menu));
        expect(menu.defaultPrevented).toBe(true);
        expect(card()).toBeTruthy();
        fireEvent.pointerUp(link, { pointerType: 'touch' });
        // A tap inside the card ends with the pointer leaving it and the link losing focus.
        fireEvent.pointerLeave(card()!, { pointerType: 'touch' });
        fireEvent.blur(link);
        advance(500);
        expect(card()).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Open in new tab' }));
        expect(card()).toBeNull();
    });

    it('leaves the browser menu alone without a touch, and a scroll cancels the press', () => {
        const link = mountLink();
        const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        link.dispatchEvent(menu);
        expect(menu.defaultPrevented).toBe(false);
        fireEvent.pointerDown(link, { pointerType: 'touch' });
        fireEvent.pointerCancel(link, { pointerType: 'touch' });
        advance(600);
        expect(card()).toBeNull();
    });

    it('draws the brief of a kind that has one through the workspace renderer', () => {
        const [systemId, definitionId, viewId] = (() => {
            for (const system of systemRegistry.getSystems()) {
                for (const definition of system.documents) {
                    const brief = briefViewOf(definition);
                    if (brief) return [system.id, definition.id, brief];
                }
            }
            throw new Error('no kind with a brief');
        })();
        const id = useDocumentStore.getState().createDocument(systemId, definitionId, {
            activate: false,
            title: 'Bruno',
        }).id;
        const renderDocument = vi.fn((documentId: string, view?: string): ReactNode =>
            createElement('p', null, `brief ${documentId} ${view ?? ''}`)
        );
        render(
            createElement(
                DocumentRenderContext.Provider,
                { value: renderDocument },
                createElement(DocumentPreviewContent, { documentId: id })
            )
        );
        expect(screen.getByText(`brief ${id} ${viewId}`)).toBeTruthy();
    });

    it('says when the document is gone, and reports it once', () => {
        render(createElement(DocumentPreviewContent, { documentId: 'nowhere' }));
        expect(screen.getByText('This document is not available.')).toBeTruthy();
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['link-preview-missing']);
    });
});

describe('reference fields', () => {
    it('show the same card on a linked document', () => {
        render(
            createElement(ReferenceFieldControl, {
                field: {
                    id: 'crew',
                    type: 'reference',
                    label: 'Crew',
                    targetKinds: ['note'],
                    multiple: true,
                    required: false,
                } as unknown as TemplateField,
                value: ['docks'],
                onChange: () => undefined,
                disabled: false,
                documentOptions: [{ value: 'docks', label: 'Docks', kind: 'note' }],
                onOpenDocument: () => undefined,
            })
        );
        fireEvent.pointerEnter(screen.getByText('Docks'), { pointerType: 'mouse' });
        advance(450);
        expect(card()?.textContent).toContain('Rain at night.');
    });
});

describe('embeds (US6)', () => {
    function mountNote(body: string, others: ReturnType<typeof noteEnvelope>[] = []) {
        vi.useRealTimers();
        useDocumentStore.setState({
            documents: [noteEnvelope('host', 'Host', body), ...others],
            currentDocumentId: 'host',
        });
        return render(<DeclarativeSheetView template={noteTemplate} />);
    }

    it('shows a whole note in place, and one section of it', () => {
        const docks = noteEnvelope(
            'docks',
            'Docks',
            '# Docks\nIntro.\n## History\nBuilt by the guild.\n### Fire\nBurned once.\n## Today\nQuiet.'
        );
        const { container } = mountNote('![[Docks]]\n\n![[Docks#History]]', [docks]);
        const [whole, part] = [...container.querySelectorAll('[data-embed="docks"]')];
        expect(whole?.textContent).toContain('Quiet.');
        expect(part?.textContent).toContain('Built by the guild.');
        expect(part?.textContent).toContain('Burned once.');
        expect(part?.textContent).not.toContain('Quiet.');
    });

    it('shows one titled part of a sheet through a one-node page', () => {
        vi.useRealTimers();
        const kind = (() => {
            for (const system of systemRegistry.getSystems()) {
                for (const definition of system.documents) {
                    const page = defaultPageOf(
                        { systemId: system.id, definitionId: definition.id },
                        'en'
                    );
                    const titled = page?.children.find((node) => anchorName(node));
                    if (page && titled && definition.id !== 'note') {
                        return { systemId: system.id, definitionId: definition.id, titled };
                    }
                }
            }
            throw new Error('no kind with a titled page part');
        })();
        useDocumentStore.setState({ documents: [noteEnvelope('host', 'Host', '')] });
        const id = useDocumentStore.getState().createDocument(kind.systemId, kind.definitionId, {
            activate: false,
            title: 'Bruno',
        }).id;
        const name = anchorName(kind.titled)!;
        const host = noteEnvelope('host', 'Host', `![[Bruno#${name}]]`);
        useDocumentStore.setState((state) => ({
            documents: state.documents.map((document) =>
                document.id === 'host' ? host : document
            ),
            currentDocumentId: 'host',
        }));
        const { container } = render(<DeclarativeSheetView template={noteTemplate} />);
        const embed = container.querySelector(`[data-embed="${id}"]`);
        expect(embed?.querySelector(`[data-node-id="${kind.titled.id}"]`)).toBeTruthy();
    });

    it('stops at two levels and cuts a cycle with a link', () => {
        const { container } = mountNote('![[A]]', [
            noteEnvelope('a', 'A', 'in A ![[B]]'),
            noteEnvelope('b', 'B', 'in B ![[C]] and ![[A]]'),
            noteEnvelope('c', 'C', 'in C'),
        ]);
        expect(container.querySelector('[data-embed="a"] [data-embed="b"]')).toBeTruthy();
        // Two deep already: C and the way back to A are links.
        expect(container.querySelector('[data-embed="c"]')).toBeNull();
        const inner = container.querySelector('[data-embed="b"]')!;
        expect([...inner.querySelectorAll('a')].map((link) => link.textContent)).toEqual([
            'C',
            'A',
        ]);
    });

    it('keeps a stored picture a picture even when a document has its name', () => {
        useDocumentStore.setState({
            documents: [
                {
                    ...noteEnvelope('host', 'Host', ''),
                    templateValues: {
                        body: {
                            text: '![[map.png]]',
                            images: { 'map.png': { source: 'url', url: 'https://e.org/map.png' } },
                        },
                    },
                },
                noteEnvelope('map', 'map.png', 'not a picture'),
            ],
            currentDocumentId: 'host',
        });
        vi.useRealTimers();
        const { container } = render(<DeclarativeSheetView template={noteTemplate} />);
        expect(container.querySelector('[data-embed]')).toBeNull();
        expect(screen.getByRole('img').getAttribute('src')).toBe('https://e.org/map.png');
    });
});
