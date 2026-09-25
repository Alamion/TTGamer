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
