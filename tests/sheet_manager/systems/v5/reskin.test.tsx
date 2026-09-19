// @vitest-environment jsdom

import {
    createDraftFromTemplate,
    removeNode,
    updateNode,
} from '@site/src/sheet_manager/components/dialogs/template-editor/draft';
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { validateTemplateReferences } from '@site/src/sheet_manager/features/sheet/data/templateReferences';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import {
    parseTemplateFile,
    serializeTemplateFile,
} from '@site/src/sheet_manager/features/sheet/shell/templateFile';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod/schema';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../../../setup/sheetIssues';
import { currentHunter, hunterData, seedHunter } from './hunterFixtures';

const RENDER_TIMEOUT = 20_000;

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    Element.prototype.scrollIntoView ??= () => undefined;
});

afterEach(() => {
    cleanup();
    useTemplateStore.setState({ templates: [], defaultOverrides: {} });
});

const RENAMES: Record<string, string> = {
    'skill-firearms': 'Archery',
    'skill-technology': 'Alchemy',
    'skill-driving': 'Riding',
    'skill-finance': 'Trade',
    'skill-politics': 'Courtly Intrigue',
    'skill-science': 'Natural Philosophy',
    'creed-field': 'Oath',
    'drive-field': 'Calling',
    'attribute-wits': 'Cunning',
    'health-track': 'Vigor',
};

function homebrewTemplate(): CustomTemplate {
    const shipped = systemRegistry
        .getSystem('wod-v5')!
        .defaultTemplates!.find(({ id }) => id === 'v5-hunter-sheet')!;
    let draft = createDraftFromTemplate(shipped, {
        id: 'hollow-crown',
        name: 'Hollow Crown hunters',
    });
    for (const [nodeId, label] of Object.entries(RENAMES)) {
        draft = updateNode(draft, nodeId, { label });
    }
    return removeNode(draft, 'chronicle');
}

describe('re-skinning the hunter sheet (US4)', () => {
    it('keeps every binding valid after relabelling', () => {
        const template = homebrewTemplate();
        expect(template.systemId).toBe('wod-v5');
        expect(validateTemplateReferences(template)).toEqual([]);
    });

    it(
        'writes the same hunter values under the new labels',
        () => {
            seedHunter(hunterData({ skills: { firearms: { value: 1 } } }));
            const template = homebrewTemplate();
            const { unmount } = render(createElement(DeclarativeSheetView, { template }));
            expect(screen.getByText('Archery')).toBeTruthy();
            expect(screen.queryByText('Firearms')).toBeNull();
            expect(screen.queryByText('Chronicle Tenets')).toBeNull();
            expect(screen.getByRole('group', { name: 'Vigor' })).toBeTruthy();
            const archeryRow = screen.getByText('Archery').closest('.items-end') as HTMLElement;
            fireEvent.click(within(archeryRow).getAllByRole('radio')[2]!);
            unmount();
            const value = currentHunter().skills.firearms!.value;
            expect(value).toBe(3);

            const shipped = systemRegistry
                .getSystem('wod-v5')!
                .defaultTemplates!.find(({ id }) => id === 'v5-hunter-sheet')!;
            render(createElement(DeclarativeSheetView, { template: shipped }));
            expect(screen.getByText('Firearms')).toBeTruthy();
            expect(currentHunter().skills.firearms!.value).toBe(value);
        },
        RENDER_TIMEOUT
    );

    it('travels through a template file with its Dark Pack notice', () => {
        const text = serializeTemplateFile(homebrewTemplate());
        expect(JSON.parse(text).notices?.[0]?.policy).toBe('dark-pack');
        const parsed = parseTemplateFile(text);
        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            expect(parsed.template).not.toHaveProperty('notices');
            expect(parsed.template.systemId).toBe('wod-v5');
        }
    });

    it(
        'renders a hunter with the user template and still shows the badge',
        () => {
            const template = homebrewTemplate();
            useTemplateStore.setState({ templates: [template], defaultOverrides: {} });
            seedHunter();
            const document = useDocumentStore.getState().documents[0]!;
            useDocumentStore.setState({
                documents: [
                    { ...document, metadata: { ...document.metadata, templateId: template.id } },
                ],
            });
            render(createElement(CharacterSheet));
            expect(screen.getAllByText('Oath').length).toBeGreaterThan(0);
            expect(screen.getByRole('complementary', { name: 'Publisher notice' })).toBeTruthy();
        },
        RENDER_TIMEOUT
    );

    it(
        'refuses to render the hunter template for a Star Wars character',
        () => {
            const template = homebrewTemplate();
            useTemplateStore.setState({ templates: [template], defaultOverrides: {} });
            useDocumentStore.setState({
                documents: [
                    {
                        id: 'sw',
                        kind: 'character',
                        systemId: 'star-wars-wod',
                        definitionId: 'character',
                        schemaVersion: 1,
                        metadata: { title: 'Jax', tags: [], templateId: template.id },
                        templateValues: {},
                        data: createDefaultStarWarsCharacterData(),
                    } as never,
                ],
                currentDocumentId: 'sw',
            });
            render(createElement(CharacterSheet));
            expect(screen.queryByText('Oath')).toBeNull();
            expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
            expect(takeSheetIssues().map(({ code }) => code)).toContain('template-incompatible');
        },
        RENDER_TIMEOUT
    );
});
