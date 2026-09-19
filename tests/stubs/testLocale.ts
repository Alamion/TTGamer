import { readFileSync } from 'node:fs';
import path from 'node:path';

type CodeCatalog = Record<string, { message: string }>;

let locale = 'en';
let messages: CodeCatalog | null = null;

/**
 * Switches the Docusaurus test stubs to `next`: `translate`/`<Translate>` read
 * `i18n/<locale>/code.json` and `useDocusaurusContext` reports the locale. Reset with `'en'`.
 */
export function setTestLocale(next: string): void {
    locale = next;
    messages =
        next === 'en'
            ? null
            : (JSON.parse(
                  readFileSync(path.resolve('i18n', next, 'code.json'), 'utf8')
              ) as CodeCatalog);
}

export function testLocale(): string {
    return locale;
}

export function testMessage(id: string | undefined): string | undefined {
    return id ? messages?.[id]?.message : undefined;
}
