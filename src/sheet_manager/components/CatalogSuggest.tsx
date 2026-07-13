import { useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';

export interface CatalogEntry {
    id: string;
    name: string;
    subtitle?: string;
}

interface CatalogSuggestProps {
    catalog: CatalogEntry[];
    value: string;
    onChange: (value: string) => void;
    onSelect: (entry: CatalogEntry) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function CatalogSuggest({
    catalog,
    value,
    onChange,
    onSelect,
    placeholder,
    disabled,
    className,
}: CatalogSuggestProps) {
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        if (!value.trim()) return [];
        const q = value.toLowerCase();
        return catalog.filter(
            (e) => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)
        );
    }, [catalog, value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        if (!open) setOpen(true);
    };

    const handleSelect = (entry: CatalogEntry) => {
        onChange(entry.name);
        onSelect(entry);
        setOpen(false);
        inputRef.current?.blur();
    };

    return (
        <Popover.Root open={open && filtered.length > 0} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (value.trim() && filtered.length > 0) setOpen(true);
                    }}
                    disabled={disabled}
                    placeholder={placeholder}
                    className={className}
                />
            </Popover.Trigger>
            <Popover.Content
                className="z-50 bg-bgSurface border border-border rounded-lg shadow-xl p-0 w-[var(--radix-popover-trigger-width)]"
                sideOffset={4}
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <Command shouldFilter={false}>
                    <Command.List>
                        <Command.Empty className="px-3 py-2 text-sm text-textSecondary">
                            No matches found
                        </Command.Empty>
                        {filtered.map((entry) => (
                            <Command.Item
                                key={entry.id}
                                value={entry.id}
                                onSelect={() => handleSelect(entry)}
                                className="px-3 py-2 text-sm text-textPrimary aria-selected:bg-bgBase cursor-pointer flex flex-col items-start border-b border-border last:border-b-0"
                            >
                                <span>{entry.name}</span>
                                {entry.subtitle && (
                                    <span className="text-xs text-textSecondary">
                                        {entry.subtitle}
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
