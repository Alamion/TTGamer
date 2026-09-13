export function deserializeStringList(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
    }
    if (typeof value !== 'string' || value.length === 0) return [];

    try {
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed)) {
            return parsed.filter(
                (item): item is string => typeof item === 'string' && item.length > 0
            );
        }
    } catch {
        return value.split(',').filter(Boolean);
    }

    return [];
}

export function serializeStringList(values: string[]): string {
    return values.length > 0 ? JSON.stringify(values) : '';
}
