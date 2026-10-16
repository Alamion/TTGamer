import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { FormulaEvaluationError } from './formula';

const page = uiMessages.sheet.templates.page;

/** Why a formula or a computed limit has no value, in the reader's words. */
export function formulaErrorMessage(
    reason: FormulaEvaluationError | 'parse',
    coordinate = ''
): string {
    switch (reason) {
        case 'circular':
            return translate(page.formulaReasonCircular);
        case 'division-by-zero':
            return translate(page.formulaReasonDivision);
        case 'non-numeric':
            return translate(page.formulaReasonNonNumeric);
        case 'parse':
            return translate(page.formulaReasonInvalid);
        case 'unknown-coordinate':
        default:
            return translate(page.formulaReasonUnknown).replace('{coordinate}', coordinate);
    }
}
