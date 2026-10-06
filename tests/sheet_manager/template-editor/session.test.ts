import { selectOnly } from '@site/src/sheet_manager/features/template-editor/model/selection';
import { findNode, updateNode } from '@site/src/sheet_manager/features/template-editor/model/tree';
import { removeSelection } from '@site/src/sheet_manager/features/template-editor/operations/selection';
import { switchKind } from '@site/src/sheet_manager/features/template-editor/operations/switches';
import { createEditorSession } from '@site/src/sheet_manager/features/template-editor/session/store';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it, vi } from 'vitest';

const page = () =>
    CustomTemplateSchema.parse({
        id: 'tpl-session',
        name: 'Session',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            { id: 'a', type: 'number', label: 'Alpha' },
            { id: 'b', type: 'number', label: 'Beta' },
            {
                id: 'gear',
                type: 'group',
                title: 'Gear',
                hideTitle: true,
                children: [],
            },
        ],
    });

const plural = vi.fn(
    (descriptor: { message: string }, count: number) => `${count}× ${descriptor.message}`
);
const open = () => createEditorSession(page(), plural);

describe('editor session (spec 025, US2)', () => {
    it('makes each change, undo, and redo one step', () => {
        const session = open();
        session.change((draft) => updateNode(draft, 'a', { label: 'One' }));
        session.change((draft) => updateNode(draft, 'a', { label: 'Two' }));
        expect(findNode(session.draft(), 'a')).toMatchObject({ label: 'Two' });
        session.undo();
        expect(findNode(session.draft(), 'a')).toMatchObject({ label: 'One' });
        session.redo();
        expect(findNode(session.draft(), 'a')).toMatchObject({ label: 'Two' });
    });

    it('merges typing in one setting into one step', () => {
        const session = open();
        for (const label of ['A', 'Al', 'Alp']) {
            session.change((draft) => updateNode(draft, 'a', { label }), {
                coalesceKey: 'a:label',
            });
        }
        session.undo();
        expect(findNode(session.draft(), 'a')).toMatchObject({ label: 'Alpha' });
    });

    it('runs an operation with its selection and announcement, in one step', () => {
        const session = open();
        session.select(selectOnly('a'));
        expect(session.run(removeSelection)).toBe(true);
        expect(session.selection()).toEqual(selectOnly('b'));
        expect(session.store.getState().announcement).toContain('Alpha');
        session.undo();
        expect(findNode(session.draft(), 'a')).toBeDefined();
        expect(session.selection()).toEqual(selectOnly('a'));
    });

    it('translates counts through the plural messages', () => {
        const session = open();
        session.select({ ids: ['a', 'b'], anchor: 'b' });
        session.run(removeSelection);
        expect(plural).toHaveBeenCalledWith(expect.anything(), 2, { count: 2 });
        expect(session.store.getState().announcement).toMatch(/^2×/);
    });

    it('shows a refusal as an issue and an announcement, and keeps the page', () => {
        const session = open();
        const before = session.draft();
        expect(session.run(() => ({ ok: false, error: 'depth', limit: 3 }))).toBe(false);
        expect(session.draft()).toBe(before);
        const { saveIssues, announcement } = session.store.getState();
        expect(saveIssues).toEqual([{ message: announcement }]);
        expect(announcement).toContain('3');
        session.change((draft) => draft);
        expect(session.store.getState().saveIssues).toEqual([]);
    });

    it('keeps settings a switch drops for the session and brings them back', () => {
        const session = open();
        session.run(switchKind('gear', 'section', session.stash));
        expect(findNode(session.draft(), 'gear')).not.toHaveProperty('hideTitle');
        expect(session.store.getState().announcement).toBeTruthy();
        session.run(switchKind('gear', 'card', session.stash));
        expect(findNode(session.draft(), 'gear')).toMatchObject({ hideTitle: true });
    });
});
