// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

async function freshStore() {
    vi.resetModules();
    return (await import('../../src/shared/store/readerPrefsStore')).useReaderPrefsStore;
}

describe('readerPrefsStore', () => {
    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('defaults to Russian terms with the notice not yet dismissed', async () => {
        const store = await freshStore();
        expect(store.getState()).toMatchObject({ gameTerms: 'ru', termHintNoticeDismissed: false });
    });

    it('persists choices across reloads', async () => {
        const store = await freshStore();
        store.getState().setGameTerms('en');
        store.getState().setTermHintNoticeDismissed(true);
        const reloaded = await freshStore();
        expect(reloaded.getState()).toMatchObject({
            gameTerms: 'en',
            termHintNoticeDismissed: true,
        });
    });

    it('falls back to defaults on corrupt storage', async () => {
        localStorage.setItem(
            'ttgamer-reader-prefs',
            JSON.stringify({
                state: { gameTerms: 'klingon', termHintNoticeDismissed: 'yes' },
                version: 1,
            })
        );
        const store = await freshStore();
        expect(store.getState()).toMatchObject({ gameTerms: 'ru', termHintNoticeDismissed: false });
        localStorage.setItem('ttgamer-reader-prefs', '{not json');
        expect((await freshStore()).getState().gameTerms).toBe('ru');
    });

    it('survives a throwing localStorage', async () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const store = await freshStore();
        expect(() => store.getState().setGameTerms('ru-plain')).not.toThrow();
        expect(store.getState().gameTerms).toBe('ru-plain');
    });
});
