import { createElement, Fragment, type ReactNode } from 'react';

import { testMessage } from './testLocale';

type TranslateMessage = { id?: string; message?: string };

export function translate(message?: TranslateMessage, values?: Record<string, string | number>) {
    const template = testMessage(message?.id) ?? message?.message ?? message?.id ?? '';
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (match, key: string) =>
        key in values ? String(values[key]) : match
    );
}

/** Renders the message of `id` in the active test locale (English: the id's fallback). */
export default function Translate({
    id,
    children,
    values,
}: {
    id?: string;
    children?: ReactNode;
    values?: Record<string, string | number>;
}) {
    const fallback = typeof children === 'string' ? children : undefined;
    const text = testMessage(id) ?? fallback;
    return text === undefined
        ? null
        : createElement(Fragment, null, translate({ id, message: text }, values));
}
