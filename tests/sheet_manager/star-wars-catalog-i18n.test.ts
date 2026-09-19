import { catalogTranslations } from '@site/src/i18n/generated/catalogTranslations';
import { describe, expect, it } from 'vitest';

import { codeCatalogs } from '../../scripts/catalogSources';

const ru = catalogTranslations.ru as Record<string, Record<string, Record<string, unknown>>>;

describe('Star Wars catalogs in Russian (FR-024, SC-006)', () => {
    const catalogs = [...codeCatalogs()].filter(([id]) => !id.startsWith('v5-'));

    it.each(catalogs.map(([id, entries]) => [id, entries] as const))(
        '%s: every entry has a Russian name and ≥ 90% have a short description',
        (catalogId, entries) => {
            const localized = ru[catalogId] ?? {};
            const missing = entries.filter(
                (entry) => typeof localized[entry.id]?.name !== 'string'
            );
            expect(missing.map((entry) => entry.id)).toEqual([]);
            const withShort = entries.filter((entry) => 'shortDescription' in (entry as object));
            if (withShort.length === 0) return;
            const translated = withShort.filter(
                (entry) => typeof localized[entry.id]?.shortDescription === 'string'
            );
            expect(translated.length / withShort.length).toBeGreaterThanOrEqual(0.9);
        }
    );
});
