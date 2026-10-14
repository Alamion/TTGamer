import { type KeyboardEvent, useRef, useState } from 'react';

export interface InlineNameProps {
    initial: string;
    label: string;
    placeholder?: string;
    /** Enter or leaving the field. */
    onCommit: (name: string) => void;
    /** Escape. */
    onCancel: () => void;
}

const MAX_NAME = 200;

/** A name typed in place of a row's name (rename, a new folder). Leaving the field saves it. */
export function InlineName({ initial, label, placeholder, onCommit, onCancel }: InlineNameProps) {
    const [value, setValue] = useState(initial);
    const finished = useRef(false);
    const finish = (save: boolean) => {
        if (finished.current) return;
        finished.current = true;
        if (save) onCommit(value);
        else onCancel();
    };
    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        // The row's own keys (arrows, type-ahead, Delete) must not act while a name is typed.
        event.stopPropagation();
        if (event.key === 'Enter') {
            event.preventDefault();
            finish(true);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            finish(false);
        }
    };
    return (
        <input
            value={value}
            aria-label={label}
            placeholder={placeholder}
            maxLength={MAX_NAME}
            onChange={(event) => setValue(event.target.value)}
            onFocus={(event) => event.target.select()}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onKeyDown={onKeyDown}
            onBlur={() => finish(true)}
            // The row asked for a name; focus belongs in the field.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="min-w-0 flex-1 rounded-sm border border-primary bg-bgBase px-1 py-0.5 text-sm text-textPrimary outline-hidden"
        />
    );
}
