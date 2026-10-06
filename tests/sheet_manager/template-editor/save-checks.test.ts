import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { selectPluralForm } from '@site/src/shared/hooks/usePluralMessage';
import {
    SAVE_CHECKS,
    type SaveCheck,
    saveEffects,
} from '@site/src/sheet_manager/features/template-editor/session/saveChecks';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const editor = uiMessages.sheet.templates.editor;
const tracker = uiMessages.sheet.templates.tracker;

const plural = (
    descriptor: { id: string; message: string },
    count: number,
    values: Record<string, string | number> = {}
) => selectPluralForm(translate(descriptor, { count, ...values }), count, 'en');

const MARKS = [
    { id: 'bashing', name: 'Bashing', symbol: '╱', fill: 'secondary' },
    { id: 'lethal', name: 'Lethal', symbol: '×', fill: 'error' },
];

function page(changed: boolean) {
    return CustomTemplateSchema.parse({
        id: 'tpl-save',
        name: 'Save',
        systemId: 'wod-2e',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'wounds',
                type: 'tracker',
                label: 'Wounds',
                marks: changed ? MARKS.slice(0, 1) : MARKS,
                levels: [{ id: 'hurt', name: 'Hurt', value: '-1' }],
                columns: [{ id: 'damage', kind: 'marks', title: 'Damage' }],
            },
            {
                id: 'notes',
                type: 'list',
                title: 'Notes',
                valueKey: 'notes',
                ...(changed ? { named: false } : {}),
            },
            changed
                ? {
                      id: 'gear',
                      type: 'table',
                      title: 'Gear',
                      valueKey: 'gear',
                      columns: [{ id: 'item', type: 'text', label: 'Item' }],
                  }
                : { id: 'gear', type: 'list', title: 'Gear', valueKey: 'gear' },
        ],
    });
}

const documents = [
    {
        systemId: 'wod-2e',
        kind: 'character',
        templateValues: {
            wounds: { tracker: 1, columns: { damage: [{ id: 'a', marks: { hurt: 'lethal' } }] } },
            notes: [{ id: 'n', label: 'Debt', value: 2 }],
            gear: [{ id: 'g', label: 'Sword', value: 1 }],
        },
    },
];

describe('save checks (spec 025, US4)', () => {
    it('lists every effect in today’s order, titled by the first', () => {
        const effects = saveEffects(page(false), page(true), documents, plural);
        expect(effects.title).toBe(translate(editor.kindChangeTitle));
        expect(effects.lines).toEqual([
            translate(editor.kindChangeSaveWarning, {
                title: 'Gear',
                kind: translate(editor.kindTable),
            }),
            plural(editor.listChangeNames, 1, { title: 'Notes' }),
            translate(editor.listChangeNote),
            plural(tracker.changeMarks, 1, {
                title: 'Wounds',
                documents: plural(editor.listChangeSheets, 1),
            }),
            plural(tracker.changeCopies, 1, {
                title: 'Wounds',
                documents: plural(editor.listChangeSheets, 1),
            }),
            translate(tracker.changeNote),
        ]);
    });

    it('asks nothing when the save hides nothing', () => {
        expect(saveEffects(page(false), page(false), documents, plural)).toEqual({ lines: [] });
        expect(saveEffects(undefined, page(true), documents, plural)).toEqual({ lines: [] });
    });

    it('shows what an added check reports, with no other change', () => {
        const extra: SaveCheck = {
            id: 'test',
            title: editor.retargetTitle,
            lines: () => ['Something else stops showing.'],
        };
        const effects = saveEffects(page(false), page(false), documents, plural, [
            ...SAVE_CHECKS,
            extra,
        ]);
        expect(effects).toEqual({
            title: translate(editor.retargetTitle),
            lines: ['Something else stops showing.'],
        });
    });
});
