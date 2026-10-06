import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { FormulaInputCheck } from '../../sheet/data/formulaCheck';

const editor = uiMessages.sheet.templates.editor;

export interface FormulaMessage {
    tone: 'error' | 'ok';
    text: string;
}

/** The sentence a formula check shows under its box and in the issue list (spec 022, R2). */
export function formulaCheckMessage(check: FormulaInputCheck): FormulaMessage | undefined {
    if (check.kind === 'empty') return undefined;
    if (check.kind === 'ok') {
        return check.reads.length > 0
            ? {
                  tone: 'ok',
                  text: translate(editor.formulaReads, { names: check.reads.join(', ') }),
              }
            : undefined;
    }
    return {
        tone: 'error',
        text:
            check.code === 'parse'
                ? translate(editor.formulaNoParse, { position: check.position })
                : translate(editor.formulaUnknown, { name: check.name }),
    };
}
