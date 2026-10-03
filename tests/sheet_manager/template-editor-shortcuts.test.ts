import {
    EDITOR_COMMANDS,
    formatKeys,
} from '@site/src/sheet_manager/components/dialogs/template-editor/commands';
import { matchEditorShortcut } from '@site/src/sheet_manager/components/dialogs/template-editor/shortcuts';
import { describe, expect, it } from 'vitest';

const press = (
    code: string,
    modifiers: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {},
    typing = false
) =>
    matchEditorShortcut(
        { code, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers },
        { typing }
    );

describe('editor shortcuts by physical key', () => {
    // The layout never enters matching: a Russian layout sends key «я» with code KeyZ.
    it('maps Ctrl/⌘ shortcuts from key codes', () => {
        expect(press('KeyZ', { ctrlKey: true })).toBe('undo');
        expect(press('KeyZ', { metaKey: true })).toBe('undo');
        expect(press('KeyZ', { ctrlKey: true, shiftKey: true })).toBe('redo');
        expect(press('KeyY', { ctrlKey: true })).toBe('redo');
        expect(press('KeyD', { ctrlKey: true })).toBe('duplicate');
        expect(press('KeyD', { metaKey: true })).toBe('duplicate');
    });

    it('maps moves and delete', () => {
        expect(press('ArrowUp', { altKey: true })).toBe('move-up');
        expect(press('ArrowDown', { altKey: true })).toBe('move-down');
        expect(press('ArrowLeft', { altKey: true })).toBe('move-out');
        expect(press('ArrowRight', { altKey: true })).toBe('move-in');
        expect(press('ArrowLeft', { altKey: true, shiftKey: true })).toBe('column-prev');
        expect(press('ArrowRight', { altKey: true, shiftKey: true })).toBe('column-next');
        expect(press('Delete')).toBe('delete');
    });

    it('leaves text editing keys to a focused field', () => {
        expect(press('KeyZ', { ctrlKey: true }, true)).toBeNull();
        expect(press('KeyY', { ctrlKey: true }, true)).toBeNull();
        expect(press('Delete', {}, true)).toBeNull();
        expect(press('ArrowUp', { altKey: true }, true)).toBeNull();
        expect(press('KeyD', { ctrlKey: true }, true)).toBe('duplicate');
    });

    it('ignores unrelated keys', () => {
        expect(press('KeyZ')).toBeNull();
        expect(press('KeyX', { ctrlKey: true })).toBeNull();
        expect(press('KeyZ', { ctrlKey: true, altKey: true })).toBeNull();
        expect(press('Backspace')).toBeNull();
    });
});

describe('command registry (spec 023)', () => {
    const keyed = EDITOR_COMMANDS.filter(({ id, keys }) => keys && id !== 'clear-selection');

    it('matches every key binding to its own command', () => {
        for (const command of keyed) {
            for (const binding of command.keys!) {
                const apple = binding.apple ?? false;
                const event = {
                    code: binding.code,
                    ctrlKey: Boolean(binding.mod),
                    metaKey: false,
                    shiftKey: Boolean(binding.shift),
                    altKey: Boolean(binding.alt),
                };
                expect(matchEditorShortcut(event, { typing: false, apple }), command.id).toBe(
                    command.id
                );
            }
        }
    });

    it('gives no two commands the same keys', () => {
        const seen = new Set<string>();
        for (const command of EDITOR_COMMANDS) {
            for (const binding of command.keys ?? []) {
                const key = JSON.stringify([
                    binding.code,
                    Boolean(binding.mod),
                    Boolean(binding.shift),
                    Boolean(binding.alt),
                    binding.apple,
                ]);
                expect(seen.has(key), key).toBe(false);
                seen.add(key);
            }
        }
    });

    it('removes with Backspace on Apple platforms only', () => {
        expect(press('Backspace')).toBeNull();
        expect(
            matchEditorShortcut(
                {
                    code: 'Backspace',
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false,
                    altKey: false,
                },
                { typing: false, apple: true }
            )
        ).toBe('delete');
    });

    it('writes keys in the platform notation', () => {
        const byId = (id: string) => EDITOR_COMMANDS.find((command) => command.id === id)!;
        const pc = { apple: false, clickWord: 'click' };
        const mac = { apple: true, clickWord: 'click' };
        expect(formatKeys(byId('copy'), pc)).toEqual(['Ctrl+C']);
        expect(formatKeys(byId('copy'), mac)).toEqual(['⌘C']);
        expect(formatKeys(byId('move-up'), mac)).toEqual(['⌥↑']);
        expect(formatKeys(byId('column-prev'), pc)).toEqual(['Alt+Shift+←']);
        expect(formatKeys(byId('redo'), pc)).toEqual(['Ctrl+Shift+Z', 'Ctrl+Y']);
        expect(formatKeys(byId('delete'), pc)).toEqual(['Delete']);
        expect(formatKeys(byId('delete'), mac)).toEqual(['⌦', '⌫']);
        expect(formatKeys(byId('toggle-selection'), pc)).toEqual(['Ctrl+click']);
        expect(formatKeys(byId('range-selection'), mac)).toEqual(['⇧click']);
    });
});
