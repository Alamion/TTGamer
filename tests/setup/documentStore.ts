import { afterEach, beforeEach, vi } from 'vitest';

type StoreModule = typeof import('@site/src/sheet_manager/store/documentStore');
type ContentModule = typeof import('@site/src/sheet_manager/store/documentContent');

let content: ContentModule | undefined;

/**
 * The document store gets two test conveniences, applied when a test file first imports it (so
 * files that never touch the store do not load the sheet manager): every file gets its own
 * in-memory record storage, and `setState({ documents })` fills the matching entries, as the
 * store's own actions would have (spec 032, T007).
 */
vi.mock('@site/src/sheet_manager/store/documentStore', async (importOriginal) => {
    const original = await importOriginal<StoreModule>();
    content = await import('@site/src/sheet_manager/store/documentContent');
    const { entryOf } = await import('@site/src/sheet_manager/store/documentIndex');
    content.configureRecordStorage(content.createMemoryRecordStorage());

    const { useDocumentStore } = original;
    const setState = useDocumentStore.setState.bind(useDocumentStore);
    useDocumentStore.setState = ((partial: unknown, replace?: boolean) => {
        setState(
            (state) => {
                const next = (typeof partial === 'function' ? partial(state) : partial) as Partial<
                    typeof state
                >;
                if (!next.documents || next.entries) return next;
                return {
                    ...next,
                    entries: next.documents.map((document, index) => {
                        const previous = state.entries.find(({ id }) => id === document.id);
                        return {
                            ...entryOf(document, previous, {}, 0),
                            rank: previous?.rank ?? index + 1,
                        };
                    }),
                };
            },
            replace as false | undefined
        );
    }) as typeof useDocumentStore.setState;
    return original;
});

beforeEach(() => {
    content?.configureRecordStorage(content.createMemoryRecordStorage());
    content?.purgedIds.clear();
    // The create dialog's recent kinds (spec 039) must not leak from one test into the next.
    if (typeof window !== 'undefined') window.localStorage?.removeItem('ttgamer:create-dialog:v1');
});

afterEach(async () => {
    await content?.recordWriter.flush();
});
