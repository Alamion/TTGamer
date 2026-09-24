import { registerRollReader } from '@site/src/dice_roller/utils/rollReader';
import { systemRegistry } from '@site/src/sheet_manager/systems';

import { createRollReader } from './index';

export function registerSystemsReader(): () => void {
    return registerRollReader(createRollReader(systemRegistry));
}
