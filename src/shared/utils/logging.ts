import toast from 'react-hot-toast';
import { isDevelopment } from './env';

const MODULE_NAME = 'TTGamer';

export function debug(...args: unknown[]): void {
    if (isDevelopment()) {
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
