// @vitest-environment jsdom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import {
    createStaticDocumentSource,
    DocumentSourceContext,
} from '@site/src/sheet_manager/hooks/useDocumentSource';
import { resolveDocumentPolicies, systemRegistry } from '@site/src/sheet_manager/systems';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

const SYSTEM = 'wod-2e';
const DEFINITION = 'wod2e-character';

function engineDocument(): UnknownDocumentEnvelope {
    const definition = systemRegistry.getDocumentDefinition(SYSTEM, DEFINITION)!;
    return {
        id: 'engine-doc',
        kind: 'character',
        systemId: SYSTEM,
        definitionId: DEFINITION,
        schemaVersion: 1,
        metadata: { title: 'Mara', tags: [] },
        templateValues: {},
        data: definition.schema.parse(definition.createDefault()),
    } as unknown as UnknownDocumentEnvelope;
}

describe('the WoD 2e engine plugin (spec 012, US7)', () => {
    afterEach(cleanup);

    it('creates a character with engine fields only', () => {
        const data = engineDocument().data as Record<string, unknown>;
        for (const setting of [
            'forceSkills',
            'forcePoints',
            'darkSideResistance',
            'forcePowerItems',
            'implants',
        ]) {
            expect(data).not.toHaveProperty(setting);
        }
        const metadata = data.metadata as Record<string, unknown>;
        expect(metadata).not.toHaveProperty('species');
        expect(metadata).not.toHaveProperty('homeWorld');
        expect(Object.keys(data.virtues as object)).toEqual([
            'Conscience',
            'Self-Control',
            'Courage',
        ]);
    });

    it.each(['wod2e-sheet', 'wod2e-brief'])(
        'renders %s with every binding resolved',
        (viewId) => {
            const template = systemRegistry
                .getSystem(SYSTEM)!
                .defaultTemplates!.find(({ id }) => id === viewId)!;
            render(
                createElement(
                    DocumentSourceContext.Provider,
                    { value: createStaticDocumentSource(engineDocument()) },
                    createElement(DeclarativeSheetView, { template, embedded: true })
                )
            );
            // Unresolved bindings would report `binding-unresolved` and fail the test setup.
            expect(screen.getAllByText('Strength').length).toBeGreaterThan(0);
            expect(screen.queryByText(/Force/)).toBeNull();
        },
        20_000
    );

    it('rolls the classic pool and carries no publisher notice', () => {
        const traitPool = systemRegistry.getSystem(SYSTEM)!.dice!.traitPool!;
        expect(traitPool(3, { specialization: false, experienced: false, practiced: false })).toBe(
            '3d10>=6f=1'
        );
        expect(
            resolveDocumentPolicies(systemRegistry, { systemId: SYSTEM, definitionId: DEFINITION })
        ).toEqual([]);
        expect(systemRegistry.getSystem(SYSTEM)!.coreDefinitions).toEqual([DEFINITION]);
    });

    it('is a concrete system that generic code may not import', () => {
        const config = readFileSync('eslint.config.mjs', 'utf8');
        const pattern = /regex: '(\(\^\|\/\)systems\/[^']+)'/.exec(config)![1]!;
        const regex = new RegExp(pattern.replace(/\\\\/g, '\\'));
        expect(regex.test('../../systems/wod2e/ruleset/schema')).toBe(true);
        expect(regex.test('../../systems/userTypes')).toBe(false);
    });
});
