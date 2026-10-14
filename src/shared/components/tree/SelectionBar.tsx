import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface SelectionBarProps {
    /** "3 items selected". */
    text: string;
    cancelLabel: string;
    onCancel: () => void;
    /** What can be done with the rows: icon buttons with their own labels. */
    actions?: ReactNode;
}

/** Shown above a tree while a finger-started selection is on: how many, and the way out. */
export function SelectionBar({ text, cancelLabel, onCancel, actions }: SelectionBarProps) {
    return (
        <div className="flex items-center gap-2 border-b border-primary/40 bg-primary/10 px-2 py-1.5 text-sm text-textPrimary">
            <button
                type="button"
                onClick={onCancel}
                aria-label={cancelLabel}
                title={cancelLabel}
                className="inline-flex shrink-0 items-center justify-center rounded-sm p-2 text-textPrimary hover:bg-primary/20"
            >
                <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <span role="status" className="min-w-0 flex-1 truncate">
                {text}
            </span>
            {actions}
        </div>
    );
}
