import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { V5DiceLine } from '../../ruleset/dice';

const messages = uiMessages.sheet.v5Hunter.dice;

/** Desperation dice: a 1 on any of them makes the hunter pay, success or not. */
export const desperationDiceLine: V5DiceLine = {
    id: 'desperation',
    label: messages.line,
    definitionIds: ['hunter'],
    outcomes: ({ specialFaces }) =>
        specialFaces.includes(1)
            ? [
                  {
                      id: 'desperation-one',
                      title: messages.desperationOne,
                      detail: messages.desperationOneDetail,
                      conditional: false,
                  },
              ]
            : [],
};
