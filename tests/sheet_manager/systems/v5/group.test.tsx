// @vitest-environment happy-dom

import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import {
    type CustomTemplate,
    TEMPLATE_SCHEMA_VERSION,
} from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../../../setup/sheetIssues';

/** Groups and their members (spec 040, US3). */

const RENDER_TIMEOUT = 40_000;

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    Element.prototype.scrollIntoView ??= () => undefined;
});

afterEach(cleanup);

function envelope(
    id: string,
    definitionId: string,
    title: string,
    templateValues: Record<string, unknown> = {},
    preferredViewId?: string
): UnknownDocumentEnvelope {
    const definition = systemRegistry.getDocumentDefinition('wod-v5', definitionId)!;
    return {
        id,
        kind: definition.kind,
        systemId: 'wod-v5',
        definitionId: definition.id,
        schemaVersion: 1,
        metadata: { title, tags: [], ...(preferredViewId ? { preferredViewId } : {}) },
        templateValues,
        data: { ...(definition.createDefault() as object), name: title },
    } as unknown as UnknownDocumentEnvelope;
}

function seed(current: string, documents: UnknownDocumentEnvelope[]) {
    useDocumentStore.setState({ documents, currentDocumentId: current });
}

const CHURCH = (members: string[]) =>
    envelope('church', 'v5-group', 'Church of the Red Dawn', { members });

const ruiz = () => envelope('ruiz', 'v5-storyteller', 'Detective Ruiz', {}, 'v5-storyteller-brief');
const hunter = () => envelope('ana', 'hunter', 'Ana');
const vampire = () => envelope('sheriff', 'vampire', 'The Sheriff', {}, 'v5-vampire-brief');

describe('a group and its members', () => {
    it(
        'lists members of every V5 kind with links, and never offers itself',
        () => {
            seed('church', [CHURCH(['ruiz', 'ana']), ruiz(), hunter(), vampire()]);
            render(createElement(CharacterSheet));
            const members = screen.getByRole('list', { name: 'Members' });
            expect(within(members).getByText('Detective Ruiz')).toBeTruthy();
            expect(within(members).getByText('Ana')).toBeTruthy();
            const search = screen.getByRole('searchbox', { name: 'Members' });
            fireEvent.change(search, { target: { value: 'e' } });
            const offered = screen.queryAllByRole('option').map((option) => option.textContent);
            expect(offered.join('|')).toMatch(/The Sheriff/);
            expect(offered.join('|')).not.toMatch(/Church of the Red Dawn/);
        },
        RENDER_TIMEOUT
    );

    it(
        'keeps the search of its brief behind Add',
        () => {
            seed('church', [
                envelope(
                    'church',
                    'v5-group',
                    'Church of the Red Dawn',
                    { members: ['ruiz'] },
                    'v5-group-brief'
                ),
                ruiz(),
                hunter(),
            ]);
            render(createElement(CharacterSheet));
            const members = screen.getByRole('list', { name: 'Members' });
            expect(within(members).getByText('Detective Ruiz')).toBeTruthy();
            expect(screen.queryByRole('searchbox', { name: 'Members' })).toBeNull();
            fireEvent.click(screen.getByRole('button', { name: 'Add' }));
            const search = screen.getByRole('searchbox', { name: 'Members' });
            expect(document.activeElement).toBe(search);
            fireEvent.change(search, { target: { value: 'An' } });
            fireEvent.click(screen.getByRole('option', { name: 'Ana' }));
            const church = useDocumentStore.getState().documents.find(({ id }) => id === 'church')!;
            expect(church.templateValues.members).toEqual(['ruiz', 'ana']);
        },
        RENDER_TIMEOUT
    );

    it(
        'says a deleted member is gone and lets it be removed',
        () => {
            seed('church', [CHURCH(['ruiz', 'gone']), ruiz()]);
            render(createElement(CharacterSheet));
            const members = screen.getByRole('list', { name: 'Members' });
            expect(within(members).getByText('Linked document no longer exists')).toBeTruthy();
            fireEvent.click(screen.getByRole('button', { name: 'Remove gone' }));
            const church = useDocumentStore.getState().documents.find(({ id }) => id === 'church')!;
            expect(church.templateValues.members).toEqual(['ruiz']);
            expect(new Set(takeSheetIssues().map(({ code }) => code))).toEqual(
                new Set(['reference-target-missing'])
            );
        },
        RENDER_TIMEOUT
    );
});

describe('"Member of" on a character', () => {
    it(
        'lists every group naming the character, a group inside a group too',
        async () => {
            seed('ruiz', [
                CHURCH(['ruiz']),
                envelope('night', 'v5-group', 'Night Court', { members: ['ruiz', 'church'] }),
                ruiz(),
            ]);
            render(createElement(CharacterSheet));
            fireEvent.click(screen.getByRole('button', { name: /Member of/ }));
            const memberOf = await screen.findByRole('list', { name: 'Member of' });
            expect(
                within(memberOf)
                    .getAllByRole('listitem')
                    .map((item) => item.textContent)
            ).toEqual(['Church of the Red Dawn', 'Night Court']);
            expect(screen.getByRole('button', { name: 'Open Night Court' })).toBeTruthy();
        },
        RENDER_TIMEOUT
    );

    it(
        'shows the groups of a vampire on its brief, folded until opened',
        async () => {
            seed('sheriff', [CHURCH(['sheriff']), vampire()]);
            render(createElement(CharacterSheet));
            expect(screen.queryByRole('list', { name: 'Member of' })).toBeNull();
            fireEvent.click(screen.getByRole('button', { name: /Member of/ }));
            expect(
                await within(await screen.findByRole('list', { name: 'Member of' })).findByText(
                    'Church of the Red Dawn'
                )
            ).toBeTruthy();
        },
        RENDER_TIMEOUT
    );

    it(
        'works on an author’s own page with an incoming reference field',
        async () => {
            seed('ruiz', [CHURCH(['ruiz']), ruiz()]);
            const page: CustomTemplate = {
                id: 'tpl-allies01',
                name: 'Allies',
                systemId: 'wod-v5' as CustomTemplate['systemId'],
                documentKind: 'storyteller' as CustomTemplate['documentKind'],
                schemaVersion: TEMPLATE_SCHEMA_VERSION,
                children: [
                    {
                        id: 'linked',
                        type: 'reference',
                        label: 'Belongs to',
                        valueKey: 'belongs-to',
                        targetKinds: ['v5-group'],
                        multiple: true,
                        incoming: true,
                        compact: false,
                        required: false,
                    },
                ],
            } as unknown as CustomTemplate;
            render(createElement(DeclarativeSheetView, { template: page }));
            const list = await screen.findByRole('list', { name: 'Belongs to' });
            expect(within(list).getByText('Church of the Red Dawn')).toBeTruthy();
        },
        RENDER_TIMEOUT
    );
});
