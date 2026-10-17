import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { CATALOG_BINDINGS } from '@site/src/sheet_manager/features/sheet/data/catalogBindings';
import { describe, expect, it } from 'vitest';

/** The library and the editor's catalog picker show a name, never a shipped catalog's id. */
describe('shipped catalog names', () => {
    it('names every catalog a system ships', () => {
        const names = uiMessages.sheet.catalogNames as Readonly<Record<string, unknown>>;
        const unnamed = [...CATALOG_BINDINGS.keys()].filter((id) => !(id in names));
        expect(unnamed).toEqual([]);
    });
});
