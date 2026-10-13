import {
    isLegacyExportSupported,
    LEGACY_EXPORT_END,
} from '@site/src/sheet_manager/systems/star-wars-wod/legacyExport';
import { describe, expect, it } from 'vitest';

describe('end of support for the first-version export', () => {
    it('has not been reached yet', () => {
        expect(
            isLegacyExportSupported(),
            `Support for the first-version character export ended on ${LEGACY_EXPORT_END}. ` +
                'Delete systems/star-wars-wod/legacyExport.ts, its call sites, ' +
                'tests/sheet_manager/legacy-export*.test.ts, the fixture legacy-export-first-version.json, ' +
                'and the guidance that names it (src/sheet_manager/AGENTS.md, TODO.md).'
        ).toBe(true);
    });

    it('stops at the end date and not before', () => {
        const end = Date.parse(LEGACY_EXPORT_END);
        expect(isLegacyExportSupported(new Date(end - 1))).toBe(true);
        expect(isLegacyExportSupported(new Date(end))).toBe(false);
    });
});
