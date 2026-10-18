// @vitest-environment happy-dom
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { readCreatePreferences } from '@site/src/sheet_manager/features/documents/createChoices';
import { CreateCharacterButton } from '@site/src/sheet_manager/features/sheet/shell/CreateCharacterButton';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

const show = (props: Parameters<typeof CreateCharacterButton>[0]) =>
    render(
        createElement(
            'div',
            null,
            createElement(CreateCharacterButton, props),
            createElement(Toaster)
        )
    );

beforeEach(() => {
    useDocumentStore.setState({ documents: [], entries: [], folders: [], currentDocumentId: null });
});

afterEach(() => {
    act(() => toast.remove());
    cleanup();
});

describe('documentation create buttons (spec 039, US5)', () => {
    it('names the kind, creates a blank document, and links to the sheet', async () => {
        show({ systemId: 'wod-v5', definitionId: 'vampire' });
        const button = screen.getByRole('button', {
            name: 'New: Character (Vampire: the Masquerade 5e)',
        });
        fireEvent.click(button);
        const [created] = useDocumentStore.getState().documents;
        expect(created).toMatchObject({ definitionId: 'vampire', metadata: { title: '' } });
        expect(useDocumentStore.getState().currentDocumentId).toBe(created!.id);
        expect(readCreatePreferences().recent).toEqual(['wod-v5/vampire']);
        const open = await screen.findByRole('link', { name: 'Open' });
        expect(open.getAttribute('href')).toBe('/universal_sheet');
        expect(
            screen.getByText('Created "Character (Vampire: the Masquerade 5e)".', { exact: false })
        ).toBeTruthy();
    });

    it('copies an example under its name', async () => {
        show({ systemId: 'wod-v5', definitionId: 'vampire', exampleId: 'mirela-voss::example' });
        fireEvent.click(screen.getByRole('button', { name: 'Copy Mirela Voss' }));
        fireEvent.click(screen.getByRole('button', { name: 'Copy Mirela Voss' }));
        const copies = useDocumentStore.getState().documents;
        expect(copies.map(({ metadata }) => metadata.title)).toEqual([
            'Mirela Voss',
            'Mirela Voss',
        ]);
        expect(copies[0]!.id).not.toBe(copies[1]!.id);
        expect(
            await screen.findAllByText('Created "Mirela Voss".', { exact: false })
        ).not.toHaveLength(0);
    });

    it('says when the kind or example is not installed, reports it, and creates nothing', async () => {
        show({ systemId: 'wod-v5', definitionId: 'vampire', exampleId: 'nobody::example' });
        fireEvent.click(screen.getByRole('button', { name: /vampire/ }));
        expect(useDocumentStore.getState().entries).toHaveLength(0);
        expect(
            await screen.findByText(
                'Could not create "vampire": this kind of document is not available.'
            )
        ).toBeTruthy();
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['create-kind-unavailable']);
    });

    it('keeps the Star Wars character as the default for older pages', () => {
        show({});
        fireEvent.click(
            screen.getByRole('button', {
                name: 'New: Character (Star Wars (World of Darkness 2e))',
            })
        );
        expect(useDocumentStore.getState().documents[0]!.definitionId).toBe('character');
    });
});

describe('create buttons in the documentation pages', () => {
    const roots = ['docs', 'i18n/ru/docusaurus-plugin-content-docs/current'];
    const files = (dir: string): string[] =>
        readdirSync(dir).flatMap((entry) => {
            const full = path.join(dir, entry);
            if (statSync(full).isDirectory()) return files(full);
            return full.endsWith('.mdx') ? [full] : [];
        });
    const buttons = roots
        .flatMap((root) => files(path.resolve(root)))
        .flatMap((file) =>
            [...readFileSync(file, 'utf8').matchAll(/<CreateCharacterButton([^>]*)\/>/g)].map(
                ([, attributes]) => {
                    const read = (name: string) =>
                        new RegExp(`${name}="([^"]+)"`).exec(attributes!)?.[1];
                    return {
                        file: path.relative(process.cwd(), file),
                        systemId: read('systemId') ?? 'star-wars-wod',
                        definitionId: read('definitionId') ?? 'character',
                        exampleId: read('exampleId'),
                    };
                }
            )
        );

    it('name installed kinds and examples of those kinds', () => {
        expect(buttons.filter(({ exampleId }) => exampleId).length).toBeGreaterThanOrEqual(4);
        for (const button of buttons) {
            const definition = systemRegistry.getDocumentDefinition(
                button.systemId,
                button.definitionId
            );
            expect(definition, button.file).toBeTruthy();
            if (button.exampleId) {
                expect(
                    definition!.examples?.some(({ id }) => id === button.exampleId),
                    button.file
                ).toBe(true);
            }
        }
    });
});
