// @vitest-environment jsdom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    createDefaultDroidData,
    createDefaultStarWarsCharacterData,
} from '@site/src/sheet_manager/systems/star-wars-wod';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

function defaultTemplate(id: string) {
    return systemRegistry.getSystem('star-wars-wod')?.defaultTemplates?.find((t) => t.id === id);
}

function seedDocument(
    data: unknown = createDefaultStarWarsCharacterData(),
    kind = 'character',
    definitionId = 'character'
) {
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-parity',
                kind,
                systemId: 'star-wars-wod',
                definitionId,
                schemaVersion: 1,
                metadata: { title: 'Parity Target', tags: [] },
                templateValues: {},
                data,
            } as never,
        ],
        currentDocumentId: 'doc-parity',
    });
}

/** Rendering the whole shipped sheet in jsdom is slow under a parallel suite. */
const FULL_SHEET_RENDER_TIMEOUT = 20_000;

describe('declarative default templates (feature 006, zero placements)', () => {
    beforeEach(() => seedDocument());
    afterEach(cleanup);

    it(
        'character full default covers identity, attributes, skills, advantages, force, body, other',
        () => {
            const template = defaultTemplate('full-sheet');
            expect(template).toBeDefined();
            render(createElement(DeclarativeSheetView, { template: template! }));
            // No degradation: every binding resolves.
            expect(screen.queryAllByRole('alert')).toHaveLength(0);
            // Identity fields.
            expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(8);
            // Attribute rows — sample labels across the three groups.
            expect(screen.getAllByText('Strength').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Charisma').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Wits').length).toBeGreaterThan(0);
            // Ability rows — one from each ability group.
            expect(screen.getAllByText('Athletics').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Blaster').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Astrogation').length).toBeGreaterThan(0);
            // System lists for custom skills sit untitled inside their ability groups.
            expect(screen.getAllByText('Talents').length).toBeGreaterThan(0);
            expect(screen.queryByText(/Custom talents/i)).toBeNull();
            expect(screen.getAllByRole('button', { name: /^Add$/ }).length).toBeGreaterThanOrEqual(
                3
            );
            // Condition + resources.
            expect(screen.getAllByText('Health').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Willpower').length).toBeGreaterThan(0);
            // Advantages / Force / Body / Other section content.
            expect(screen.getAllByText('Advantages').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Force').length).toBeGreaterThan(0);
            expect(screen.getAllByText(/Derived Stats/i).length).toBeGreaterThan(0);
        },
        FULL_SHEET_RENDER_TIMEOUT
    );

    it('ships zero built-in placements across every default template', () => {
        const defaults = systemRegistry.getSystem('star-wars-wod')?.defaultTemplates ?? [];
        expect(defaults.length).toBeGreaterThan(0);
        for (const template of defaults) {
            const walk = (nodes: typeof template.children): void => {
                for (const node of nodes) {
                    expect(JSON.stringify(node)).not.toContain('"built-in"');
                    if (node.type === 'section' || node.type === 'group') walk(node.children);
                }
            };
            walk(template.children);
        }
        // Specialized pages keep their built-in layouts (no declarative default exists).
        expect(defaultTemplate('creature-sheet')).toBeUndefined();
        expect(defaultTemplate('vehicle-sheet')).toBeUndefined();
        expect(defaultTemplate('fodder-sheet')).toBeUndefined();
    });

    it('droid default renders without degradation (T021 successor)', () => {
        seedDocument(createDefaultDroidData(), 'character', 'droid');
        const template = defaultTemplate('droid-sheet');
        expect(template).toBeDefined();
        render(createElement(DeclarativeSheetView, { template: template! }));
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
        expect(screen.getAllByText('Strength').length).toBeGreaterThan(0);
    });

    it('scenario: dropping the force section keeps the rest composable (SC-002 successor)', () => {
        const full = defaultTemplate('full-sheet')!;
        const variant = {
            ...full,
            id: 'no-force-variant',
            name: 'No Force Variant',
            children: full.children.filter(
                (node) => !(node.type === 'section' && node.id === 'force')
            ),
        };
        render(createElement(DeclarativeSheetView, { template: variant as typeof full }));
        expect(screen.getAllByText('Health').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Blaster').length).toBeGreaterThan(0);
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
    });

    it('brief default is composed from compact groups without sections', () => {
        const briefTemplate = defaultTemplate('brief');
        expect(briefTemplate).toBeDefined();
        if (!briefTemplate) return;
        // Verify structure: no placements, compact fields, primitives only for tracks.
        const walk = (nodes: CustomTemplate['children']): void => {
            for (const node of nodes) {
                if (node.type === 'section' || node.type === 'group') {
                    walk(node.children);
                    continue;
                }
                if (node.type === 'primitive') {
                    expect(
                        node.bindingKey.startsWith('track:') ||
                            node.bindingKey.startsWith('resource:') ||
                            node.bindingKey.startsWith('equipment:')
                    ).toBe(true);
                }
            }
        };
        walk(briefTemplate.children);
        expect(briefTemplate.children.some((node) => node.type === 'section')).toBe(false);
        render(createElement(DeclarativeSheetView, { template: briefTemplate }));
        // Equipment needs the sheet's body handlers; everything else renders without alerts.
        const issues = takeSheetIssues();
        expect(issues.every(({ details }) => details?.reason === 'no-body-handlers')).toBe(true);
        expect(screen.queryAllByRole('alert')).toHaveLength(issues.length);
    });

    it('degrades foreign-kind assignment instead of rendering wrong data', () => {
        // A creature document assigned the character default: bindings for the character kind
        // are unavailable on creature documents — every primitive degrades, nothing crashes.
        seedDocument({ metadata: { name: '' } }, 'creature', 'creature');
        const template = defaultTemplate('full-sheet')!;
        render(createElement(DeclarativeSheetView, { template }));
        // The renderer itself must not crash; degradation paths are labeled.
        expect(document.body.textContent).not.toBeNull();
        const issues = takeSheetIssues();
        expect(issues.length).toBeGreaterThan(0);
        expect(issues.every(({ code }) => code === 'binding-unresolved')).toBe(true);
    });
});
