import { clsx } from 'clsx';
import { ChevronDown, ChevronUp, Dices } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { rollDices } from '../dice-logic/dice-roller';
import type { RollResult } from '../dice-logic/types';
import { stripForcedValues } from '../utils/notation-clean';

interface InlineRollProps {
    notation: string;
    variant?: 'simple' | 'details' | 'formatted' | 'full';
    multiline?: boolean;
    showForced?: boolean;
    preroll?: boolean;
    animationTime?: number;
}

function resultText(
    result: RollResult,
    variant: 'simple' | 'details' | 'formatted' | 'full'
): string {
    switch (variant) {
        case 'simple':
            return ` = ${result.total}`;
        case 'details':
            return ` = ${result.details} = ${result.total}`;
        case 'formatted':
            return ` = ${result.formatted} = ${result.total}`;
        case 'full':
            return ` = ${result.details} = ${result.formatted} = ${result.total}`;
    }
}

function resultTitle(
    result: RollResult,
    variant: 'simple' | 'details' | 'formatted' | 'full'
): string | undefined {
    switch (variant) {
        case 'simple':
            return result.formatted;
        case 'details':
            return result.formatted;
        case 'formatted':
            return result.details;
        case 'full':
            return undefined;
    }
}

export function InlineRoll({ notation, preroll = false, ...props }: InlineRollProps) {
    return (
        <InlineRollState
            key={`${notation}\u0000${preroll ? 'preroll' : 'idle'}`}
            notation={notation}
            preroll={preroll}
            {...props}
        />
    );
}

function InlineRollState({
    notation: rawNotation,
    variant: rawVariant,
    multiline = false,
    showForced = false,
    preroll = false,
    animationTime = 400,
}: InlineRollProps) {
    const variant = rawVariant ?? (multiline ? 'full' : 'simple');
    const displayNotation = showForced ? rawNotation : stripForcedValues(rawNotation);

    const [result, setResult] = useState<RollResult | null>(() =>
        preroll ? rollDices(rawNotation) : null
    );
    const [expanded, setExpanded] = useState(false);
    const [rolling, setRolling] = useState<'idle' | 'out' | 'in'>('idle');
    const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

    const clearTimers = useCallback(() => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    }, []);

    const schedule = useCallback((callback: () => void, delay: number) => {
        const timer = setTimeout(() => {
            timersRef.current = timersRef.current.filter((entry) => entry !== timer);
            callback();
        }, delay);
        timersRef.current.push(timer);
    }, []);

    useEffect(() => clearTimers, [clearTimers]);

    const doRoll = useCallback(() => {
        setResult(rollDices(rawNotation));
    }, [rawNotation]);

    const handleRoll = useCallback(() => {
        if (rolling !== 'idle') return;

        if (result === null) {
            doRoll();
            setRolling('in');
            schedule(() => setRolling('idle'), animationTime);
        } else {
            setRolling('out');
            schedule(() => {
                doRoll();
                setRolling('in');
                schedule(() => setRolling('idle'), animationTime);
            }, animationTime);
        }
    }, [doRoll, rolling, result, animationTime, schedule]);

    const toggleExpand = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded((prev) => !prev);
    }, []);

    const isCollapsible = multiline && variant !== 'simple';
    const isExpanded = isCollapsible && expanded;

    const displayText = result
        ? isCollapsible
            ? ` = ${result.total}`
            : resultText(result, variant)
        : '';

    const resultEl = (
        <span
            style={{
                transition: `opacity ${animationTime}ms ease-in-out`,
                opacity: result ? (rolling === 'out' ? 0 : 1) : 0,
            }}
            className="font-semibold"
            aria-live="polite"
            title={result && !isCollapsible ? resultTitle(result, variant) : undefined}
        >
            {displayText}
        </span>
    );

    const chevronEl =
        isCollapsible && result ? (
            <button
                type="button"
                onClick={toggleExpand}
                className="inline-flex items-center bg-transparent border-none p-0 opacity-50 hover:opacity-100 self-center"
                aria-label={expanded ? 'Collapse roll details' : 'Expand roll details'}
                aria-expanded={expanded}
            >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
        ) : null;

    const expandedContent =
        isExpanded && result ? (
            <span className="text-xs opacity-80 leading-relaxed pt-0.5">
                {(variant === 'details' || variant === 'full') && <>Rolls: {result.details}</>}
                {variant === 'full' && <br />}
                {(variant === 'formatted' || variant === 'full') && (
                    <>Formatted: {result.formatted}</>
                )}
            </span>
        ) : null;

    const rowContent = (
        <span className="inline-flex items-baseline gap-1">
            <button
                type="button"
                onClick={handleRoll}
                className={clsx(
                    'inline-flex items-baseline gap-1 cursor-pointer bg-transparent p-0 text-inherit',
                    'border-0 border-b border-dashed border-current/30 hover:border-current/60'
                )}
            >
                <Dices size={14} className="inline opacity-40 flex-shrink-0 self-center" />
                <span>{displayNotation}</span>
                {resultEl}
            </button>
            {chevronEl}
        </span>
    );

    return (
        <>
            {isExpanded ? (
                <span
                    className={clsx(
                        'inline-flex flex-col align-middle'
                        // "border border-dashed border-current/20 hover:border-current/40 rounded px-1"  // - dashed border
                    )}
                >
                    {rowContent}
                    {expandedContent}
                </span>
            ) : (
                rowContent
            )}
        </>
    );
}
