import { shortcutHandlers } from '@site/src/sheet_manager/features/template-editor/commands/keys';
import {
    type CommandContext,
    EDITOR_COMMANDS,
} from '@site/src/sheet_manager/features/template-editor/commands/list';
import { createMenuSource } from '@site/src/sheet_manager/features/template-editor/commands/menu';
import { selectOnly } from '@site/src/sheet_manager/features/template-editor/selection';
import { createEditorSession } from '@site/src/sheet_manager/features/template-editor/session/store';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const page = () =>
    CustomTemplateSchema.parse({
        id: 'tpl-commands',
        name: 'Commands',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            { id: 'a', type: 'number', label: 'Alpha' },
            { id: 'b', type: 'number', label: 'Beta' },
        ],
    });

function open() {
    const session = createEditorSession(page(), (_, count) => String(count));
    const context: CommandContext = {
        session,
        clipboard: () => false,
        openShortcuts: () => {},
    };
    return { session, context, menu: createMenuSource(context), keys: shortcutHandlers(context) };
}

const order = (session: ReturnType<typeof open>['session']) =>
    session.draft().children.map(({ id }) => id);

describe('commands own what they do and when (spec 025, US2)', () => {
    it('gives every key command a behavior', () => {
        for (const command of EDITOR_COMMANDS) {
            if (command.keys || command.character || command.clipboard) {
                expect(command.run, command.id).toBeDefined();
            }
        }
    });

    it('disables a move in the menu exactly when its keys do nothing', () => {
        const { session, menu, keys } = open();
        session.select(selectOnly('a'));
        const items = menu.items('a', false);
        const item = (id: string) => items.find((entry) => entry.id === id)!;
        expect(item('move-up').disabled).toBe(true);
        expect(item('move-down').disabled).toBe(false);
        expect(item('move-out').disabled).toBe(true);

        keys['move-up']!();
        expect(order(session)).toEqual(['a', 'b']);
        keys['move-out']!();
        expect(order(session)).toEqual(['a', 'b']);
        keys['move-down']!();
        expect(order(session)).toEqual(['b', 'a']);
    });

    it('runs a menu entry on the element under the pointer when it is not selected', () => {
        const { session, menu } = open();
        session.select(selectOnly('a'));
        const remove = menu.items('b', true).find((entry) => entry.id === 'delete')!;
        remove.run();
        expect(order(session)).toEqual(['a']);
    });

    it('enables undo only after a change, for the toolbar and the keys alike', () => {
        const { session, context, keys } = open();
        const undo = EDITOR_COMMANDS.find(({ id }) => id === 'undo')!;
        expect(undo.enabled!(context, [])).toBe(false);
        session.select(selectOnly('a'));
        keys.delete!();
        expect(undo.enabled!(context, [])).toBe(true);
        keys.undo!();
        expect(order(session)).toEqual(['a', 'b']);
    });

    it('offers only paste at the end of an empty area', () => {
        const { menu } = open();
        expect(menu.items(null, false).map(({ id }) => id)).toEqual(['paste']);
    });
});
