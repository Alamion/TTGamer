// @vitest-environment happy-dom

import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/** Browser Back and Forward between linked documents (T-057). */

const router = vi.hoisted(() => {
    interface Entry {
        pathname: string;
        search: string;
        hash: string;
        state: unknown;
    }
    const start: Entry = { pathname: '/universal_sheet', search: '', hash: '', state: undefined };
    let entries: Entry[] = [start];
    let index = 0;
    const listeners = new Set<() => void>();
    const emit = () => listeners.forEach((listener) => listener());
    const history = {
        get location() {
            return entries[index]!;
        },
        push(to: Partial<Entry>) {
            entries = [...entries.slice(0, index + 1), { ...entries[index]!, ...to }];
            index += 1;
            emit();
        },
        replace(to: Partial<Entry>) {
            entries = entries.map((entry, at) => (at === index ? { ...entry, ...to } : entry));
            emit();
        },
        go(delta: number) {
            index = Math.max(0, Math.min(entries.length - 1, index + delta));
            emit();
        },
        reset() {
            entries = [start];
            index = 0;
        },
        get length() {
            return entries.length;
        },
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
    return history;
});

vi.mock('@docusaurus/router', async () => {
    const { useSyncExternalStore } = await import('react');
    return {
        useHistory: () => router,
        useLocation: () =>
            useSyncExternalStore(
                (listener) => router.subscribe(listener),
                () => router.location
            ),
    };
});

const RENDER_TIMEOUT = 40_000;

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    Element.prototype.scrollIntoView ??= () => undefined;
});

beforeEach(() => router.reset());
afterEach(cleanup);

function envelope(
    id: string,
    definitionId: string,
    title: string,
    templateValues: Record<string, unknown> = {}
): UnknownDocumentEnvelope {
    const definition = systemRegistry.getDocumentDefinition('wod-v5', definitionId)!;
    return {
        id,
        kind: definition.kind,
        systemId: 'wod-v5',
        definitionId: definition.id,
        schemaVersion: 1,
        metadata: { title, tags: [] },
        templateValues,
        data: { ...(definition.createDefault() as object), name: title },
    } as unknown as UnknownDocumentEnvelope;
}

const current = () => useDocumentStore.getState().currentDocumentId;
const named = () => new URLSearchParams(router.location.search).get('doc');

function seed() {
    useDocumentStore.setState({
        documents: [
            envelope('choir', 'v5-group', 'The Lantern Choir', { members: ['pines'] }),
            envelope('pines', 'v5-storyteller', 'The thing in the pines'),
            envelope('kessel', 'v5-storyteller', 'Bruno Kessel'),
        ],
        currentDocumentId: 'choir',
    });
}

describe('history between linked documents', () => {
    it(
        'goes back to the document a link was followed from, and forward again',
        () => {
            seed();
            render(createElement(CharacterSheet));
            fireEvent.click(screen.getByRole('button', { name: 'Open The thing in the pines' }));
            expect(current()).toBe('pines');
            expect(router.length).toBe(2);
            expect(named()).toBe('pines');

            act(() => router.go(-1));
            expect(current()).toBe('choir');
            expect(named()).toBe('choir');

            act(() => router.go(1));
            expect(current()).toBe('pines');
        },
        RENDER_TIMEOUT
    );

    it(
        'lets a document opened another way take over the entry, so Back skips nothing it left',
        () => {
            seed();
            render(createElement(CharacterSheet));
            fireEvent.click(screen.getByRole('button', { name: 'Open The thing in the pines' }));
            act(() => useDocumentStore.getState().setCurrentDocument('kessel'));
            expect(router.length).toBe(2);
            expect(named()).toBe('kessel');

            act(() => router.go(-1));
            expect(current()).toBe('choir');
        },
        RENDER_TIMEOUT
    );

    it(
        'stays on the shown document when the entry names one that was deleted',
        () => {
            seed();
            render(createElement(CharacterSheet));
            fireEvent.click(screen.getByRole('button', { name: 'Open The thing in the pines' }));
            act(() => {
                const store = useDocumentStore.getState();
                useDocumentStore.setState({
                    documents: store.documents.filter(({ id }) => id !== 'choir'),
                    entries: store.entries.filter(({ id }) => id !== 'choir'),
                });
            });
            act(() => router.go(-1));
            expect(current()).toBe('pines');
        },
        RENDER_TIMEOUT
    );
});
