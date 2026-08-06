import { useEffect, useRef } from 'react';

export function AutoResizeTextarea({
    value,
    onChange,
    readOnly,
    placeholder,
    ariaLabel,
}: {
    value: string;
    onChange: (value: string) => void;
    readOnly: boolean;
    placeholder?: string;
    ariaLabel?: string;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = Math.max(el.scrollHeight, 80) + 'px';
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            className="w-full bg-bgSurface border rounded px-3 py-2 text-sm text-textPrimary disabled:opacity-60 disabled:cursor-default resize-none overflow-hidden min-h-[80px]"
            placeholder={placeholder}
            aria-label={ariaLabel ?? placeholder ?? 'Text'}
        />
    );
}
