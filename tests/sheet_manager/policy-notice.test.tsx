// @vitest-environment jsdom

import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import {
    PolicyBadges,
    PolicyStatement,
} from '@site/src/sheet_manager/features/sheet/shell/PolicyNotice';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { PUBLISHER_POLICIES, systemRegistry } from '@site/src/sheet_manager/systems';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod/schema';
import { cleanup, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { hunterData, seedHunter } from './systems/v5/hunterFixtures';

const RENDER_TIMEOUT = 20_000;
const darkPack = PUBLISHER_POLICIES['dark-pack'];

afterEach(() => {
    cleanup();
    useTemplateStore.setState({ templates: [], defaultOverrides: {} });
});

describe('PolicyBadges', () => {
    it('renders nothing without policies', () => {
        const { container } = render(createElement(PolicyBadges, { policies: [] }));
        expect(container.innerHTML).toBe('');
    });

    it('renders only the badge, linking to the policy page', () => {
        render(createElement(PolicyBadges, { policies: [darkPack, darkPack] }));
        const notice = screen.getByRole('complementary', { name: 'Publisher notice' });
        const link = within(notice).getByRole('link', { name: 'Dark Pack' });
        expect(link.getAttribute('href')).toBe(darkPack.aboutPage);
        expect(within(notice).getByRole('img').getAttribute('src')).toBe(darkPack.badge);
        expect(within(notice).getAllByRole('link')).toHaveLength(1);
        expect(within(notice).queryByText(darkPack.officialNotice[0]!)).toBeNull();
    });
});

describe('PolicyStatement', () => {
    it('renders the badge, the verbatim notice, the explanation, and a safe link', () => {
        render(createElement(PolicyStatement, { policy: 'dark-pack' }));
        const notice = screen.getByRole('complementary', { name: 'Publisher notice' });
        for (const sentence of darkPack.officialNotice) {
            expect(within(notice).getByText(sentence)).toBeTruthy();
        }
        expect(within(notice).getByRole('img', { name: 'Dark Pack' })).toBeTruthy();
        expect(within(notice).getByText(/free fan-made tool/)).toBeTruthy();
        const link = within(notice).getByRole('link', { name: 'About the Dark Pack policy' });
        expect(link.getAttribute('href')).toBe(darkPack.url);
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
});

describe('policy notice on sheets', () => {
    it(
        'shows the Dark Pack badge under the shipped and a user hunter page',
        () => {
            seedHunter(hunterData());
            const { unmount } = render(createElement(CharacterSheet));
            expect(screen.getByRole('complementary', { name: 'Publisher notice' })).toBeTruthy();
            unmount();

            const shipped = systemRegistry
                .getSystem('wod-v5')!
                .defaultTemplates!.find(({ id }) => id === 'v5-hunter-sheet')!;
            useTemplateStore.setState({
                templates: [{ ...shipped, id: 'my-hunter-page', name: 'Mine', children: [] }],
                defaultOverrides: {},
            });
            const document = useDocumentStore.getState().documents[0]!;
            useDocumentStore.setState({
                documents: [
                    {
                        ...document,
                        metadata: { ...document.metadata, templateId: 'my-hunter-page' },
                    },
                ],
            });
            render(createElement(CharacterSheet));
            expect(screen.getByRole('complementary', { name: 'Publisher notice' })).toBeTruthy();
        },
        RENDER_TIMEOUT
    );

    it(
        'shows no badge for a Star Wars character',
        () => {
            useDocumentStore.setState({
                documents: [
                    {
                        id: 'sw',
                        kind: 'character',
                        systemId: 'star-wars-wod',
                        definitionId: 'character',
                        schemaVersion: 1,
                        metadata: { title: 'Jax', tags: [] },
                        templateValues: {},
                        data: createDefaultStarWarsCharacterData(),
                    } as never,
                ],
                currentDocumentId: 'sw',
            });
            render(createElement(CharacterSheet));
            expect(screen.queryByRole('complementary', { name: 'Publisher notice' })).toBeNull();
        },
        RENDER_TIMEOUT
    );
});
