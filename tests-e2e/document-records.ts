import type { Page } from '@playwright/test';

/** Never create the app's store: seed only a record already written by this test's UI. */
export async function recordStorage(
    page: Page,
    id: string,
    replacement?: string
): Promise<string | null> {
    return page.evaluate(
        ({ key, value }) =>
            new Promise<string | null>((resolve, reject) => {
                const open = indexedDB.open('localforage');
                let notReady = false;
                open.onupgradeneeded = () => {
                    notReady = true;
                    open.transaction?.abort();
                };
                open.onerror = () => {
                    if (notReady && value === undefined) resolve(null);
                    else reject(open.error);
                };
                open.onsuccess = () => {
                    const database = open.result;
                    if (!database.objectStoreNames.contains('keyvaluepairs')) {
                        database.close();
                        if (value === undefined) resolve(null);
                        else reject(new Error('The application store is not ready'));
                        return;
                    }
                    const transaction = database.transaction(
                        'keyvaluepairs',
                        value === undefined ? 'readonly' : 'readwrite'
                    );
                    const store = transaction.objectStore('keyvaluepairs');
                    const request = value === undefined ? store.get(key) : store.put(value, key);
                    let result: string | null = null;
                    request.onsuccess = () => {
                        result = value ?? (request.result as string | undefined) ?? null;
                    };
                    transaction.onerror = () => {
                        database.close();
                        reject(transaction.error);
                    };
                    transaction.oncomplete = () => {
                        database.close();
                        resolve(result);
                    };
                };
            }),
        { key: `doc:${id}`, value: replacement }
    );
}
