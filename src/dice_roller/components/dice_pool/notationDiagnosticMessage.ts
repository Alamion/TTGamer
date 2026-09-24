import { translate } from '@docusaurus/Translate';
import { type UiMessageDescriptor, uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { LimitName, NotationDiagnostic, NotationErrorKind } from '../../dice-logic';

const errors = uiMessages.dice.pool.notation.errors;

const KIND_MESSAGES: Record<NotationErrorKind, UiMessageDescriptor> = {
    'unknown-character': errors.unknownCharacter,
    'unexpected-token': errors.unexpectedToken,
    'unexpected-end': errors.unexpectedEnd,
    'missing-compare-value': errors.missingCompareValue,
    'unclosed-group': errors.unclosedGroup,
    'trailing-input': errors.trailingInput,
    'label-position': errors.labelPosition,
    'set-bonus-needs-target': errors.setBonusNeedsTarget,
    'invalid-set-size': errors.invalidSetSize,
    'forced-values-count': errors.forcedValuesCount,
    'limit-exceeded': errors.limitExceeded,
};

const EXPECTED_MESSAGES: Record<string, UiMessageDescriptor> = {
    number: errors.expected.number,
    dice: errors.expected.dice,
    '(': errors.expected.open,
    ')': errors.expected.close,
    compare: errors.expected.compare,
};

const LIMIT_MESSAGES: Record<LimitName, UiMessageDescriptor> = {
    'notation-length': errors.limits.notationLength,
    'ast-nodes': errors.limits.astNodes,
    'numeric-literal': errors.limits.numericLiteral,
    'dice-count': errors.limits.diceCount,
    'dice-sides': errors.limits.diceSides,
    'custom-faces': errors.limits.customFaces,
};

/** The translated, user-facing explanation of a notation diagnostic. */
export function notationDiagnosticMessage(diagnostic: NotationDiagnostic): string {
    const expected = (diagnostic.expected ?? [])
        .map((token) => (EXPECTED_MESSAGES[token] ? translate(EXPECTED_MESSAGES[token]) : token))
        .join(translate(errors.expected.or));
    return translate(KIND_MESSAGES[diagnostic.kind], {
        found: diagnostic.found ?? '',
        expected,
        max: diagnostic.limit?.max ?? '',
        limit: diagnostic.limit ? translate(LIMIT_MESSAGES[diagnostic.limit.name]) : '',
    });
}
