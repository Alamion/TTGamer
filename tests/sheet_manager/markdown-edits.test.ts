import {
    applyEdit,
    insertCallout,
    linkSelection,
    toggleChecklist,
    wrapSelection,
} from '@site/src/sheet_manager/features/sheet/declarative/markdownEdits';
import { describe, expect, it } from 'vitest';

const run = (text: string, edit: ReturnType<typeof wrapSelection>) => ({
    text: applyEdit(text, edit),
    selected: applyEdit(text, edit).slice(edit.selectFrom, edit.selectTo),
});

describe('markdown edits (spec 043, FR-006a)', () => {
    it('wraps the selection, or a placeholder when nothing is selected', () => {
        expect(run('go now', wrapSelection('go now', { start: 3, end: 6 }, '**', 'text'))).toEqual({
            text: 'go **now**',
            selected: 'now',
        });
        expect(run('', wrapSelection('', { start: 0, end: 0 }, '*', 'text'))).toEqual({
            text: '*text*',
            selected: 'text',
        });
    });

    it('selects the address of a new link', () => {
        expect(run('map', linkSelection('map', { start: 0, end: 3 }, 'text'))).toEqual({
            text: '[map](https://)',
            selected: 'https://',
        });
    });

    it('toggles checklist items on every selected line', () => {
        const text = 'one\n- two\n- [x] three';
        const on = applyEdit(text, toggleChecklist(text, { start: 0, end: text.length }));
        expect(on).toBe('- [ ] one\n- [ ] two\n- [x] three');
        expect(applyEdit(on, toggleChecklist(on, { start: 0, end: on.length }))).toBe(
            'one\ntwo\nthree'
        );
    });

    it('puts the selected lines in a callout, folded when asked, with the title selected', () => {
        const text = 'a\nb';
        expect(run(text, insertCallout(text, { start: 0, end: 3 }, 'Title', true))).toEqual({
            text: '> [!note]- Title\n> a\n> b',
            selected: 'Title',
        });
        expect(applyEdit('', insertCallout('', { start: 0, end: 0 }, 'T', false))).toBe(
            '> [!note] T\n> '
        );
    });
});
