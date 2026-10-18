import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { Plus } from 'lucide-react';

import type { CatalogEntry } from '../controls/CatalogSuggest.tsx';
import { CatalogSuggest } from '../controls/CatalogSuggest.tsx';
import { fallbackRowName, RowMoveControls, rowMoveKeys } from '../controls/RowMoveControls';
import type { TermLink } from '../terms/termLink';
import { StatDot } from './StatDot.tsx';
import { StatLabel } from './StatLabel.tsx';

interface TraitRowProps {
    /** `number` shows a number field instead of dots (values past five, such as NPC pools). */
    presentation?: 'dots' | 'number';
    label: string;
    /** Book term of the label (spec 009). */
    term?: TermLink;
    value: number;
    maxValue?: number;
    onChange?: (
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => void;
    tooltip?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    minimal?: number;
    showFlags?: boolean;
    specialization?: boolean | null;
    experienced?: boolean | null;
    practiced?: boolean | null;
    onDiceRoll?: (
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => string | undefined;
    characterName?: string;
}

export function TraitRow({
    presentation,
    label,
    term,
    value,
    maxValue = 5,
    onChange,
    tooltip,
    disabled = false,
    size = 'md',
    className,
    minimal,
    showFlags = false,
    specialization = null,
    experienced = null,
    practiced = null,
    onDiceRoll,
    characterName,
}: TraitRowProps) {
    return (
        <div className={clsx('term-row flex items-end justify-between gap-2 py-1', className)}>
            <StatLabel label={label} tooltip={tooltip} term={term} />
            <StatDot
                presentation={presentation}
                value={value}
                maxValue={maxValue}
                onChange={onChange}
                disabled={disabled}
                size={size}
                minimal={minimal}
                showFlags={showFlags}
                specialization={specialization}
                experienced={experienced}
                practiced={practiced}
                onDiceRoll={onDiceRoll}
                statLabel={label}
                characterName={characterName}
            />
        </div>
    );
}

interface TraitRowWithInputProps {
    /** `number` shows a number field instead of dots (values past five, such as NPC pools). */
    presentation?: 'dots' | 'number';
    name: string;
    /** Book term of the label (spec 009). */
    term?: TermLink;
    specializationText?: string;
    value: number;
    maxValue?: number;
    onChange?: (
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => void;
    onSpecializationTextChange?: (specializationText: string) => void;
    tooltip?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    minimal?: number;
    showFlags?: boolean;
    specialization?: boolean | null;
    experienced?: boolean | null;
    practiced?: boolean | null;
    onDiceRoll?: (
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => string | undefined;
    characterName?: string;
}

export function TraitRowWithInput({
    presentation,
    name,
    term,
    specializationText = '',
    value,
    maxValue = 5,
    onChange,
    onSpecializationTextChange,
    tooltip,
    disabled = false,
    size = 'md',
    className,
    minimal,
    showFlags = false,
    specialization = null,
    experienced = null,
    practiced = null,
    onDiceRoll,
    characterName,
}: TraitRowWithInputProps) {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSpecializationTextChange?.(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    return (
        // The outer div is the size container; the inner row wraps the specialization input
        // onto its own line when the row is too narrow for label, input, and dots together.
        <div className={clsx('term-row term-row-specialty py-1.5', className)}>
            <div className="term-row-inner flex items-end gap-2">
                <StatLabel label={name} tooltip={tooltip} term={term} />
                <input
                    type="text"
                    value={specializationText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    className={clsx(
                        'w-0 flex-1 bg-transparent border-b px-2 text-sm text-textPrimary transition-colors min-w-[8ch]',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                />
                <StatDot
                    presentation={presentation}
                    value={value}
                    maxValue={maxValue}
                    onChange={onChange}
                    disabled={disabled}
                    size={size}
                    minimal={minimal}
                    showFlags={showFlags}
                    specialization={specialization}
                    experienced={experienced}
                    practiced={practiced}
                    onDiceRoll={onDiceRoll}
                    statLabel={name}
                    characterName={characterName}
                />
            </div>
        </div>
    );
}

interface CustomTraitListProps {
    /** `number` shows a number field instead of dots (values past five, such as NPC pools). */
    presentation?: 'dots' | 'number';
    items: Array<{
        id: string;
        label: string;
        value: number;
        specialization?: boolean;
        experienced?: boolean;
        practiced?: boolean;
    }>;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onChange: (
        id: string,
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => void;
    onLabelChange: (id: string, value: number, label: string) => void;
    maxValue?: number;
    placeholder?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showFlags?: boolean;
    onDiceRoll?: (
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => string | undefined;
    catalog?: CatalogEntry[];
    onCatalogSelect?: (id: string, entry: CatalogEntry) => void;
    characterName?: string;
    /** Row layout for the list, 1–4 (feature 006 FR-17); default stacks rows. */
    columns?: 1 | 2 | 3 | 4;
    /** Moves the row at `from` to `to` (spec 022); without it the rows have no order controls. */
    onMove?: (from: number, to: number) => void;
    /** Brief look: tight rows without order controls (the full sheet keeps them). */
    compact?: boolean;
}

const traitListColumns = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
};

export function CustomTraitList({
    presentation,
    items,
    onAdd,
    onRemove,
    onChange,
    onLabelChange,
    maxValue = 5,
    placeholder = 'Custom skill',
    disabled = false,
    size = 'md',
    showFlags = false,
    onDiceRoll,
    catalog,
    onCatalogSelect,
    characterName,
    columns = 1,
    onMove,
    compact = false,
}: CustomTraitListProps) {
    const movable = onMove !== undefined && !compact && !disabled && items.length > 1;
    const nameClasses = clsx(
        'flex-1 bg-transparent border-b px-2 text-sm text-textPrimary transition-colors',
        compact ? 'min-w-0 py-0' : 'py-0.5'
    );
    return (
        <div
            data-reorder-list=""
            className={clsx(
                'gap-x-4 gap-y-1',
                columns > 1 ? `grid ${traitListColumns[columns]}` : 'grid grid-cols-1'
            )}
        >
            {items.map((item, index) => (
                // Alt+↑/↓ from the row's own controls bubble here (spec 022).
                // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                <div
                    key={item.id}
                    data-reorder-row=""
                    onKeyDown={
                        movable
                            ? rowMoveKeys(index, items.length, (to) => onMove(index, to))
                            : undefined
                    }
                    className={clsx(
                        'flex gap-2 [&[data-reorder-target]]:shadow-[0_-2px_0_0_rgb(var(--primary))]',
                        compact ? 'items-center py-0' : 'items-end py-1'
                    )}
                >
                    {movable && (
                        <RowMoveControls
                            count={items.length}
                            index={index}
                            name={item.label || fallbackRowName(index)}
                            onMove={(to) => onMove(index, to)}
                        />
                    )}
                    {catalog && onCatalogSelect ? (
                        <CatalogSuggest
                            catalog={catalog}
                            value={item.label}
                            onChange={(label) => onLabelChange(item.id, item.value, label)}
                            onSelect={(entry) => onCatalogSelect(item.id, entry)}
                            placeholder={placeholder}
                            disabled={disabled}
                            className={nameClasses}
                        />
                    ) : (
                        <input
                            type="text"
                            value={item.label}
                            onChange={(e) => onLabelChange(item.id, item.value, e.target.value)}
                            disabled={disabled}
                            className={nameClasses}
                            placeholder={placeholder}
                        />
                    )}
                    <StatDot
                        presentation={presentation}
                        value={item.value}
                        maxValue={maxValue}
                        onChange={(val, spec, exp, prc) => onChange(item.id, val, spec, exp, prc)}
                        disabled={disabled}
                        size={compact ? 'sm' : size}
                        showFlags={showFlags}
                        specialization={item.specialization}
                        experienced={item.experienced}
                        practiced={item.practiced}
                        onRemove={() => onRemove(item.id)}
                        onDiceRoll={
                            onDiceRoll
                                ? (val, spec, exp, prc) => onDiceRoll(val, spec, exp, prc)
                                : undefined
                        }
                        statLabel={item.label}
                        characterName={characterName}
                    />
                </div>
            ))}
            <button
                type="button"
                onClick={onAdd}
                disabled={disabled}
                className={clsx(
                    'flex items-center gap-1 text-sm text-textPrimary hover:text-textPrimary/80 transition-colors',
                    compact ? 'py-0.5' : 'py-1'
                )}
            >
                <Plus className="w-4 h-4" />
                {translate(uiMessages.sheet.controls.add)}
            </button>
        </div>
    );
}
