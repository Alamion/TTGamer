import { fieldFromSource } from '@site/src/sheet_manager/features/template-editor/elements/sources';
import { collectDraftNotices } from '@site/src/sheet_manager/features/template-editor/issues/draftNotices';
import { listDocumentBindings } from '@site/src/sheet_manager/systems/templateBindings';
import { type CustomTemplate, CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const draft = (systemId: string, documentKind: string, children: unknown[]): CustomTemplate =>
    CustomTemplateSchema.parse({
        id: 'tpl-name-check',
        name: 'Name check',
        systemId,
        documentKind,
        schemaVersion: 3,
        children,
    });

const ENGINE = 'wod-2e';
const nameBinding = (systemId: string, kind: string) =>
    listDocumentBindings(systemId, kind).find(
        (binding) => binding.key === 'field:name' && binding.kind === 'field'
    )!;

describe('the page has a field that stores the document name', () => {
    const section = (...children: unknown[]) => [
        { id: 'sec', type: 'section', title: 'Data', children },
    ];

    it('says so when a page stores no name', () => {
        expect(collectDraftNotices(draft(ENGINE, 'character', section()))).toEqual(['noName']);
    });

    it('says so for a text field called Name that is not set to store the Name', () => {
        const unbound = { id: 'f-1', type: 'text', label: 'Имя персонажа' };
        expect(collectDraftNotices(draft(ENGINE, 'character', section(unbound)))).toEqual([
            'noName',
        ]);
    });

    it('stays quiet when a field is set to store the Name', () => {
        const field = fieldFromSource(
            { id: 'f-1', type: 'text', label: 'x', required: false, compact: false } as never,
            nameBinding(ENGINE, 'character') as never
        );
        expect(collectDraftNotices(draft(ENGINE, 'character', section(field)))).toEqual([]);
    });

    it('applies to a shipped game character page too', () => {
        expect(collectDraftNotices(draft('star-wars-wod', 'character', section()))).toEqual([
            'noName',
        ]);
    });

    it('stays quiet where the game has no name to store', () => {
        expect(collectDraftNotices(draft(ENGINE, 'no-such-kind', section()))).toEqual([]);
    });
});
