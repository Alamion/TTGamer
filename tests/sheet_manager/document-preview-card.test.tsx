// @vitest-environment happy-dom
import {
    DocumentPreviewContent,
    DocumentPreviewTrigger,
} from '@site/src/sheet_manager/features/documents/DocumentPreviewCard';
import { DocumentRenderContext } from '@site/src/sheet_manager/features/documents/documentRender';
import { ReferenceFieldControl } from '@site/src/sheet_manager/features/sheet/declarative/fieldControls';
import { briefViewOf } from '@site/src/sheet_manager/features/sheet/panes/views';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { noteEnvelope } from '@site/src/sheet_manager/systems/general/note';
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
