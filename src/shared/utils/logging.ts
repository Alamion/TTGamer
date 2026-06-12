import toast from 'react-hot-toast';
import { onRollResult } from '@site/src/dice_roller/dice-logic';

const MODULE_NAME = 'TTGamer';

/** Subscribes to all successful rolls and logs them via `info()` in chat format. Returns an unsubscribe function. */
export function setupRollLogging(): () => void {
    return onRollResult((result) => {
        info(`\nRolls: ${result.details}\nFormatted: ${result.formatted}`, 'Dice Roll');
    });
}

export function debug(...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[${MODULE_NAME}]`, ...args);
    }
}

export function info(message: string, title?: string, consoleArgs?: unknown[]): void {
    console.log(`[${MODULE_NAME}]`, message, ...(consoleArgs || []));
    toast.success(`${title ? `[${title}] ` : ''}${message}`);
}

export function warn(message: string, title?: string, consoleArgs?: unknown[]): void {
    console.warn(`[${MODULE_NAME}]`, message, ...(consoleArgs || []));
    toast.error(`${title ? `[${title}] ` : ''}${message}`, { icon: '⚠️' });
}

export function error(message: string, title?: string, consoleArgs?: unknown[]): void {
    console.error(`[${MODULE_NAME}]`, message, ...(consoleArgs || []));
    toast.error(`${title ? `[${title}] ` : ''}${message}`);
}
