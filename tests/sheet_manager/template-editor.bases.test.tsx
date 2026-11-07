// @vitest-environment happy-dom

import {
    revisionOf,
    shippedPageFor,
} from '@site/src/sheet_manager/features/sheet/data/shippedRevision';
import { overrideKey, useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderEditor, resetEditorStores } from './helpers/editor';

describe('recording shipped bases through the template editor', () => {
    beforeEach(() => {
        resetEditorStores();
        useTemplateStore.setState({ overrideBases: {} });
    });
    afterEach(cleanup);

    it('records the current shipped page on the first save and keeps it on the second', async () => {
        const shipped = shippedPageFor('general', 'general-note')!;
        const key = overrideKey(shipped.systemId, shipped.id);
        const first = renderEditor(shipped);
        fireEvent.change(screen.getByPlaceholderText('Template name'), {
            target: { value: 'First edit' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() =>
            expect(useTemplateStore.getState().overrideBases[key]).toEqual({
                base: shipped,
                revision: revisionOf(shipped),
            })
        );
        first.unmount();

        useTemplateStore.getState().dismissUpdate(shipped.systemId, shipped.id, 'future-revision');
        const record = useTemplateStore.getState().overrideBases[key];
        renderEditor(useTemplateStore.getState().defaultOverrides[key]!);
        fireEvent.change(screen.getByPlaceholderText('Template name'), {
            target: { value: 'Second edit' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() =>
            expect(useTemplateStore.getState().defaultOverrides[key]?.name).toBe('Second edit')
        );
        expect(useTemplateStore.getState().overrideBases[key]).toBe(record);
    });

    it('keeps a pre-feature copy without a base on a plain edit', async () => {
        const shipped = shippedPageFor('general', 'general-note')!;
        const copy = { ...shipped, name: 'Old edit' };
        const key = overrideKey(shipped.systemId, shipped.id);
        useTemplateStore.getState().setDefaultOverride(copy);
        renderEditor(copy);
        fireEvent.change(screen.getByPlaceholderText('Template name'), {
            target: { value: 'Plain edit' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() =>
            expect(useTemplateStore.getState().defaultOverrides[key]?.name).toBe('Plain edit')
        );
        expect(useTemplateStore.getState().overrideBases[key]).toBeUndefined();
    });
});
