import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { Plus } from 'lucide-react';

import type { CatalogEntry } from '../controls/CatalogSuggest.tsx';
import { CatalogSuggest } from '../controls/CatalogSuggest.tsx';
import type { TermLink } from '../terms/termLink';
import { StatDot } from './StatDot.tsx';
import { StatLabel } from './StatLabel.tsx';

interface TraitRowProps {
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
}

const traitListColumns = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
};

export function CustomTraitList({
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
}: CustomTraitListProps) {
    return (
        <div
            className={clsx(
                'gap-x-4 gap-y-1',
                columns > 1 ? `grid ${traitListColumns[columns]}` : 'grid grid-cols-1'
            )}
        >
            {items.map((item) => (
                <div key={item.id} className="flex items-end gap-2 py-1">
                    {catalog && onCatalogSelect ? (
                        <CatalogSuggest
                            catalog={catalog}
                            value={item.label}
                            onChange={(label) => onLabelChange(item.id, item.value, label)}
                            onSelect={(entry) => onCatalogSelect(item.id, entry)}
                            placeholder={placeholder}
                            disabled={disabled}
                            className="flex-1 bg-transparent border-b px-2 py-0.5 text-sm text-textPrimary transition-colors"
                        />
                    ) : (
                        <input
                            type="text"
                            value={item.label}
                            onChange={(e) => onLabelChange(item.id, item.value, e.target.value)}
                            disabled={disabled}
                            className="flex-1 bg-transparent border-b px-2 py-0.5 text-sm text-textPrimary transition-colors"
                            placeholder={placeholder}
                        />
                    )}
                    <StatDot
                        value={item.value}
                        maxValue={maxValue}
                        onChange={(val, spec, exp, prc) => onChange(item.id, val, spec, exp, prc)}
                        disabled={disabled}
                        size={size}
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
                className="flex items-center gap-1 text-sm text-textPrimary hover:text-textPrimary/80 transition-colors py-1"
            >
                <Plus className="w-4 h-4" />
                {translate(uiMessages.sheet.controls.add)}
            </button>
        </div>
    );
}
