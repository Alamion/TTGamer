import { translate } from '@docusaurus/Translate';
import * as Popover from '@radix-ui/react-popover';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { matchesSearch } from '@site/src/shared/utils/normalizeSearchText';
import { Command } from 'cmdk';
import { useMemo, useRef, useState } from 'react';

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
    ariaLabel?: string;
    /** Offer every entry while the input is empty (short, closed suggestion lists). */
    showAllWhenEmpty?: boolean;
}

export function CatalogSuggest({
    catalog,
    value,
    onChange,
    onSelect,
    placeholder,
    disabled,
    className,
    ariaLabel,
    showAllWhenEmpty = false,
}: CatalogSuggestProps) {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        if (!value.trim()) return showAllWhenEmpty ? catalog : [];
        // Names are "Русское (English)" outside English, so either language matches.
        return catalog.filter((e) => matchesSearch(value, e.name, e.id));
    }, [catalog, showAllWhenEmpty, value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        setActiveIndex(0);
        if (!open) setOpen(true);
    };

    const handleSelect = (entry: CatalogEntry) => {
        onChange(entry.name);
        onSelect(entry);
        setOpen(false);
        setActiveIndex(0);
        inputRef.current?.blur();
    };

    /**
     * Focus stays on the trigger input, which is outside the portalled suggestion list, so the
     * list cannot receive these keys on its own. Owning the active index here keeps the picker
     * operable without a pointer and keeps the highlight in sync with what Enter will choose.
     */
    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Escape'].includes(e.key)) return;
        if (e.key === 'Escape') {
            setOpen(false);
            return;
        }
        if (filtered.length === 0) return;
        if (!open) {
            if (e.key === 'Enter') return;
            e.preventDefault();
            setOpen(true);
            return;
        }
        e.preventDefault();
        if (e.key === 'Enter') {
            const entry = filtered[Math.min(activeIndex, filtered.length - 1)];
            if (entry) handleSelect(entry);
            return;
        }
        setActiveIndex((current) => {
            if (e.key === 'Home') return 0;
            if (e.key === 'End') return filtered.length - 1;
            const next = e.key === 'ArrowDown' ? current + 1 : current - 1;
            return Math.max(0, Math.min(next, filtered.length - 1));
        });
    };

    return (
        <Popover.Root open={open && filtered.length > 0} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    onFocus={() => {
                        if ((value.trim() || showAllWhenEmpty) && filtered.length > 0)
                            setOpen(true);
                    }}
                    disabled={disabled}
                    placeholder={placeholder}
                    className={className}
                    aria-label={ariaLabel ?? placeholder}
                />
            </Popover.Trigger>
            <Popover.Content
                className="z-50 bg-bgSurface border border-border rounded-lg shadow-xl p-0 w-[var(--radix-popover-trigger-width)]"
                sideOffset={4}
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <Command
                    shouldFilter={false}
                    value={filtered[Math.min(activeIndex, filtered.length - 1)]?.id ?? ''}
                >
                    <Command.List>
                        <Command.Empty className="px-3 py-2 text-sm text-textSecondary">
                            {translate(uiMessages.sheet.controls.noMatches)}
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
