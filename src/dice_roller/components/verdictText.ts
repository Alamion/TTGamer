import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { RollVerdict } from '../utils/rollReader';

export function verdictText({ difficulty, succeeded, margin }: RollVerdict): string {
    return succeeded
        ? translate(uiMessages.dice.history.verdict.success, { difficulty, margin })
        : translate(uiMessages.dice.history.verdict.failure, { difficulty, shortfall: -margin });
}
