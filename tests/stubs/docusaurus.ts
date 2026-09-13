type TranslateMessage = { id?: string; message?: string };

export function translate(message?: TranslateMessage, values?: Record<string, string | number>) {
    const template = message?.message ?? message?.id ?? '';
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (match, key: string) =>
        key in values ? String(values[key]) : match
    );
}

export default function Translate() {
    return null;
}
