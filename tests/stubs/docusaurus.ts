type TranslateMessage = { id?: string; message?: string };

export function translate(message?: TranslateMessage) {
    return message?.message ?? message?.id ?? '';
}

export default function Translate() {
    return null;
}
