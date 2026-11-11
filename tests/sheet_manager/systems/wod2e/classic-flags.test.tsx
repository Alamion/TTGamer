// @vitest-environment happy-dom
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import {
    createScratchDocumentSource,
    DocumentSourceContext,
} from '@site/src/sheet_manager/hooks/useDocumentSource';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { primitive } from '@site/src/sheet_manager/templates/builders';
import {
    CustomTemplateSchema,
    TEMPLATE_SCHEMA_VERSION,
} from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { libraryDocument } from '../../helpers/library';

afterEach(cleanup);

describe('classic trait flag presentation', () => {
    it('shows only S on named and custom traits and preserves hidden flags on edits', () => {
        const document = libraryDocument('classic-flags', {
            systemId: 'wod-2e',
            definitionId: 'wod2e-character',
        });
        document.data = {
            ...(document.data as object),
            attributes: { Strength: { value: 4, experienced: true, practiced: true } },
            virtues: { Courage: { value: 4, specialization: true, experienced: true } },
            customTalents: [
                { id: 'custom', label: 'New talent', value: 4, experienced: true, practiced: true },
            ],
        };
        const definition = systemRegistry.getDocumentDefinition(
            document.systemId,
            document.definitionId
        )!;
        const scratch = createScratchDocumentSource(document, definition);
        const template = CustomTemplateSchema.parse({
            id: 'classic-flags',
            name: 'Classic flags',
            systemId: 'wod-2e',
            documentKind: 'character',
            schemaVersion: TEMPLATE_SCHEMA_VERSION,
            children: [
                primitive('strength', 'trait:physical:Strength', { label: 'Strength' }),
                primitive('courage', 'trait:virtues:Courage', { label: 'Courage' }),
                {
                    id: 'custom',
                    type: 'list',
                    label: 'Custom talents',
                    bindingKey: 'list:customTalents',
                },
            ],
        });
        function Page() {
            return createElement(
                DocumentSourceContext.Provider,
                { value: scratch.useSource() },
                createElement(DeclarativeSheetView, { template })
            );
        }
        useDiceRollerStore.setState({ notationInput: '' });
        render(createElement(Page));
        expect(screen.getAllByRole('button', { name: 'S' })).toHaveLength(2);
        expect(screen.queryByRole('button', { name: 'E' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'P' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Roll Courage' }));
        expect(useDiceRollerStore.getState().notationInput).toBe('4d10>=6f=1');
        fireEvent.click(screen.getAllByRole('button', { name: 'S' })[0]!);
        fireEvent.click(screen.getAllByRole('button', { name: 'S' })[1]!);
        const exported = scratch.getDocument();
        expect(exported.data).toMatchObject({
            attributes: { Strength: { experienced: true, practiced: true, specialization: true } },
            customTalents: [{ experienced: true, practiced: true, specialization: true }],
            virtues: { Courage: { specialization: true, experienced: true } },
        });
    });
});
