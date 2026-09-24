import type { RollSource } from './rollReader';

const STAT_LABELS_KEY = 'dice_roller_stat_labels';
const ROLL_SOURCE_KEY = 'dice_roller_roll_source';
const CHAR_NAME_KEY = 'dice_roller_character_name';

function getStatLabels(): string[] {
    try {
        return JSON.parse(sessionStorage.getItem(STAT_LABELS_KEY) || '[]');
    } catch (e) {
        console.warn('[sessionStorage] Failed to read stat labels:', e);
        return [];
    }
}

export function pushStatLabel(label: string): void {
    const stack = getStatLabels();
    stack.push(label);
    try {
        sessionStorage.setItem(STAT_LABELS_KEY, JSON.stringify(stack));
    } catch (e) {
        console.warn('[sessionStorage] Failed to push stat label:', e);
    }
}

export function takeStatLabels(): string[] {
    try {
        const raw = sessionStorage.getItem(STAT_LABELS_KEY);
        sessionStorage.removeItem(STAT_LABELS_KEY);
        return raw ? (JSON.parse(raw) as string[]) : [];
    } catch (e) {
        console.warn('[sessionStorage] Failed to take stat labels:', e);
        return [];
    }
}

export function clearStatLabels(): void {
    try {
        sessionStorage.removeItem(STAT_LABELS_KEY);
    } catch (e) {
        console.warn('[sessionStorage] Failed to clear stat labels:', e);
    }
}

export function getCharacterName(): string {
    try {
        return sessionStorage.getItem(CHAR_NAME_KEY) || '';
    } catch (e) {
        console.warn('[sessionStorage] Failed to get character name:', e);
        return '';
    }
}

export function setCharacterName(name: string): void {
    try {
        if (name) {
            sessionStorage.setItem(CHAR_NAME_KEY, name);
        } else {
            sessionStorage.removeItem(CHAR_NAME_KEY);
        }
    } catch (e) {
        console.warn('[sessionStorage] Failed to set character name:', e);
    }
}

export function clearCharacterName(): void {
    try {
        sessionStorage.removeItem(CHAR_NAME_KEY);
    } catch (e) {
        console.warn('[sessionStorage] Failed to clear character name:', e);
    }
}

/** The document of the last queued sheet stat; decides a no-tab roll's system reading. */
export function setRollSource(source: RollSource): void {
    try {
        sessionStorage.setItem(ROLL_SOURCE_KEY, JSON.stringify(source));
    } catch (e) {
        console.warn('[sessionStorage] Failed to set roll source:', e);
    }
}

export function getRollSource(): RollSource | undefined {
    try {
        const raw = sessionStorage.getItem(ROLL_SOURCE_KEY);
        if (!raw) return undefined;
        const parsed: unknown = JSON.parse(raw);
        if (
            parsed &&
            typeof parsed === 'object' &&
            typeof (parsed as RollSource).systemId === 'string' &&
            typeof (parsed as RollSource).definitionId === 'string'
        ) {
            const { systemId, definitionId } = parsed as RollSource;
            return { systemId, definitionId };
        }
        return undefined;
    } catch (e) {
        console.warn('[sessionStorage] Failed to read roll source:', e);
        return undefined;
    }
}

export function clearRollSource(): void {
    try {
        sessionStorage.removeItem(ROLL_SOURCE_KEY);
    } catch (e) {
        console.warn('[sessionStorage] Failed to clear roll source:', e);
    }
}
