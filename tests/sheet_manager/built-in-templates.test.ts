// @vitest-environment jsdom

import { resolveDocumentView } from '@site/src/sheet_manager/systems';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { starWarsWodDefaultTemplates } from '@site/src/sheet_manager/systems/star-wars-wod/defaultTemplates';
import { describe, expect, it } from 'vitest';

/**
 * Legacy path retirement gate (feature 006 US7): the definition-owned built-in layouts stay
 * registered and compilable until the user confirms parity, but no shipped template may
 * reference the legacy `built-in` placement variant — pre-feature templates retire via the
 * template-store quarantine instead of migrating.
 */
describe('legacy path retirement gate (feature 006 US7)', () => {
    it('keeps definition-owned built-in layouts registered for specialized pages', () => {
        // The retained legacy path: registered views with built-in layouts still resolve.
        const creature = systemRegistry.getDocumentDefinition('star-wars-wod', 'creature');
        expect(creature).toBeDefined();
        const view = resolveDocumentView(creature!, creature!.defaultViewId);
        expect(view?.layout.type).toBe('built-in');

        for (const definitionId of ['creature', 'vehicle', 'fodder-group']) {
            const definition = systemRegistry.getDocumentDefinition('star-wars-wod', definitionId);
            const definitionView = resolveDocumentView(definition!, definition!.defaultViewId);
            expect(definitionView?.layout.type, definitionId).toBe('built-in');
        }
    });

    it('ships zero built-in placements across every default template', () => {
        expect(starWarsWodDefaultTemplates.length).toBeGreaterThan(0);
        for (const template of starWarsWodDefaultTemplates) {
            const walk = (nodes: readonly { type: string; children?: unknown[] }[]): void => {
                for (const node of nodes) {
                    expect(node.type, `${template.id}:${node.type}`).not.toBe('built-in');
                    if (node.children) walk(node.children as never);
                }
            };
            walk(template.children);
        }
    });

    it('declares specialized pages without declarative defaults (built-in layout renders)', () => {
        const defaults = starWarsWodDefaultTemplates.map(({ id }) => id);
        expect(defaults).not.toContain('creature-sheet');
        expect(defaults).not.toContain('vehicle-sheet');
        expect(defaults).not.toContain('fodder-sheet');
    });
});
