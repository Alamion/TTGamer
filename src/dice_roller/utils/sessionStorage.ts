const STAT_LABELS_KEY = 'dice_roller_stat_labels';
const CHAR_NAME_KEY = 'dice_roller_character_name';

export function getStatLabels(): string[] {
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
