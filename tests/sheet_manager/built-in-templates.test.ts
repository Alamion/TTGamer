import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { systemRegistry } from '@site/src/sheet_manager/systems';
import { describe, expect, it } from 'vitest';

/**
 * Views are templates (feature 007): the `built-in` layout path and its React blocks are retired
 * (archived under `context/sheet-manager/legacy-sheet-components/`). Every view of every registered system must
 * resolve to a shipped default template with the same id and document kind.
 */
describe('views are shipped templates', () => {
    it('backs every view of every system with a shipped template of the same kind', () => {
        for (const system of systemRegistry.getSystems()) {
            const defaults = system.defaultTemplates ?? [];
            for (const definition of system.documents) {
                for (const view of definition.views) {
                    const label = `${system.id}/${definition.id}:${view.id}`;
                    expect(view.layout.type, label).toBe('declarative');
                    const template = defaults.find(({ id }) => id === view.id);
                    expect(template, label).toBeDefined();
                    expect(template?.documentKind, label).toBe(definition.kind);
                }
            }
        }
    });

    it('ships no legacy built-in placements in any default template', () => {
        for (const system of systemRegistry.getSystems()) {
            for (const template of system.defaultTemplates ?? []) {
                expect(JSON.stringify(template), template.id).not.toContain('"built-in"');
            }
        }
    });

    it('keeps the retired block modules out of the product', () => {
        const root = path.resolve(__dirname, '../../src/sheet_manager');
        const exists = (relative: string) => {
            try {
                return statSync(path.join(root, relative)) !== undefined;
            } catch {
                return false;
            }
        };
        expect(exists('features/sheet/blocks')).toBe(false);
        expect(exists('components/viewer')).toBe(false);
        expect(exists('features/sheet/registry/builtInBlockRegistry.ts')).toBe(false);
        expect(readdirSync(path.join(root, 'features/sheet'))).not.toContain('views');
    });
});
