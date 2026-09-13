import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { useMemo, useState } from 'react';

export interface DocumentSearchOption {
    value: string;
    label: string;
    subtitle?: string;
}

interface DocumentSearchProps {
    options: readonly DocumentSearchOption[];
    onSelect: (value: string) => void;
    ariaLabel: string;
    placeholder: string;
    noMatches: string;
    /** Most matches shown at once; the full list is never rendered. */
    limit?: number;
    disabled?: boolean;
}

/**
 * Search-first picker for large option sets (e.g. a campaign's documents): nothing is listed
 * until the reader types, and only the first few matches appear.
 */
export function DocumentSearch({
    ariaLabel,
    disabled,
    limit = 8,
    noMatches,
    onSelect,
    options,
    placeholder,
}: DocumentSearchProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const trimmed = query.trim().toLowerCase();

    const matches = useMemo(() => {
        if (!trimmed) return [];
        const found: DocumentSearchOption[] = [];
        for (const option of options) {
            if (option.label.toLowerCase().includes(trimmed)) found.push(option);
            if (found.length >= limit) break;
        }
        return found;
    }, [limit, options, trimmed]);

    const choose = (value: string) => {
        onSelect(value);
        setQuery('');
        setOpen(false);
    };

    return (
        <Popover.Root open={open && trimmed.length > 0} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <input
                    type="search"
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && matches[0]) {
                            event.preventDefault();
                            choose(matches[0].value);
                        }
                        if (event.key === 'Escape') setOpen(false);
                    }}
                    disabled={disabled}
                    placeholder={placeholder}
                    aria-label={ariaLabel}
                    className="w-full rounded border border-border bg-bgSurface px-2 py-2 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
            </Popover.Trigger>
            <Popover.Content
                className="z-50 w-[var(--radix-popover-trigger-width)] rounded-lg border border-border bg-bgSurface p-0 shadow-xl"
                sideOffset={4}
                align="start"
                onOpenAutoFocus={(event) => event.preventDefault()}
            >
                <Command shouldFilter={false} label={ariaLabel}>
                    <Command.List>
                        {matches.length === 0 && (
                            <div className="px-3 py-2 text-sm text-textSecondary">{noMatches}</div>
                        )}
                        {matches.map((option) => (
                            <Command.Item
                                key={option.value}
                                value={option.value}
                                onSelect={() => choose(option.value)}
                                className="flex cursor-pointer flex-col items-start border-b border-border px-3 py-2 text-sm text-textPrimary last:border-b-0 aria-selected:bg-bgBase"
                            >
                                <span>{option.label}</span>
                                {option.subtitle && (
                                    <span className="text-xs text-textSecondary">
                                        {option.subtitle}
                                    </span>
                                )}
                            </Command.Item>
                        ))}
                    </Command.List>
                </Command>
            </Popover.Content>
        </Popover.Root>
    );
}
