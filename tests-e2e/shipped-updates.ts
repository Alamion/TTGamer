import type { Page } from '@playwright/test';

import type { OverrideBaseRecord } from '../src/sheet_manager/features/sheet/data/shippedRevision';
import type { CustomTemplate } from '../src/sheet_manager/types/template';

export interface StoredTemplates {
    version: number;
    state: {
        defaultOverrides: Record<string, CustomTemplate>;
        overrideBases: Record<string, OverrideBaseRecord>;
    };
}

/** Read or replace the persisted JSON only after the app has opened its IndexedDB store. */
export function templateStorage(page: Page, replacement?: string): Promise<string | null> {
    return page.evaluate(
        (value) =>
            new Promise<string | null>((resolve, reject) => {
                const open = indexedDB.open('localforage');
                open.onerror = () => reject(open.error);
                open.onsuccess = () => {
                    const db = open.result;
                    const transaction = db.transaction(
                        'keyvaluepairs',
                        value === undefined ? 'readonly' : 'readwrite'
                    );
                    const store = transaction.objectStore('keyvaluepairs');
                    const request =
                        value === undefined
                            ? store.get('universal-template-storage')
                            : store.put(value, 'universal-template-storage');
                    let result: string | null = null;
                    request.onsuccess = () => {
                        result = value ?? (request.result as string | undefined) ?? null;
                    };
                    transaction.onerror = () => {
                        db.close();
                        reject(transaction.error);
                    };
                    transaction.oncomplete = () => {
                        db.close();
                        resolve(result);
                    };
                };
            }),
        replacement
    );
}
