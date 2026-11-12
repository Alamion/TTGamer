// @vitest-environment happy-dom
import { useMigrationNotice } from '@site/src/sheet_manager/features/sheet/shell/useMigrationNotice';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { UnknownDocumentEnvelopeSchema } from '@site/src/sheet_manager/types/document';
import { cleanup, render } from '@testing-library/react';
import { createElement, StrictMode } from 'react';
import toast from 'react-hot-toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

vi.mock('react-hot-toast', () => ({ default: vi.fn() }));

const definition = systemRegistry.getDocumentDefinition('wod-2e', 'wod2e-character')!;
const document = () =>
    UnknownDocumentEnvelopeSchema.parse({
        id: 'converted-one',
        systemId: 'wod-2e',
        definitionId: 'wod2e-character',
        kind: 'character',
        schemaVersion: 2,
        metadata: { title: '', tags: [] },
        data: {
            ...(definition.createDefault() as object),
            legacyHealth: {
                levels: ['cross', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            },
        },
    });
const key = 'ttgamer:document-migration-notices:v1';

function Notice({ value = document() }) {
    useMigrationNotice(value, definition);
    return null;
}

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('document conversion notice', () => {
    it('tells once across strict effects and remounts without writing the document', () => {
        const value = document();
        const before = structuredClone(value);
        const mounted = render(createElement(StrictMode, null, createElement(Notice, { value })));
        expect(toast).toHaveBeenCalledTimes(1);
        expect(toast).toHaveBeenCalledWith(
            expect.stringContaining('ordinary wounds'),
            expect.any(Object)
        );
        expect(value).toEqual(before);
        mounted.unmount();
        render(createElement(Notice, { value }));
        expect(toast).toHaveBeenCalledTimes(1);
    });

    it('does not tell a newly created character about a conversion', () => {
        render(
            createElement(Notice, { value: { ...document(), data: definition.createDefault() } })
        );
        expect(toast).not.toHaveBeenCalled();
    });

    it('rejects malformed acknowledgment storage and still shows the notice', () => {
        localStorage.setItem(key, '{"not":"a list"}');
        render(createElement(Notice));
        expect(toast).toHaveBeenCalledTimes(1);
        expect(takeSheetIssues()).toMatchObject([
            { code: 'document-migration-notice-failed', details: { operation: 'read' } },
        ]);
        expect(JSON.parse(localStorage.getItem(key)!)).toHaveLength(1);
    });

    it('reports write failures while leaving the character usable', () => {
        const getItem = localStorage.getItem.bind(localStorage);
        const setItem = vi.fn(() => {
            throw new Error('quota');
        });
        vi.stubGlobal('localStorage', { getItem, setItem });
        render(createElement(Notice));
        expect(toast).toHaveBeenCalledTimes(1);
        expect(setItem).toHaveBeenCalledWith(
            key,
            JSON.stringify(['converted-one:classic-health-v2'])
        );
        expect(takeSheetIssues()).toMatchObject([
            { code: 'document-migration-notice-failed', details: { operation: 'write' } },
        ]);
    });

    it('keeps only a bounded acknowledgment list', () => {
        localStorage.setItem(
            key,
            JSON.stringify(Array.from({ length: 500 }, (_, i) => `doc-${i}:migration`))
        );
        render(createElement(Notice));
        const saved = JSON.parse(localStorage.getItem(key)!);
        expect(saved).toHaveLength(500);
        expect(saved.at(-1)).toBe('converted-one:classic-health-v2');
    });
});
