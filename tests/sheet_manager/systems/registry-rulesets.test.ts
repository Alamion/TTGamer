import { describe, expect, it } from 'vitest';

import { SystemRegistry, systemRegistry } from '../../../src/sheet_manager/systems';
import { SystemIdSchema } from '../../../src/sheet_manager/types/document';

const plugin = (id: string, ruleset?: string) => ({
    id: SystemIdSchema.parse(id),
    label: { id: `test.${id}`, message: id },
    documents: [],
    ...(ruleset ? { ruleset: SystemIdSchema.parse(ruleset) } : {}),
});

describe('ruleset declarations (spec 013)', () => {
    it('lists the shipped rulesets and the settings declared on them', () => {
        expect(systemRegistry.listRulesets().map(({ id }) => id)).toEqual(['wod-2e', 'wod-v5']);
        expect(systemRegistry.settingSystemsOf('wod-2e').map(({ id }) => id)).toEqual([
            'star-wars-wod',
        ]);
        expect(systemRegistry.settingSystemsOf('wod-v5')).toEqual([]);
        expect(systemRegistry.rulesetOf('star-wars-wod')?.id).toBe('wod-2e');
        expect(systemRegistry.rulesetOf('wod-v5')?.id).toBe('wod-v5');
    });

    it('rejects a ruleset that is itself a setting and allows partial registries', () => {
        expect(() => new SystemRegistry([plugin('setting', 'missing')])).not.toThrow();
        expect(() => new SystemRegistry([plugin('self', 'self')])).toThrow(/itself a setting/);
        expect(
            () =>
                new SystemRegistry([
                    plugin('base'),
                    plugin('middle', 'base'),
                    plugin('nested', 'middle'),
                ])
        ).toThrow(/ruleset/);
        expect(() => new SystemRegistry([plugin('base'), plugin('setting', 'base')])).not.toThrow();
    });
});
