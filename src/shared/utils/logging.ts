import { isDevelopment } from './env';

const MODULE_NAME = 'TTGamer';

export function debug(...args: unknown[]): void {
    if (isDevelopment()) {
        console.log(`[${MODULE_NAME}]`, ...args);
    }
}

function prefix(title?: string) {
    return title ? `[${MODULE_NAME}:${title}]` : `[${MODULE_NAME}]`;
}

export function info(message: string, title?: string, consoleArgs?: unknown[]): void {
    console.log(prefix(title), message, ...(consoleArgs || []));
}

export function warn(message: string, title?: string, consoleArgs?: unknown[]): void {
    console.warn(prefix(title), message, ...(consoleArgs || []));
}

export function error(message: string, title?: string, consoleArgs?: unknown[]): void {
    console.error(prefix(title), message, ...(consoleArgs || []));
}
