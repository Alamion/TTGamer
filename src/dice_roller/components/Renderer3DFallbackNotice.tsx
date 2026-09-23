import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { onRollResult } from '../dice-logic/dice-roller';
import type { RollResult } from '../dice-logic/types';

/**
 * Tells the user once per session when a 3D roll fell back to 2D because the renderer could
 * not be downloaded. The orchestrator only flags the result; the message lives here so
 * `dice-logic` keeps no UI dependency.
 */
export default function Renderer3DFallbackNotice() {
    useEffect(() => {
        let announced = false;
        return onRollResult((result: RollResult) => {
            if (!result.renderer3dUnavailable || announced) return;
            announced = true;
            toast.error(translate(uiMessages.dice.panel.renderer3dUnavailable));
        });
    }, []);

    return null;
}
