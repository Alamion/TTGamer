import { resolveMoveTarget } from '@site/src/sheet_manager/components/dialogs/template-editor/moveTargets';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const text = (id: string, column?: number) => ({
    id,
    type: 'text',
    label: id,
    ...(column ? { column } : {}),
});

const draft = CustomTemplateSchema.parse({
    id: 'moves',
    name: 'Moves',
    documentKind: 'character',
    schemaVersion: 3,
    children: [
        {
            id: 'page',
            type: 'section',
            title: 'Page',
            columns: 2,
            children: [
                { id: 'left', type: 'group', title: 'Left', column: 1, children: [text('l1')] },
                text('a', 1),
                text('b', 2),
                text('c', 1),
                text('d', 2),
            ],
        },
        { id: 'tail', type: 'section', title: 'Tail', children: [text('t1')] },
    ],
}) as CustomTemplate;

describe('keyboard move targets', () => {
    it('moves among siblings of the same column', () => {
        expect(resolveMoveTarget(draft, 'c', 'move-up')).toEqual({ parentId: 'page', index: 1 });
        expect(resolveMoveTarget(draft, 'b', 'move-down')).toEqual({ parentId: 'page', index: 4 });
        expect(resolveMoveTarget(draft, 'b', 'move-up')).toBeNull();
        expect(resolveMoveTarget(draft, 'd', 'move-down')).toBeNull();
    });

    it('moves out right after the parent container and into the previous container', () => {
        expect(resolveMoveTarget(draft, 'l1', 'move-out')).toEqual({
            parentId: 'page',
            index: 1,
            column: 1,
        });
        expect(resolveMoveTarget(draft, 't1', 'move-out')).toEqual({
            parentId: null,
            index: 2,
            column: null,
        });
        expect(resolveMoveTarget(draft, 'a', 'move-in')).toEqual({
            parentId: 'left',
            index: 1,
            column: null,
        });
        expect(resolveMoveTarget(draft, 'page', 'move-out')).toBeNull();
    });

    it('changes columns and lands after the last node of the target column', () => {
        expect(resolveMoveTarget(draft, 'a', 'column-next')).toEqual({
            parentId: 'page',
            index: 4,
            column: 2,
        });
        expect(resolveMoveTarget(draft, 'b', 'column-prev')).toEqual({
            parentId: 'page',
            index: 3,
            column: 1,
        });
        expect(resolveMoveTarget(draft, 'a', 'column-prev')).toBeNull();
        expect(resolveMoveTarget(draft, 't1', 'column-next')).toBeNull();
    });
});
