// @vitest-environment happy-dom
import { PaneSourceProvider } from '@site/src/sheet_manager/features/sheet/panes/PaneSourceProvider';
import { useDocumentSource } from '@site/src/sheet_manager/hooks/useDocumentSource';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { act, cleanup, render } from '@testing-library/react';
import { createElement, Profiler } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { resetDocuments, seedDocuments } from './helpers/documentsWindow';

const commits: Record<string, number> = { Ana: 0, Bruno: 0 };

function Probe() {
    useDocumentSource();
    return null;
}

const pane = (name: string) =>
    createElement(
        Profiler,
        {
            key: name,
            id: name,
            onRender: (id) => {
                commits[id] = (commits[id] ?? 0) + 1;
            },
        },
        createElement(PaneSourceProvider, {
            documentId: name,
            children: createElement(Probe),
        })
    );

afterEach(() => {
    cleanup();
    resetDocuments();
});

describe('panes do not re-render each other (spec 034, VII)', () => {
    it('keeps a pane still while a value changes in the other one', () => {
        seedDocuments(['Ana', 'Bruno'], { current: 'Ana' });
        render(createElement('div', null, [pane('Ana'), pane('Bruno')]));
        // The first write moves the entry's changed time; the next ones leave the entry alone.
        act(() =>
            useDocumentStore.getState().updateDocumentMetadata('Bruno', { title: 'Bruno 1' })
        );
        const settled = { ...commits };
        act(() =>
            useDocumentStore.getState().updateDocumentMetadata('Bruno', { title: 'Bruno 1' })
        );
        act(() =>
            useDocumentStore
                .getState()
                .updateDocumentData('Bruno', (data) => ({ ...(data as object) }))
        );

        expect(commits.Ana).toBe(settled.Ana);
        expect(commits.Bruno).toBeGreaterThan(settled.Bruno!);
    });
});
