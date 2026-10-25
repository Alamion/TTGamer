// @vitest-environment happy-dom
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    PORTRAIT_SHOWN,
    portraitFieldBinding,
    showPortraitFieldBinding,
} from '@site/src/sheet_manager/systems/portraitBinding';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod';
import { fieldBindingUpdate } from '@site/src/sheet_manager/systems/templateBindings';
import {
    type CustomTemplate,
    type GroupNode,
    type TemplateNode,
    walkTemplateNodes,
} from '@site/src/sheet_manager/types/template';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** A character's portrait card shows only while the page's "Show portrait" switch is on. */

const kinds = new Set(['character']);
const shown = showPortraitFieldBinding(kinds);

const shipped = (id: string): CustomTemplate =>
    systemRegistry
        .getSystems()
        .flatMap((system) => system.defaultTemplates ?? [])
        .find((template) => template.id === id)!;

const nodes = (template: CustomTemplate) => {
    const found: TemplateNode[] = [];
    walkTemplateNodes(template.children, (node) => {
        found.push(node);
    });
    return found;
};

const childIds = (template: CustomTemplate, sectionId: string, column: number) =>
    (nodes(template).find(({ id }) => id === sectionId) as GroupNode).children
        .filter((child) => child.column === column)
        .map(({ id }) => id);

describe('the show-portrait switch', () => {
    it('is off for a new document and on for one that already has a portrait', () => {
        expect(shown.adapter!.read({ metadata: {} })).toBe(false);
        expect(shown.adapter!.read({ metadata: { imageUrl: '' } })).toBe(false);
        expect(shown.adapter!.read({ metadata: { imageUrl: '/img/jax.png' } })).toBe(true);
        expect(shown.adapter!.read({ metadata: { portraitId: 'blob-1' } })).toBe(true);
        expect(
            shown.adapter!.read({ metadata: { imageUrl: '/img/jax.png', showPortrait: false } })
        ).toBe(false);
    });

    it('writes beside the portrait and keeps the other metadata', () => {
        expect(fieldBindingUpdate(shown, { metadata: { name: 'Jax' } }, true)).toEqual({
            metadata: { name: 'Jax', showPortrait: true },
        });
    });

    it('stays on after the portrait it was showing is removed', () => {
        const portrait = portraitFieldBinding(kinds);
        const data = { metadata: { imageUrl: '/img/jax.png' } };
        const removed = fieldBindingUpdate(portrait, data, undefined);
        expect(shown.adapter!.read(removed)).toBe(true);
    });
});

describe('character pages with the switch', () => {
    const characters = [
        'full-sheet',
        'droid-sheet',
        'wod2e-sheet',
        'v5-core-sheet',
        'v5-hunter-sheet',
        'v5-vampire-sheet',
        'v5-storyteller-sheet',
    ];

    it.each(characters)('%s hides its portrait card behind the switch', (id) => {
        const all = nodes(shipped(id));
        const portrait = all.find(
            (node) => node.type === 'group' && node.children.some((c) => c.type === 'image')
        )!;
        expect(portrait.visibleWhen).toEqual(PORTRAIT_SHOWN);
        expect(
            all.filter((node) => node.type === 'primitive' && node.bindingKey === shown.key)
        ).toHaveLength(1);
    });

    it('keeps the group emblem always shown', () => {
        const emblem = nodes(shipped('v5-group-sheet')).find(({ id }) => id === 'portrait')!;
        expect(emblem.visibleWhen).toBeUndefined();
    });

    it.each(['full-sheet', 'droid-sheet', 'wod2e-sheet'])(
        '%s folds Appearance and Biography and puts weapons and armor first',
        (id) => {
            const all = nodes(shipped(id));
            for (const card of ['base-appearance', 'base-biography']) {
                expect(all.find((node) => node.id === card)).toMatchObject({
                    defaultCollapsed: true,
                });
            }
            expect(childIds(shipped(id), 'body', 1)).toEqual(['body-weapons', 'body-armor']);
            expect(childIds(shipped(id), 'body', 2)[0]).toBe('body-inventory');
        }
    );
});

describe('a column whose elements are all hidden', () => {
    afterEach(() => {
        cleanup();
        takeSheetIssues();
    });

    const renderWith = (metadata: object) => {
        useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });
        const data = createDefaultStarWarsCharacterData();
        useDocumentStore.setState({
            documents: [
                {
                    id: 'doc-portrait',
                    kind: 'character',
                    systemId: 'star-wars-wod',
                    definitionId: 'character',
                    schemaVersion: 1,
                    metadata: { title: 'Jax', tags: [] },
                    templateValues: {},
                    data: { ...data, metadata: { ...data.metadata, ...metadata } },
                } as never,
            ],
            currentDocumentId: 'doc-portrait',
        });
        render(createElement(DeclarativeSheetView, { template: shipped('full-sheet') }));
        // The column the Base section's identity card stands in, if the section has columns.
        return screen.getByRole('textbox', { name: 'Concept' }).closest('[data-column]');
    };

    it('gives its width to the other columns', () => {
        expect(renderWith({})).toBeNull();
        expect(screen.queryByLabelText('Image URL')).toBeNull();
    });

    it('keeps it while something in it shows', () => {
        expect(renderWith({ showPortrait: true })?.getAttribute('data-column')).toBe('2');
        expect(screen.getByLabelText('Image URL')).toBeTruthy();
    });
});
